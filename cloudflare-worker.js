const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Llama 3.3 was retired for Groq free/developer projects on August 16, 2026.
// Keep the current recommended replacement first and a smaller production
// fallback second. GROQ_MODEL may override this with a comma-separated list.
const DEFAULT_GROQ_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];
const SUMMARY_CACHE_SECONDS = 86400;
const MAX_BODY_BYTES = 30000;
const DEFAULT_ALLOWED_ORIGINS = [
  "https://pfasestimator.org",
  "https://www.pfasestimator.org",
  "http://localhost:8000",
  "http://127.0.0.1:8000"
];
const ALLOWED_COMPOUNDS = new Set([
  "PFOA", "PFOS", "PFNA", "PFHxS", "PFHpA", "PFDA",
  "PFBA", "PFPeA", "PFBS", "6:2 FTS", "HFPO-DA", "Lithium"
]);
const ALLOWED_COUNTERS = new Set(["searches"]);
const APPROVED_CHAT_EVIDENCE = `Use only this evidence for general health and filter explanations:
- EPA says many PFAS break down slowly and can build up in people and the environment. Research links sufficient exposure to certain PFAS with immune, developmental, reproductive, hormonal, cholesterol, liver, and some cancer outcomes. Research is still developing, and a water-system result cannot establish a person's dose, duration of exposure, or health outcome.
- ATSDR says the chance of a health effect depends on dose, frequency, route, duration, individual sensitivity, and other health factors. Its epidemiologic summary reports associations for specific PFAS, including cholesterol changes, reduced vaccine response, liver-enzyme changes, pregnancy-related high blood pressure, small birth-weight decreases, and kidney or testicular cancer for PFOA.
- EPA says a home filter may help reduce PFAS after a person confirms what is in their water. A buyer should verify an exact PFAS-reduction claim under NSF/ANSI 53 or NSF/ANSI 58, confirm the model in an accredited directory, and replace it on schedule. Current certifications do not necessarily show reduction to every 2024 federal limit.
- Do not recommend a brand or claim that a filter eliminates all PFAS.
Approved source labels: EPA PFAS health guidance; ATSDR PFAS health guidance; EPA home-filter guidance; NSF certification guidance.`;

// This is a best-effort burst guard for deployments without a Cloudflare
// Rate Limiting binding. Bind AI_RATE_LIMITER for durable per-IP enforcement.
const localBursts = new Map();

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      if (!cors) return jsonResponse({ error: "Origin not allowed." }, 403);
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405, cors);
    }
    if (!cors) {
      return jsonResponse({ error: "Origin not allowed." }, 403);
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return jsonResponse({ error: "Request is too large." }, 413, cors);
    }

    let body;
    try {
      body = JSON.parse(raw);
    } catch (error) {
      return jsonResponse({ error: "Invalid JSON." }, 400, cors);
    }

    try {
      if (body.action === "counter") {
        const payload = sanitizeCounterRequest(body);
        if (payload.operation === "increment" && !(await allowRequest(request, env, "counter"))) {
          return jsonResponse({ error: "Too many counter requests. Please try again shortly." }, 429, cors);
        }
        const count = await handleCounter(env, payload);
        return jsonResponse({ count }, 200, cors, { "Cache-Control": "no-store" });
      }

      if (!env.GROQ_API_KEY) {
        return jsonResponse({ error: "AI service is not configured." }, 503, cors);
      }

      if (body.action === "summary") {
        const payload = sanitizeSummaryRequest(body);
        const cacheId = await summaryCacheId(payload);
        const cacheUrl = new URL(request.url);
        cacheUrl.pathname = `/__pfas_summary_cache/${cacheId}`;
        cacheUrl.search = "";
        const cacheRequest = new Request(cacheUrl.toString(), { method: "GET" });
        const cached = await caches.default.match(cacheRequest);
        if (cached) {
          const cachedData = await cached.json();
          return jsonResponse(cachedData, 200, cors, { "X-PFAS-Cache": "HIT" });
        }

        if (!(await allowRequest(request, env, "summary"))) {
          return jsonResponse({ error: "Too many AI requests. Please try again shortly." }, 429, cors);
        }

        const content = normalizeSummaryContent(await createSummary(env, payload), payload.compounds);
        const responseData = { content };
        const cacheResponse = jsonResponse(responseData, 200, null, {
          "Cache-Control": `public, max-age=${SUMMARY_CACHE_SECONDS}`
        });
        ctx.waitUntil(caches.default.put(cacheRequest, cacheResponse));
        return jsonResponse(responseData, 200, cors, { "X-PFAS-Cache": "MISS" });
      }

      if (body.action === "chat") {
        const payload = sanitizeChatRequest(body);
        if (!(await allowRequest(request, env, "chat"))) {
          return jsonResponse({ error: "Too many AI requests. Please try again shortly." }, 429, cors);
        }
        const content = await createChatReply(env, payload);
        return jsonResponse({ content }, 200, cors);
      }

      return jsonResponse({ error: "Unsupported action." }, 400, cors);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      const message = body.action === "counter"
        ? (status >= 500 ? "The counter service is temporarily unavailable." : error.message)
        : (status >= 500 ? "The health assistant is temporarily unavailable." : error.message);
      return jsonResponse({ error: message }, status, cors);
    }
  }
};

