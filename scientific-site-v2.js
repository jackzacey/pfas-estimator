(() => {
  "use strict";

  const RELEASE_PATH = "/analysis/exports/ucmr5_jan2026_v0_2";
  const LOOKUP_URL = `${RELEASE_PATH}/website_lookup_compact.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const ASSISTANT_URL = "https://pfas-groq-proxy.jackzacey.workers.dev";
  const REQUEST_TIMEOUT_MS = 20000;
  const OUTCOMES = [
    { key: "pfoa", label: "PFOA", benchmark: "4 ppt individual MCL", cutoff: "EPA unrounded comparison ≥4.05 ppt" },
    { key: "pfos", label: "PFOS", benchmark: "4 ppt individual MCL", cutoff: "EPA unrounded comparison ≥4.05 ppt" },
    { key: "pfhxs", label: "PFHxS", benchmark: "10 ppt individual MCL", cutoff: "EPA unrounded comparison ≥15 ppt" },
    { key: "pfna", label: "PFNA", benchmark: "10 ppt individual MCL", cutoff: "EPA unrounded comparison ≥15 ppt" },
    { key: "hfpo_da", label: "HFPO-DA", benchmark: "10 ppt individual MCL", cutoff: "EPA unrounded comparison ≥15 ppt" },
    { key: "hi", label: "Hazard Index", labelZh: "危害指数", benchmark: "HI of 1", cutoff: "EPA unrounded comparison ≥1.5 with ≥2 detected components" },
  ];

  const COPY = {
    en: {
      navLookup: "System lookup", navMap: "Map", navTable: "State table", navStates: "Explore by state", navResearch: "Research snapshot", navMethods: "Methods & limitations",
      releaseBadge: "January 2026 EPA release · Reproducible analysis v0.2",
      heroTitle: "Find EPA-monitored public water systems",
      heroSubtitle: "Enter a ZIP code to find public water systems that reported serving it and review EPA-derived PFAS sampling-location annual-average comparisons.",
      truthNote: "<strong>What this lookup can establish:</strong> a monitored public water system reported an association with the ZIP code. It cannot confirm which system serves a particular address, estimate household exposure, or determine regulatory compliance. Confirm service and current water quality with your utility.",
      printButton: "Print / save this system summary",
      chatTitle: "PFAS Q&A", chatSubtitle: "Optional AI explanation · Lookup results remain deterministic",
      suggestMeaning: "What do these system results mean?", suggestUtility: "How do I confirm my utility?", suggestFilter: "What filters reduce PFAS?",
      askButton: "Ask", chatDisclaimer: "AI responses may be incomplete. Verify personal service with your utility and use a healthcare professional for medical decisions.",
      searchCounter: "searches", clinicalCounter: "clinical uses reported",
      clinicalPrompt: "Clinician using this result? Enter the project code to record one anonymous clinical use.", clinicalButton: "Record use", clinicalThanks: "Clinical use recorded. No patient information was collected.",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing the frozen scientific release.", findSystems: "Find monitored systems",
      verifiedRelease: "Verified release", monitoredSystems: "monitored systems", zipAssociations: "reported ZIP associations", resultsThrough: "EPA results through January 15, 2026",
      loadFailure: "The verified data release could not be loaded. Please use EPA’s UCMR 5 Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `No monitored-system association found for ZIP ${zip}`,
      noAssociationContext: "This does not mean the water is PFAS-free. The ZIP may be served by a system not linked in the UCMR file, a private well, or another provider.",
      noAssociationBody: "Use your water bill or local utility website to identify the provider, then review its consumer confidence report or search EPA’s Data Finder by system name.",
      openDataFinder: "Open EPA’s UCMR 5 Data Finder →",
      associatedTitle: (count, zip) => `${count} monitored public water system${count === 1 ? "" : "s"} associated with ZIP ${zip}`,
      associatedContext: count => `${count} ${count === 1 ? "system has" : "systems have"} at least one sampling location meeting an April 2024 EPA technical comparison criterion. Verify your actual provider before interpreting any result.`,
      communitySystem: "Community water system", publicSystem: "Public water system", residentialNotUsed: "residential Census context is not used for this system",
      completeUnavailable: "Complete-set comparison unavailable", atLeastOne: "At least one location meets an EPA comparison criterion", noLocationMeets: "No complete location average meets an EPA comparison criterion",
      populationServed: "Population served", source: "Primary source", ownership: "Ownership", samplingLocations: "Sampling locations", serviceBoundary: "Service boundary", sdwisStatus: "SDWIS status",
      notReported: "Not reported", notAvailable: "Not available", unnamed: "Unnamed public water system",
      measure: "Measure", highestAverage: "Highest location average", benchmarkHeading: "April 2024 benchmark", comparisonHeading: "EPA technical comparison",
      noCompleteAverage: "No complete-set annual average", meets: "Meets EPA comparison criterion", doesNotMeet: "Does not meet comparison criterion",
      demographicSummary: "Service-area demographic context used in the research analysis", demographicNote: "Ecological estimates for the modeled service area; these do not describe any individual customer.",
      hispanic: "Hispanic", black: "non-Hispanic Black", aian: "non-Hispanic AIAN", poverty: "below poverty", rural: "rural",
      resultCaveat: "The displayed maximum is the highest EPA-derived sampling-location annual average within this system. It is not a household-tap measurement and the comparison flag is not a compliance determination.",
      welcome: "Ask a PFAS question at any time. After a ZIP lookup, I can explain the displayed system results without changing the underlying calculations.",
      contextReadyAbove: "I can explain these potentially associated system results. At least one displayed system meets an EPA technical comparison; that is not a compliance or household-exposure determination.",
      contextReadyBelow: "I can explain these potentially associated system results. None of the displayed complete location averages meets an EPA technical comparison.",
      contextReadyNone: "No monitored-system association was found for that ZIP. I can explain what that absence does and does not mean.",
      thinking: "Reviewing the displayed system context…",
      rateError: "The assistant has reached its short-term request limit. The lookup remains available; please try the chat again in about a minute.",
      timeoutError: "The assistant took too long to respond. The lookup remains available; please try the chat again.",
      unavailableError: "The assistant is temporarily unavailable. The verified lookup results above are unaffected.",
      genericError: "The assistant could not complete that request. The verified lookup results above are unaffected.",
      wrongCode: "The project code was not recognized.",
    },
    zh: {
      navLookup: "供水系统查询", navMap: "地图", navTable: "州级表格", navStates: "按州浏览", navResearch: "研究摘要", navMethods: "方法与局限",
      releaseBadge: "EPA 2026年1月数据 · 可重复分析 v0.2",
      heroTitle: "查找经EPA监测的公共供水系统",
      heroSubtitle: "输入邮政编码，查找报告服务该地区的公共供水系统，并查看EPA衍生的PFAS采样点年度平均值比较。",
      truthNote: "<strong>此查询可以确认：</strong>某个受监测的公共供水系统报告了与该邮政编码的关联。它不能确认具体住址由哪个系统供水，不能估算家庭暴露，也不能判定法规合规。请向供水机构确认服务和当前水质。",
      printButton: "打印或保存供水系统摘要",
      chatTitle: "PFAS问答", chatSubtitle: "可选AI解释 · 查询结果仍由固定数据计算",
      suggestMeaning: "这些供水系统结果意味着什么？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "哪些过滤器可以减少PFAS？",
      askButton: "提问", chatDisclaimer: "AI回答可能不完整。请向供水机构确认实际服务，并就医疗决定咨询专业医务人员。",
      searchCounter: "次查询", clinicalCounter: "次已报告临床使用",
      clinicalPrompt: "临床人员正在使用此结果？输入项目代码，匿名记录一次临床使用。", clinicalButton: "记录使用", clinicalThanks: "已记录临床使用。未收集患者信息。",
      loadingRelease: "正在加载已验证版本…", releaseUnavailable: "版本不可用", dataUnavailable: "数据不可用", loadingData: "正在加载数据…",
      preparing: "正在准备冻结的科学数据版本。", findSystems: "查找受监测系统",
      verifiedRelease: "已验证版本", monitoredSystems: "个受监测系统", zipAssociations: "个报告的邮政编码关联", resultsThrough: "EPA结果截至2026年1月15日",
      loadFailure: "无法加载已验证的数据版本。问题解决前，请使用EPA UCMR 5数据查找器。",
      invalidZipTitle: "请输入有效的5位邮政编码", invalidZipContext: "邮政编码必须恰好包含五位数字。",
      noAssociationTitle: zip => `未找到邮政编码 ${zip} 的受监测系统关联`,
      noAssociationContext: "这并不表示水中不含PFAS。该邮政编码可能由UCMR文件未关联的系统、私人水井或其他供水方服务。",
      noAssociationBody: "请使用水费账单或当地供水机构网站确认供水方，然后查看消费者信心报告或按系统名称搜索EPA数据。",
      openDataFinder: "打开EPA UCMR 5数据查找器 →",
      associatedTitle: (count, zip) => `邮政编码 ${zip} 关联了 ${count} 个受监测公共供水系统`,
      associatedContext: count => `${count} 个系统中有系统的至少一个采样点达到2024年4月EPA技术比较条件。解读任何结果前，请确认实际供水方。`,
      communitySystem: "社区供水系统", publicSystem: "公共供水系统", residentialNotUsed: "此系统不使用居民人口普查背景",
      completeUnavailable: "无法进行完整采样组比较", atLeastOne: "至少一个采样点达到EPA比较条件", noLocationMeets: "没有完整采样点平均值达到EPA比较条件",
      populationServed: "服务人口", source: "主要水源", ownership: "所有权", samplingLocations: "采样点", serviceBoundary: "服务区边界", sdwisStatus: "SDWIS状态",
      notReported: "未报告", notAvailable: "不可用", unnamed: "未命名公共供水系统",
      measure: "指标", highestAverage: "最高采样点平均值", benchmarkHeading: "2024年4月基准", comparisonHeading: "EPA技术比较",
      noCompleteAverage: "无完整采样组年度平均值", meets: "达到EPA比较条件", doesNotMeet: "未达到EPA比较条件",
      demographicSummary: "研究分析使用的服务区人口背景", demographicNote: "这是模型服务区的生态估计，不描述任何个人客户。",
      hispanic: "西班牙裔", black: "非西班牙裔黑人", aian: "非西班牙裔美洲印第安人/阿拉斯加原住民", poverty: "低于贫困线", rural: "农村",
      resultCaveat: "显示的最大值是该系统内最高的EPA衍生采样点年度平均值。它不是家庭水龙头测量值，比较标记也不是合规判定。",
      welcome: "您可以随时询问PFAS问题。查询邮政编码后，我可以解释显示的供水系统结果，但不会改变底层计算。",
      contextReadyAbove: "我可以解释这些可能相关的供水系统结果。至少一个显示系统达到EPA技术比较条件；这不是合规或家庭暴露判定。",
      contextReadyBelow: "我可以解释这些可能相关的供水系统结果。显示的完整采样点平均值均未达到EPA技术比较条件。",
      contextReadyNone: "没有找到该邮政编码的受监测系统关联。我可以解释这种缺失意味着什么以及不意味着什么。",
      thinking: "正在查看显示的供水系统背景…",
      rateError: "助手已达到短期请求限制。查询功能仍可使用；请约一分钟后重试。",
      timeoutError: "助手响应时间过长。查询功能仍可使用；请重试。",
      unavailableError: "助手暂时不可用。上方已验证的查询结果不受影响。",
      genericError: "助手无法完成该请求。上方已验证的查询结果不受影响。",
      wrongCode: "无法识别项目代码。",
    }
  };

  let currentLang = "en";
  let release = null;
  let metadata = null;
  let systemsById = new Map();
  let currentContext = "";
  let currentSystems = [];
  let chatMessages = [];
  let lastLookupZip = null;

  const $ = id => document.getElementById(id);
  const text = key => COPY[currentLang][key];

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function applyLanguage() {
    document.documentElement.lang = currentLang === "zh" ? "zh-Hans" : "en";
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const value = text(element.dataset.i18n);
      if (typeof value === "string") element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(element => {
      const value = text(element.dataset.i18nHtml);
      if (typeof value === "string") element.innerHTML = value;
    });
    $("langEn")?.classList.toggle("active", currentLang === "en");
    $("langZh")?.classList.toggle("active", currentLang === "zh");
    if ($("zipInput")) $("zipInput").placeholder = currentLang === "zh" ? "输入5位邮政编码" : "Enter a 5-digit ZIP code";
    if ($("aiInput")) $("aiInput").placeholder = currentLang === "zh" ? "询问PFAS或显示的供水系统…" : "Ask about PFAS or the displayed systems…";
    if (release) updateReleaseLabels();
    if (lastLookupZip && release) renderLookup(lastLookupZip, false);
    else resetChat(text("welcome"));
  }

  function formatInteger(value) {
    if (value === null || value === undefined || value === "") return text("notReported");
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US") : text("notReported");
  }

  function formatPercent(value) {
    if (value === null || value === undefined || value === "") return text("notAvailable");
    const numeric = Number(value);
    return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(1)}%` : text("notAvailable");
  }

  function formatAverage(value, isHazardIndex = false) {
    if (value === null || value === undefined || value === "") return text("notAvailable");
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return text("notAvailable");
    if (isHazardIndex) return numeric.toFixed(3);
    return `${(numeric * 1000).toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 })} ppt`;
  }

  function hydrateRows(payload) {
    return payload.systems.map(values => Object.fromEntries(payload.columns.map((column, index) => [column, values[index]])));
  }

  function updateReleaseLabels() {
    $("releaseStatus").textContent = `${text("verifiedRelease")} · ${release.release_id}`;
    $("releaseStatus").className = "release-status ready";
    $("lookupDataNote").textContent = `${release.systems.length.toLocaleString()} ${text("monitoredSystems")} · ${Object.keys(release.zip_to_pwsids).length.toLocaleString()} ${text("zipAssociations")} · ${text("resultsThrough")}`;
    $("lookupButton").textContent = text("findSystems");
  }

  function setLoadFailure() {
    $("releaseStatus").textContent = text("releaseUnavailable");
    $("releaseStatus").className = "release-status error";
    $("lookupDataNote").textContent = text("loadFailure");
    $("lookupButton").textContent = text("dataUnavailable");
    $("lookupButton").disabled = true;
  }

  function outcomeStatus(system, outcome) {
    const full = Number(system[`${outcome.key}_system_full_set`]) === 1;
    const above = Number(system[`${outcome.key}_system_above_mcl_comparison`]) === 1;
    const maximum = system[`${outcome.key}_max_location_average`];
    if (!full) return { label: text("noCompleteAverage"), className: "incomplete", maximum };
    if (above) return { label: text("meets"), className: "above", maximum };
    return { label: text("doesNotMeet"), className: "below", maximum };
  }

  function renderOutcomeTable(system) {
    const rows = OUTCOMES.map(outcome => {
      const status = outcomeStatus(system, outcome);
      const value = formatAverage(status.maximum, outcome.key === "hi");
      const label = currentLang === "zh" && outcome.labelZh ? outcome.labelZh : outcome.label;
      return `<tr><th scope="row">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td><td>${escapeHtml(outcome.benchmark)}<span class="benchmark-detail">${escapeHtml(outcome.cutoff)}</span></td><td><span class="comparison-status ${status.className}">${escapeHtml(status.label)}</span></td></tr>`;
    }).join("");
    return `<div class="system-table-wrap"><table class="system-result-table"><thead><tr><th>${text("measure")}</th><th>${text("highestAverage")}</th><th>${text("benchmarkHeading")}</th><th>${text("comparisonHeading")}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  function renderDemographicContext(system) {
    if (!Number(system.primary_inferential_cohort)) return "";
    return `<details class="service-area-context"><summary>${text("demographicSummary")}</summary><p>${text("demographicNote")}</p><div class="context-stat-grid"><span><strong>${formatPercent(system.pct_hispanic_preferred)}</strong> ${text("hispanic")}</span><span><strong>${formatPercent(system.pct_nh_black_preferred)}</strong> ${text("black")}</span><span><strong>${formatPercent(system.pct_nh_aian_preferred)}</strong> ${text("aian")}</span><span><strong>${formatPercent(system.pct_below_poverty_preferred)}</strong> ${text("poverty")}</span><span><strong>${formatPercent(system.pct_rural_preferred)}</strong> ${text("rural")}</span></div></details>`;
  }

  function renderSystem(system) {
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    const complete = Number(system.any_system_full_set) === 1;
    const typeNote = system.pws_type_desc === "Community water system" ? text("communitySystem") : `${system.pws_type_desc || text("publicSystem")}; ${text("residentialNotUsed")}`;
    const headline = !complete ? text("completeUnavailable") : above ? text("atLeastOne") : text("noLocationMeets");
    return `<article class="system-result-card ${above ? "has-comparison" : ""}"><header class="system-result-header"><div><span class="system-state">${escapeHtml(system.sdwis_state_code || "US")}</span><h3>${escapeHtml(system.ucmr_pws_name || text("unnamed"))}</h3><p>PWSID ${escapeHtml(system.pwsid)} · ${escapeHtml(typeNote)}</p></div><span class="system-headline-status ${above ? "above" : complete ? "below" : "incomplete"}">${escapeHtml(headline)}</span></header><div class="system-facts"><span><strong>${text("populationServed")}</strong>${formatInteger(system.population_served_count)}</span><span><strong>${text("source")}</strong>${escapeHtml(system.primary_source_desc || text("notReported"))}</span><span><strong>${text("ownership")}</strong>${escapeHtml(system.owner_desc || text("notReported"))}</span><span><strong>${text("samplingLocations")}</strong>${formatInteger(system.sampling_location_count)}</span><span><strong>${text("serviceBoundary")}</strong>${escapeHtml(system.boundary_provenance || text("notAvailable"))}</span><span><strong>${text("sdwisStatus")}</strong>${escapeHtml(system.pws_activity_desc || text("notReported"))}</span></div>${renderOutcomeTable(system)}${renderDemographicContext(system)}<p class="system-result-caveat">${text("resultCaveat")}</p></article>`;
  }

  function buildAssistantContext(systems) {
    if (!systems.length) return "No monitored public-water-system association was found for the searched ZIP. This absence does not establish that the water is PFAS-free, unmonitored, or served by a private well.";
    const selected = systems.slice(0, 10);
    const lines = [
      `Release: ${release.release_id}.`,
      "The searched ZIP is only a PWS-reported service association. It does not prove that any listed system serves the user's household.",
      "Values are EPA-derived sampling-location annual averages. Comparison flags are technical-assistance classifications, not compliance, exposure, safety, or health determinations.",
      `Potentially associated monitored systems displayed: ${systems.length}.`
    ];
    selected.forEach(system => {
      const outcomes = OUTCOMES.map(outcome => {
        const status = outcomeStatus(system, outcome);
        return `${outcome.label}: ${formatAverage(status.maximum, outcome.key === "hi")}; ${status.label}`;
      }).join(" | ");
      lines.push(`${system.ucmr_pws_name} (PWSID ${system.pwsid}, ${system.sdwis_state_code}): ${outcomes}`);
    });
    if (systems.length > selected.length) lines.push(`${systems.length - selected.length} additional associated systems are displayed on the page but omitted from this compact assistant context.`);
    return lines.join("\n");
  }

  function appendChat(role, content) {
    const element = document.createElement("div");
    element.className = `ai-msg ${role}`;
    element.textContent = content;
    $("aiMessages").appendChild(element);
    $("aiMessages").scrollTop = $("aiMessages").scrollHeight;
    return element;
  }

  function resetChat(message = text("welcome")) {
    chatMessages = [{ role: "assistant", content: message }];
    $("aiMessages").replaceChildren();
    appendChat("assistant", message);
    $("aiSuggestions").hidden = false;
  }

  async function assistantRequest(payload) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(ASSISTANT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error || `Assistant request failed (${response.status}).`);
        error.status = response.status;
        throw error;
      }
      if (typeof data.content !== "string" || !data.content.trim()) throw new Error("Assistant returned an empty response.");
      return data.content.trim().replace(/\*\*|__/g, "").replace(/`/g, "");
    } finally {
      window.clearTimeout(timer);
    }
  }

  function assistantErrorMessage(error) {
    if (error?.status === 429) return text("rateError");
    if (error?.name === "AbortError") return text("timeoutError");
    if (error?.status === 502 || error?.status === 503) return text("unavailableError");
    return text("genericError");
  }

  async function sendChat() {
    const input = $("aiInput");
    const button = $("aiSendBtn");
    const question = input.value.trim();
    if (!question || button.disabled) { if (!question) input.focus(); return; }
    input.value = "";
    button.disabled = true;
    $("aiSuggestions").hidden = true;
    appendChat("user", question);
    chatMessages.push({ role: "user", content: question });
    const thinking = appendChat("thinking", text("thinking"));
    try {
      const reply = await assistantRequest({ action: "chat", language: currentLang, zip_context: currentContext, messages: chatMessages.slice(-6) });
      thinking.remove();
      appendChat("assistant", reply);
      chatMessages.push({ role: "assistant", content: reply });
      trackEvent("ai_question", { has_system_context: currentSystems.length > 0 });
    } catch (error) {
      thinking.remove();
      appendChat("assistant", assistantErrorMessage(error));
      console.warn("Assistant request failed", error);
    } finally {
      button.disabled = false;
      input.focus();
    }
  }

  async function counterRequest(counter, operation = "get") {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(ASSISTANT_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "counter", counter, operation }), signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Number.isFinite(data.count)) throw new Error(data.error || "Counter unavailable");
      return data.count;
    } finally { window.clearTimeout(timer); }
  }

  function displayCount(id, value) {
    if ($(id)) $(id).textContent = Number(value).toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US");
  }

  async function loadCounters() {
    const results = await Promise.allSettled([counterRequest("searches"), counterRequest("clinical")]);
    if (results[0].status === "fulfilled") displayCount("searchCount", results[0].value);
    if (results[1].status === "fulfilled") displayCount("clinicalCount", results[1].value);
  }

  async function incrementSearchCounter() {
    try { displayCount("searchCount", await counterRequest("searches", "increment")); } catch (error) { console.warn("Search counter unavailable", error); }
  }

  async function recordClinicalUse() {
    const input = $("clinicalCode");
    if (input.value !== "369") {
      input.value = "";
      input.placeholder = text("wrongCode");
      window.setTimeout(() => { input.placeholder = "···"; }, 1800);
      return;
    }
    try {
      displayCount("clinicalCount", await counterRequest("clinical", "increment"));
      $("clinicalConfirm").hidden = false;
      input.disabled = true;
      $("clinicalButton").disabled = true;
    } catch (error) {
      console.warn("Clinical counter unavailable", error);
      $("clinicalConfirm").hidden = false;
      $("clinicalConfirm").textContent = text("unavailableError");
    }
  }

  function renderLookup(zip, incrementCounter = true) {
    if (!release) return;
    const result = $("result");
    const title = $("resultTitle");
    const context = $("resultContext");
    const body = $("resultBody");
    if (!/^\d{5}$/.test(zip)) {
      result.className = "result not-found";
      title.textContent = text("invalidZipTitle");
      context.textContent = text("invalidZipContext");
      body.innerHTML = "";
      $("printBtn").hidden = true;
      $("clinicalLog").hidden = true;
      return;
    }

    lastLookupZip = zip;
    const systems = (release.zip_to_pwsids[zip] || []).map(id => systemsById.get(String(id))).filter(Boolean);
    systems.sort((a, b) => {
      const aPriority = Number(a.primary_occurrence_cohort) * 2 + Number(a.any_system_above_mcl_comparison);
      const bPriority = Number(b.primary_occurrence_cohort) * 2 + Number(b.any_system_above_mcl_comparison);
      return bPriority - aPriority || String(a.ucmr_pws_name).localeCompare(String(b.ucmr_pws_name));
    });
    currentSystems = systems;
    currentContext = buildAssistantContext(systems);
    history.replaceState({}, "", `${window.location.pathname}?zip=${encodeURIComponent(zip)}`);
    if (incrementCounter) {
      incrementSearchCounter();
      trackEvent("scientific_zip_lookup", { zip_has_association: systems.length > 0, associated_systems: systems.length });
    }

    if (!systems.length) {
      result.className = "result not-found";
      title.textContent = text("noAssociationTitle")(zip);
      context.textContent = text("noAssociationContext");
      body.innerHTML = `<div class="lookup-empty-guidance"><p>${text("noAssociationBody")}</p><p><a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${text("openDataFinder")}</a></p></div>`;
      $("printBtn").hidden = true;
      $("clinicalLog").hidden = true;
      resetChat(text("contextReadyNone"));
      return;
    }

    const aboveCount = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1).length;
    result.className = aboveCount ? "result found-above" : "result found-below";
    title.textContent = text("associatedTitle")(systems.length, zip);
    context.textContent = text("associatedContext")(aboveCount);
    body.innerHTML = systems.map(renderSystem).join("");
    $("printBtn").hidden = false;
    $("printBtn").classList.add("visible");
    $("clinicalLog").hidden = false;
    resetChat(aboveCount ? text("contextReadyAbove") : text("contextReadyBelow"));
  }

  function checkZip() { renderLookup($("zipInput").value.trim(), true); }

  async function initialize() {
    $("releaseStatus").textContent = text("loadingRelease");
    $("lookupButton").textContent = text("loadingData");
    $("lookupDataNote").textContent = text("preparing");
    resetChat();
    loadCounters();
    try {
      const [lookupResponse, metadataResponse] = await Promise.all([fetch(LOOKUP_URL, { cache: "no-cache" }), fetch(METADATA_URL, { cache: "no-cache" })]);
      if (!lookupResponse.ok || !metadataResponse.ok) throw new Error("Frozen analysis files unavailable");
      release = await lookupResponse.json();
      metadata = await metadataResponse.json();
      if (release.release_id !== metadata.release_id) throw new Error("Release identifiers do not match");
      const systems = hydrateRows(release);
      systemsById = new Map(systems.map(system => [String(system.pwsid), system]));
      updateReleaseLabels();
      $("lookupButton").disabled = false;
      const deepLink = new URLSearchParams(window.location.search).get("zip");
      if (/^\d{5}$/.test(deepLink || "")) {
        $("zipInput").value = deepLink;
        renderLookup(deepLink, false);
      }
    } catch (error) {
      setLoadFailure();
      console.error(error);
    }
  }

  $("lookupButton").addEventListener("click", checkZip);
  $("zipInput").addEventListener("keydown", event => { if (event.key === "Enter") checkZip(); });
  $("printBtn").addEventListener("click", () => { trackEvent("print_system_summary"); window.print(); });
  $("aiSendBtn").addEventListener("click", sendChat);
  $("aiInput").addEventListener("keydown", event => { if (event.key === "Enter") sendChat(); });
  $("aiSuggestions").addEventListener("click", event => {
    const button = event.target.closest("button[data-question-en]");
    if (!button) return;
    $("aiInput").value = currentLang === "zh" ? button.dataset.questionZh : button.dataset.questionEn;
    sendChat();
  });
  $("clinicalButton").addEventListener("click", recordClinicalUse);
  $("clinicalCode").addEventListener("keydown", event => { if (event.key === "Enter") recordClinicalUse(); });
  $("languageToggle").addEventListener("click", () => { currentLang = currentLang === "en" ? "zh" : "en"; applyLanguage(); trackEvent("language_switch", { language: currentLang }); });

  applyLanguage();
  initialize();
})();
