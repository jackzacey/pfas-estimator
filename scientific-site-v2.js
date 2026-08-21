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
      releaseBadge: "National · EPA UCMR 5 Data · Educational Tool",
      heroTitle: "U.S. Tap Water PFAS Checker",
      heroSubtitle: "Enter your ZIP code to find monitored public water systems that may serve your area and understand their EPA PFAS results.",
      truthNote: "<strong>How to read these results:</strong> A ZIP code can identify public water systems that reported serving the area. It cannot confirm which system serves a particular home. Results are EPA-derived sampling-location annual averages—not household measurements, exposure estimates, or compliance determinations.",
      printButton: "Print / Save as PDF for your appointment",
      chatTitle: "Health Q&A", chatSubtitle: "Grounded in the displayed EPA results · Not medical advice",
      suggestConcern: "Should I be concerned?", suggestUtility: "How do I confirm my utility?", suggestFilter: "What filter removes PFAS?", suggestHealth: "What health effects are linked to PFAS?",
      askButton: "Ask", chatDisclaimer: "Always consult a healthcare provider for personal medical guidance.",
      searchCounter: "searches", clinicalCounter: "clinical uses",
      clinicalPrompt: "Provider: enter the project code to record an anonymous clinical use", clinicalButton: "Log", clinicalThanks: "Clinical use recorded. No patient information was collected.",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing the frozen scientific release.", findSystems: "Check my area",
      verifiedRelease: "Verified release", monitoredSystems: "monitored systems", zipAssociations: "reported ZIP associations", resultsThrough: "EPA results through January 15, 2026",
      loadFailure: "The verified data release could not be loaded. Please use EPA’s UCMR 5 Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `No monitored-system association found for ZIP ${zip}`,
      noAssociationContext: "This does not mean the water is PFAS-free. The ZIP may be served by a system not linked in the UCMR file, a private well, or another provider.",
      noAssociationBody: "Use your water bill or local utility website to identify the provider, then review its consumer confidence report or search EPA’s Data Finder by system name.",
      openDataFinder: "Open EPA’s UCMR 5 Data Finder →",
      associatedTitle: (count, zip) => `${count} potentially relevant monitored system${count === 1 ? "" : "s"} for ZIP ${zip}`,
      associatedContext: count => count ? `${count} displayed system${count === 1 ? " has" : "s have"} at least one sampling location meeting an EPA technical comparison. Confirm which utility actually serves your home.` : "None of the displayed systems has a complete sampling-location annual average meeting an EPA technical comparison. Confirm which utility actually serves your home.",
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
      releaseBadge: "全美 · EPA UCMR 5 数据 · 教育工具",
      heroTitle: "美国自来水PFAS查询工具",
      heroSubtitle: "输入邮政编码，查找可能服务该地区的受监测公共供水系统，并了解其EPA PFAS结果。",
      truthNote: "<strong>如何理解这些结果：</strong>邮政编码可以找到报告服务该地区的公共供水系统，但不能确认具体住所由哪个系统供水。结果是EPA衍生的采样点年度平均值，不是家庭测量、暴露估计或合规判定。",
      printButton: "打印或保存PDF以供就诊参考",
      chatTitle: "健康问答", chatSubtitle: "基于页面显示的EPA结果 · 非医疗建议",
      suggestConcern: "我应该担心吗？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "哪种过滤器可去除PFAS？", suggestHealth: "PFAS与哪些健康影响有关？",
      askButton: "提问", chatDisclaimer: "个人医疗问题请始终咨询专业医务人员。",
      searchCounter: "次查询", clinicalCounter: "次临床使用",
      clinicalPrompt: "医疗人员：输入项目代码以匿名记录一次临床使用", clinicalButton: "记录", clinicalThanks: "已记录临床使用。未收集患者信息。",
      loadingRelease: "正在加载已验证版本…", releaseUnavailable: "版本不可用", dataUnavailable: "数据不可用", loadingData: "正在加载数据…",
      preparing: "正在准备冻结的科学数据版本。", findSystems: "查询我的地区",
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
    if ($("langEn") && $("langZh")) {
      $("langEn").style.background = currentLang === "en" ? "#175E97" : "#fff";
      $("langEn").style.color = currentLang === "en" ? "#fff" : "#999";
      $("langZh").style.background = currentLang === "zh" ? "#175E97" : "#fff";
      $("langZh").style.color = currentLang === "zh" ? "#fff" : "#999";
    }
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
    $("lookupDataNote").textContent = `${release.systems.length.toLocaleString()} ${text("monitoredSystems")} · ${Object.keys(release.zip_to_pwsids).length.toLocaleString()} ${text("zipAssociations")} · ${text("resultsThrough")}`;
    $("lookupButton").textContent = text("findSystems");
  }

  function setLoadFailure() {
    $("releaseStatus").textContent = text("releaseUnavailable");
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

  function renderOutcomeList(system) {
    return OUTCOMES.map(outcome => {
      const status = outcomeStatus(system, outcome);
      const value = formatAverage(status.maximum, outcome.key === "hi");
      const label = currentLang === "zh" && outcome.labelZh ? outcome.labelZh : outcome.label;
      return `<div class="compound-result-row ${status.className}">
        <div><span class="compound-tag ${status.className === "above" ? "above" : ""}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
        <div><span>${escapeHtml(status.label)}</span><small>${escapeHtml(outcome.benchmark)} · ${escapeHtml(outcome.cutoff)}</small></div>
      </div>`;
    }).join("");
  }

  function renderSystem(system) {
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    const complete = Number(system.any_system_full_set) === 1;
    const typeNote = system.pws_type_desc === "Community water system" ? text("communitySystem") : (system.pws_type_desc || text("publicSystem"));
    const headline = !complete ? text("completeUnavailable") : above ? text("atLeastOne") : text("noLocationMeets");
    const detailsLabel = currentLang === "zh" ? "查看六项PFAS技术比较" : "View the six PFAS technical comparisons";
    return `<article class="detail-box system-summary-card ${above ? "has-comparison" : ""}">
      <header class="system-summary-head">
        <div><span class="system-state-label">${escapeHtml(system.sdwis_state_code || "US")}</span><h3>${escapeHtml(system.ucmr_pws_name || text("unnamed"))}</h3><p>PWSID ${escapeHtml(system.pwsid)} · ${escapeHtml(typeNote)}</p></div>
        <span class="system-summary-status ${above ? "above" : complete ? "below" : "incomplete"}">${escapeHtml(headline)}</span>
      </header>
      <div class="system-fact-strip">
        <span><strong>${text("populationServed")}</strong>${formatInteger(system.population_served_count)}</span>
        <span><strong>${text("source")}</strong>${escapeHtml(system.primary_source_desc || text("notReported"))}</span>
        <span><strong>${text("samplingLocations")}</strong>${formatInteger(system.sampling_location_count)}</span>
      </div>
      <details class="compound-results-details" ${above ? "open" : ""}>
        <summary>${detailsLabel}</summary>
        <div class="compound-result-list">${renderOutcomeList(system)}</div>
      </details>
      <p class="system-result-caveat">${text("resultCaveat")}</p>
    </article>`;
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
      $("clinicalConfirm").classList.add("visible");
      input.disabled = true;
      $("clinicalButton").disabled = true;
    } catch (error) {
      console.warn("Clinical counter unavailable", error);
      $("clinicalConfirm").classList.add("visible");
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
      $("printBtn").classList.remove("visible");
      $("clinicalLog").classList.remove("visible");
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
    $("printZip").textContent = `${currentLang === "zh" ? "邮政编码" : "ZIP code"}: ${zip}`;
    $("printDate").textContent = `${currentLang === "zh" ? "生成日期" : "Generated"}: ${new Date().toLocaleDateString(currentLang === "zh" ? "zh-CN" : "en-US", { year: "numeric", month: "long", day: "numeric" })}`;
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
      $("printBtn").classList.remove("visible");
      $("clinicalLog").classList.remove("visible");
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
    $("clinicalLog").classList.add("visible");
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
    const button = event.target.closest("[data-question-en]");
    if (!button) return;
    $("aiInput").value = currentLang === "zh" ? button.dataset.questionZh : button.dataset.questionEn;
    sendChat();
  });
  $("aiSuggestions").addEventListener("keydown", event => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const button = event.target.closest("[data-question-en]");
    if (!button) return;
    event.preventDefault();
    $("aiInput").value = currentLang === "zh" ? button.dataset.questionZh : button.dataset.questionEn;
    sendChat();
  });
  $("clinicalButton").addEventListener("click", recordClinicalUse);
  $("clinicalCode").addEventListener("keydown", event => { if (event.key === "Enter") recordClinicalUse(); });
  function toggleLanguage() { currentLang = currentLang === "en" ? "zh" : "en"; applyLanguage(); trackEvent("language_switch", { language: currentLang }); }
  $("languageToggle").addEventListener("click", toggleLanguage);
  $("languageToggle").addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleLanguage(); } });

  applyLanguage();
  initialize();
})();