function sanitizeCounterRequest(body) {
  const counter = String(body.counter || "");
  if (!ALLOWED_COUNTERS.has(counter)) {
    throw clientError("Unknown counter.");
  }
  return {
    counter,
    operation: body.operation === "increment" ? "increment" : "get"
  };
}

async function handleCounter(env, payload) {
  if (!env.COUNTERS_DB) {
    const error = new Error("Counter storage is not configured.");
    error.status = 503;
    throw error;
  }

  await env.COUNTERS_DB.prepare(
    "CREATE TABLE IF NOT EXISTS counters (name TEXT PRIMARY KEY, value INTEGER NOT NULL DEFAULT 0 CHECK (value >= 0))"
  ).run();

  if (payload.operation === "increment") {
    const row = await env.COUNTERS_DB.prepare(
      "INSERT INTO counters (name, value) VALUES (?1, 1) " +
      "ON CONFLICT(name) DO UPDATE SET value = value + 1 RETURNING value"
    ).bind(payload.counter).first();
    return Number(row?.value || 0);
  }

  const row = await env.COUNTERS_DB.prepare(
    "SELECT value FROM counters WHERE name = ?1"
  ).bind(payload.counter).first();
  return Number(row?.value || 0);
}

function corsHeaders(origin, env) {
  if (!origin) return null;
  const configured = String(env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const allowed = configured.length ? configured : DEFAULT_ALLOWED_ORIGINS;
  if (!allowed.includes(origin)) return null;
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status = 200, cors = null, extraHeaders = {}) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    ...extraHeaders
  });
  if (cors) {
    Object.entries(cors).forEach(([name, value]) => headers.set(name, value));
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function allowRequest(request, env, action) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  if (env.AI_RATE_LIMITER) {
    const { success } = await env.AI_RATE_LIMITER.limit({ key: `${action}:${ip}` });
    return success;
  }

  const now = Date.now();
  const key = `${action}:${ip}`;
  const current = localBursts.get(key);
  if (!current || now >= current.resetAt) {
    localBursts.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  current.count += 1;
  if (localBursts.size > 1000) {
    for (const [entryKey, entry] of localBursts) {
      if (now >= entry.resetAt) localBursts.delete(entryKey);
    }
  }
  return current.count <= 12;
}

function sanitizeSummaryRequest(body) {
  if (!/^\d{5}$/.test(String(body.zip || ""))) {
    throw clientError("A valid ZIP code is required.");
  }
  const language = body.language === "zh" ? "zh" : "en";
  if (!Array.isArray(body.compounds) || body.compounds.length < 1 || body.compounds.length > 12) {
    throw clientError("Invalid compound results.");
  }
  const compounds = body.compounds.map(item => {
    const compound = cleanString(item.compound, 30);
    if (!ALLOWED_COMPOUNDS.has(compound)) throw clientError("Unknown compound.");
    const level = Number(item.level);
    if (!Number.isFinite(level) || level < 0 || level > 10000) throw clientError("Invalid detected level.");
    const limit = item.epa_limit == null ? null : Number(item.epa_limit);
    if (limit !== null && (!Number.isFinite(limit) || limit <= 0)) throw clientError("Invalid EPA limit.");
    return {
      compound,
      full: cleanString(item.full || compound, 160),
      level,
      epa_limit: limit,
      health_effects: cleanString(item.health_effects, 1400),
      clinical_threshold: cleanString(item.clinical_threshold, 700)
    };
  });
  return { action: "summary", zip: String(body.zip), language, compounds };
}

function sanitizeChatRequest(body) {
  const language = body.language === "zh" ? "zh" : "en";
  const zipContext = cleanString(body.zip_context, 14000);
  if (!Array.isArray(body.messages) || body.messages.length < 1) {
    throw clientError("A chat message is required.");
  }
  const messages = body.messages.slice(-6).map(message => {
    const role = message.role === "assistant" ? "assistant" : "user";
    return { role, content: cleanString(message.content, 700) };
  }).filter(message => message.content);
  if (!messages.length || messages.at(-1).role !== "user") {
    throw clientError("A user question is required.");
  }
  return { action: "chat", language, zip_context: zipContext, messages };
}

function cleanString(value, maxLength) {
  return String(value || "").replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, maxLength);
}

