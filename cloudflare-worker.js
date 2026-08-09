const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";
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
    if (!env.GROQ_API_KEY) {
      return jsonResponse({ error: "AI service is not configured." }, 503, cors);
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

      return jsonResponse({ error: "Unsupported AI action." }, 400, cors);
    } catch (error) {
      const status = Number.isInteger(error.status) ? error.status : 500;
      const message = status >= 500
        ? "The health assistant is temporarily unavailable."
        : error.message;
      return jsonResponse({ error: message }, status, cors);
    }
  }
};

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
    : "The user has not searched a ZIP code yet. Answer general PFAS, drinking-water, and environmental-health questions without implying that you know their local results. If location-specific context would help, briefly invite them to search a ZIP code.";
  const redirect = isZh
    ? (hasZipContext
      ? "这超出了我能回答的范围——但关于您的水质结果，我很乐意回答有关PFAS健康影响、您的检出水平意味着什么，或您可以采取哪些措施的问题。"
      : "这超出了我能回答的范围，但我很乐意回答有关PFAS、水质和环境健康的问题。")
    : (hasZipContext
      ? "That is outside what I can help with here, but regarding your water results, I'm happy to answer questions about PFAS health effects, what your levels mean, or what steps to take."
      : "That is outside what I can help with here, but I'm happy to answer questions about PFAS, water quality, and environmental health.");

  const systemPrompt = `${isZh ? "Respond entirely in Simplified Chinese (简体中文). " : ""}You are a knowledgeable health assistant specializing in PFAS contamination and its effects on human health. Answer based strictly on published medical and epidemiological research.

${contextBlock}

Guidelines:
- Only answer questions related to PFAS, water quality, environmental health, or adjacent medical/clinical topics.
- If asked about anything unrelated, politely redirect: "${redirect}"
- Answer from the user's specific results above when relevant.
- Be honest about what research does and does not show.
- For pregnancy questions, focus on thyroid disruption, iodine uptake, and fetal brain development.
- Suggest consulting a healthcare provider for personal medical decisions.
- When recommending filters, specify NSF/ANSI 58-certified filters.
- Be concise: two to four sentences unless the question warrants more.
- Never diagnose, be alarmist, or downplay legitimate concerns.`;

  return callGroq(
    env,
    [{ role: "system", content: systemPrompt }, ...payload.messages],
    420
  );
}

async function callGroq(env, messages, maxTokens) {
  let response;
  try {
    response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: maxTokens,
        messages
      })
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

  if (!response.ok || data.error) {
    const upstreamMessage = data?.error?.message || "";
    const isRateLimit = response.status === 429 || /rate limit/i.test(upstreamMessage);
    const upstreamError = new Error(
      isRateLimit
        ? "The AI request limit has been reached. Please try again later."
        : "The AI provider rejected the request."
    );
    upstreamError.status = isRateLimit ? 429 : 502;
    throw upstreamError;
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    const emptyError = new Error("Groq returned an empty response.");
    emptyError.status = 502;
    throw emptyError;
  }
  return content.trim();
}