function normalizeSummaryContent(content, compounds) {
  const withoutFence = String(content).replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  let parsed;
  try {
    if (start < 0 || end <= start) throw new Error("Missing JSON object.");
    parsed = JSON.parse(withoutFence.slice(start, end + 1));
  } catch (error) {
    const invalidError = new Error("The AI summary was not valid JSON.");
    invalidError.status = 502;
    throw invalidError;
  }

  if (typeof parsed.header !== "string" || !parsed.header.trim() || !Array.isArray(parsed.summaries)) {
    const incompleteError = new Error("The AI summary was incomplete.");
    incompleteError.status = 502;
    throw incompleteError;
  }
  const received = new Map();
  parsed.summaries.forEach(item => {
    if (typeof item?.compound === "string" && typeof item?.text === "string" && item.text.trim()) {
      received.set(item.compound, item.text.trim());
    }
  });
  const summaries = compounds.map(item => {
    const text = received.get(item.compound);
    if (!text) {
      const missingError = new Error("The AI summary omitted a compound.");
      missingError.status = 502;
      throw missingError;
    }
    return { compound: item.compound, text };
  });
  return JSON.stringify({ header: parsed.header.trim(), summaries });
}

function clientError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

async function summaryCacheId(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

async function createSummary(env, payload) {
  const isZh = payload.language === "zh";
  const languageRule = isZh
    ? "Write every value entirely in Simplified Chinese (简体中文)."
    : "Write every value in plain, caring English.";
  const results = payload.compounds.map((item, index) => {
    const limitMeaning = item.epa_limit
      ? `${((item.level / item.epa_limit) * 100).toFixed(0)}% of the EPA limit (${item.level >= item.epa_limit ? "ABOVE" : "below"})`
      : "no individual federal limit has been set";
    return `RESULT ${index + 1}\nCompound: ${item.compound} (${item.full})\nDetected: ${item.level} µg/L; ${limitMeaning}\nResearch: ${item.health_effects}\nThreshold context: ${item.clinical_threshold || "No individual federal threshold."}`;
  }).join("\n\n");

  const prompt = `${languageRule}
A person looked up ZIP code ${payload.zip}. Use the supplied tap-water results and research to create the same patient-friendly interpretation a careful doctor would give.

Return ONLY valid JSON in this exact structure:
{"header":"two sentences","summaries":[{"compound":"compound code","text":"two or three sentences"}]}

Header rules:
- Sentence 1 states how many compounds were found and whether any exceed EPA limits.
- Sentence 2 names the single most clinically relevant health concern and who is most at risk.

Each compound summary must answer: "Should I be concerned at this specific level?"
- Lead with whether the specific concentration is a real concern relative to its EPA limit, or clearly state that no individual federal limit exists.
- Name the most relevant health effect in everyday language and identify who is most vulnerable when the evidence supports it.
- Do not recommend filters, next steps, doctors, or other actions; those appear elsewhere on the page.
- Be honest, specific, and calm. Do not invent evidence or imply that detection diagnoses disease.
- Include every compound exactly once and preserve the supplied compound code.
- No citations, markdown, or text outside the JSON.

${results}`;

  const maxTokens = Math.min(900, 220 + payload.compounds.length * 85);
  return callGroq(env, [{ role: "user", content: prompt }], maxTokens);
}

async function createChatReply(env, payload) {
  const isZh = payload.language === "zh";
  const hasZipContext = Boolean(payload.zip_context);
  const contextBlock = hasZipContext
    ? payload.zip_context
    : "The user has not searched a ZIP code yet. Answer general PFAS, drinking-water, and environmental-health questions without implying that you know their utility, household water, exposure, or health status. If system-specific context would help, briefly invite them to use the lookup.";
  const redirect = isZh
    ? (hasZipContext
      ? "这超出了我能回答的范围，但我可以解释页面上显示的公共供水系统结果、PFAS研究以及可核实的后续步骤。"
      : "这超出了我能回答的范围，但我很乐意回答有关PFAS、水质和环境健康的问题。")
    : (hasZipContext
      ? "That is outside what I can help with here, but I can explain the public-water-system results displayed on the page, PFAS research, and verifiable next steps."
      : "That is outside what I can help with here, but I'm happy to answer questions about PFAS, water quality, and environmental health.");

  const systemPrompt = `${isZh ? "Respond entirely in Simplified Chinese (简体中文). " : ""}You are the optional explanatory assistant for PFAS Estimator, a community water-information resource. The ZIP lookup and all numerical classifications are fixed and do not use AI. Explain the supplied results without changing, recomputing, or extending them.

${contextBlock}

${APPROVED_CHAT_EVIDENCE}

Guidelines:
- Only answer questions related to PFAS, public water systems, water quality, environmental health, or adjacent medical topics.
- If asked about anything unrelated, politely redirect: "${redirect}"
- Treat a ZIP match only as a potentially relevant public-water-system association. Never say or imply that a listed system serves the user's household.
- Describe a displayed value as the highest EPA-derived annual average shown among that water system's sampling locations. Never call it a system-wide average or household-tap measurement.
- Describe comparison flags only as EPA technical comparisons. Never call them violations, compliance findings, safe/unsafe determinations, exposure estimates, or personal risk scores.
- Use only the supplied context for system names, measurements, counts, and comparison status. If a requested fact is absent, say that it is not shown.
- When asked which or how many systems met a comparison, repeat every name and the exact count from the supplied comparison-system summary. Do not select, rank, or omit systems.
- For health or filter explanations, use only the approved evidence above. If it does not support an answer, say that the verified sources here do not answer the question.
- Be honest about uncertainty. Never diagnose, predict disease, or say that a displayed result caused an illness.
- For personal medical decisions, do not give a direct instruction. Suggest discussing the result with a qualified healthcare professional when appropriate.
- For filters or treatment, advise checking current independent certification for PFAS reduction and the named utility's current water-quality information; do not invent product performance.
- Use familiar words and short sentences. Default to two or three sentences and give the practical answer first.
- Return plain text without Markdown headings, bullets, emphasis markers, tables, links, or source notes. A source label is added separately.
- Never be alarmist, falsely reassuring, or promotional.`;

  const content = await callGroq(
    env,
    [{ role: "system", content: systemPrompt }, ...payload.messages],
    420
  );
  return normalizeChatReply(content, payload);
}

function normalizeChatReply(content, payload) {
  const isZh = payload.language === "zh";
  let reply = cleanString(content, 1800)
    .replace(/\*\*|__/g, "")
    .replace(/`/g, "")
    .replace(/\bsystem[- ]wide(?: EPA)?(?: sampling)? averages\b/gi, "highest annual averages shown among the water system's EPA sampling locations")
    .replace(/\bsystem[- ]wide(?: EPA)?(?: sampling)? average\b/gi, "highest annual average shown among the water system's EPA sampling locations")
    .replace(/\bhealth[- ]based (?:reference|screening|comparison) (?:values|levels|limits)\b/gi, "EPA technical comparison levels")
    .replace(/\bhealth[- ]based (?:reference|screening|comparison) (?:value|level|limit)\b/gi, "EPA technical comparison level")
    .replace(/\bclinically (?:approved|validated)\b/gi, "designed for public education");

  const question = payload.messages.at(-1)?.content?.toLowerCase() || "";
  let source = "";
  if (/filter|reverse osmosis|charcoal|carbon|ion exchange|nsf|过滤|滤芯|反渗透/.test(question)) {
    source = isZh ? "资料：EPA家用过滤器指南和NSF认证指南。" : "Source: EPA home-filter guidance and NSF certification guidance.";
  } else if (/health|cancer|pregnan|child|baby|immune|thyroid|liver|cholesterol|doctor|medical|健康|癌|孕|儿童|婴儿|免疫|甲状腺|肝|胆固醇|医生|医疗/.test(question)) {
    source = isZh ? "资料：EPA和ATSDR的PFAS健康指南。" : "Source: EPA and ATSDR PFAS health guidance.";
  } else if (/pfas|water|utility|system|result|level|comparison|epa|供水|水质|结果|数值|比较/.test(question)) {
    source = payload.zip_context
      ? (isZh ? "资料：本页显示的EPA UCMR 5数据。" : "Source: EPA UCMR 5 data shown on this page.")
      : (isZh ? "资料：EPA PFAS指南。" : "Source: EPA PFAS guidance.");
  }

  if (source && !/\bsource\s*:/i.test(reply) && !/资料[:：]/.test(reply)) reply = `${reply}\n\n${source}`;
  return reply;
}

async function callGroq(env, messages, maxTokens) {
  const configuredModels = String(env.GROQ_MODEL || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const models = configuredModels.length ? configuredModels : DEFAULT_GROQ_MODELS;

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    let response;
    try {
      response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.GROQ_API_KEY}`
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, temperature: 0.2, messages })
      });
    } catch (error) {
      const networkError = new Error("Groq could not be reached.");
      networkError.status = 502;
      throw networkError;
    }

    let data;
    try {
      data = await response.json();
    } catch (error) {
      const invalidError = new Error("Groq returned an unreadable response.");
      invalidError.status = 502;
      throw invalidError;
    }

    if (response.ok && !data.error) {
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) {
        const emptyError = new Error("Groq returned an empty response.");
        emptyError.status = 502;
        throw emptyError;
      }
      return content.trim();
    }

    const upstreamMessage = data?.error?.message || "";
    const upstreamCode = String(data?.error?.code || "");
    const isRateLimit = response.status === 429 || /rate limit/i.test(upstreamMessage);
    const modelUnavailable = [400, 403, 404, 422].includes(response.status)
      && /model|deprecat|retir|permission|access/i.test(`${upstreamMessage} ${upstreamCode}`);
    console.error("Groq request rejected", { status: response.status, model, code: upstreamCode });

    if (modelUnavailable && index < models.length - 1) continue;

    const upstreamError = new Error(
      isRateLimit
        ? "The AI request limit has been reached. Please try again later."
        : "The AI provider rejected the request."
    );
    upstreamError.status = isRateLimit ? 429 : 502;
    throw upstreamError;
  }

  const unavailableError = new Error("No configured AI model is available.");
  unavailableError.status = 502;
  throw unavailableError;
}
