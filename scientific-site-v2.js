(() => {
  "use strict";

  const RELEASE_PATH = "/analysis/exports/ucmr5_jan2026_v0_2";
  const LOOKUP_URL = `${RELEASE_PATH}/website_lookup_compact.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const ASSISTANT_URL = "https://pfas-groq-proxy.jackzacey.workers.dev";
  const REQUEST_TIMEOUT_MS = 20000;
  const OUTCOMES = [
    { key: "pfoa", label: "PFOA", fullName: "Perfluorooctanoic acid", benchmark: "4 ppt EPA limit", cutoff: "Exact website cutoff: 4.05 ppt", federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfos", label: "PFOS", fullName: "Perfluorooctane sulfonic acid", benchmark: "4 ppt EPA limit", cutoff: "Exact website cutoff: 4.05 ppt", federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfhxs", label: "PFHxS", fullName: "Perfluorohexane sulfonic acid", benchmark: "10 ppt EPA limit", cutoff: "Exact website cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "pfna", label: "PFNA", fullName: "Perfluorononanoic acid", benchmark: "10 ppt EPA limit", cutoff: "Exact website cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "hfpo_da", label: "HFPO-DA", fullName: "GenX chemicals", benchmark: "10 ppt EPA limit", cutoff: "Exact website cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "hi", label: "Hazard Index", labelZh: "危害指数", fullName: "PFAS mixture measure", benchmark: "EPA benchmark: 1", cutoff: "Exact website cutoff: 1.5 with at least 2 detected components", federalLevel: 1, comparisonCutoff: 1.5 },
  ];

  const COMPOUND_GUIDANCE = {
    pfoa: {
      about: {
        en: "PFOA is a long-lasting PFAS historically connected with fluoropolymer manufacturing and products designed to resist heat, oil, stains, grease, and water. It can remain in the environment and in the human body for years.",
        zh: "PFOA是一种长期存在的PFAS，过去与含氟聚合物制造以及耐热、耐油、耐污、防油脂和防水产品有关。它可在环境和人体内存在多年。"
      },
      health: {
        en: "EPA used three human health effects to set its noncancer value: reduced antibody response to tetanus and diphtheria vaccines in children, lower infant birth weight, and higher total cholesterol in adults. EPA classified PFOA as likely to be carcinogenic to humans through oral exposure and based its quantitative cancer value on kidney cancer evidence. Because PFOA persists in the body, repeated exposure over time is the main concern.",
        zh: "EPA依据三项人体健康影响制定非癌症毒性值：儿童对破伤风和白喉疫苗的抗体反应降低、婴儿出生体重下降以及成人总胆固醇升高。EPA将经口暴露的PFOA归类为可能对人类致癌，并依据肾癌证据制定定量癌症风险值。由于PFOA可在体内长期存在，持续反复暴露是主要关注点。"
      },
      evidence: {
        en: "EPA’s final assessment draws on human epidemiology, animal toxicology, and mechanistic evidence; the evidence base is stronger than it is for many newer PFAS.",
        zh: "EPA最终评估综合了人体流行病学、动物毒理学和作用机制证据；其证据基础强于许多较新的PFAS。"
      },
      refs: [
        { label: "EPA final PFOA toxicity assessment", labelZh: "EPA最终PFOA毒性评估", url: "https://www.epa.gov/sdwa/human-health-toxicity-assessment-perfluorooctanoic-acid-pfoa" },
        { label: "EPA: current understanding of PFAS health risks", labelZh: "EPA：对PFAS健康风险的当前认识", url: "https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas" }
      ]
    },
    pfos: {
      about: {
        en: "PFOS is a persistent PFAS historically used in products such as stain-resistant treatments, metal-plating applications, and some firefighting foams. It can accumulate in people, wildlife, and the environment.",
        zh: "PFOS是一种持久性PFAS，过去用于防污处理、金属电镀和某些消防泡沫。它可在人体、野生动物和环境中累积。"
      },
      health: {
        en: "EPA concluded that sufficient PFOS exposure is likely to cause liver, immune, cardiovascular, and developmental effects. Lower infant birth weight and higher total cholesterol in adults were used as the critical effects for EPA’s noncancer value, and immune studies found reduced antibody response in children. EPA also classified PFOS as likely to be carcinogenic to humans. PFOS can accumulate in the body, so continued exposure can add to an existing body burden.",
        zh: "EPA认为，足够的PFOS暴露可能导致肝脏、免疫、心血管和发育影响。EPA以婴儿出生体重下降和成人总胆固醇升高作为制定非癌症毒性值的关键效应，免疫研究还发现儿童抗体反应降低。EPA也将PFOS归类为可能对人类致癌。PFOS可在体内累积，因此持续暴露会增加已有的体内负担。"
      },
      evidence: {
        en: "EPA’s final assessment draws on human, animal, and mechanistic studies and treats developmental, liver, immune, and cardiovascular effects as the strongest noncancer concerns.",
        zh: "EPA最终评估综合了人体、动物和作用机制研究，并将发育、肝脏、免疫和心血管影响列为证据最强的非癌症关注点。"
      },
      refs: [
        { label: "EPA final PFOS toxicity assessment", labelZh: "EPA最终PFOS毒性评估", url: "https://www.epa.gov/sdwa/human-health-toxicity-assessment-perfluorooctane-sulfonic-acid-pfos" },
        { label: "EPA: current understanding of PFAS health risks", labelZh: "EPA：对PFAS健康风险的当前认识", url: "https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas" }
      ]
    },
    pfhxs: {
      about: {
        en: "PFHxS is a persistent PFAS historically associated with stain- and water-resistant treatments and some firefighting foams. It breaks down very slowly and may remain in the body for years.",
        zh: "PFHxS是一种持久性PFAS，过去与防污、防水处理和某些消防泡沫有关。它分解很慢，并可能在人体内存在多年。"
      },
      health: {
        en: "EPA’s final IRIS review concluded that sufficient PFHxS exposure is likely to cause thyroid effects and developmental immune effects. Key evidence included lower anti-tetanus antibody concentrations in children and reduced thyroid hormone T4 in animal offspring. These findings make long-term exposure, pregnancy, and childhood especially relevant periods for exposure reduction. PFHxS also breaks down slowly and can remain in the body for years.",
        zh: "EPA最终IRIS评估认为，足够的PFHxS暴露可能导致甲状腺影响和发育期免疫影响。关键证据包括儿童抗破伤风抗体浓度下降以及动物后代甲状腺激素T4降低。这些发现使长期暴露、孕期和儿童期成为特别值得减少暴露的时期。PFHxS分解缓慢，并可在体内存在多年。"
      },
      evidence: {
        en: "EPA judged the thyroid and developmental immune hazards “likely”; evidence for several other possible outcomes is less certain.",
        zh: "EPA将甲状腺和发育期免疫危害判断为“可能”；其他若干潜在结局的证据仍较不确定。"
      },
      refs: [
        { label: "EPA IRIS toxicological review of PFHxS", labelZh: "EPA IRIS PFHxS毒理学评估", url: "https://iris.epa.gov/static/pdfs/0705tr.pdf" },
        { label: "EPA PFAS research and toxicity assessments", labelZh: "EPA PFAS研究与毒性评估", url: "https://www.epa.gov/chemical-research/research-and-polyfluoroalkyl-substances-pfas" }
      ]
    },
    pfna: {
      about: {
        en: "PFNA is a long-chain PFAS associated with some fluoropolymer manufacturing and stain-, grease-, and water-resistant applications. It is persistent and can build up in living organisms.",
        zh: "PFNA是一种长链PFAS，与某些含氟聚合物制造以及防污、防油脂和防水用途有关。它具有持久性，并可在生物体内累积。"
      },
      health: {
        en: "EPA’s draft review indicates that sufficient PFNA exposure is likely to cause liver effects and male reproductive effects. Animal findings included liver injury and a coherent pattern of adverse male reproductive changes. The draft also found evidence suggesting possible immune suppression, although EPA considered that immune evidence insufficient for a firm conclusion. PFNA is persistent, so continued exposure can increase body burden.",
        zh: "EPA评估草案认为，足够的PFNA暴露可能导致肝脏影响和男性生殖影响。动物研究发现肝损伤以及一系列一致的不良男性生殖变化。草案还发现提示潜在免疫抑制的证据，但EPA认为免疫证据尚不足以得出明确结论。PFNA具有持久性，因此持续暴露会增加体内负担。"
      },
      evidence: {
        en: "This is still a draft EPA hazard assessment. The liver and male reproductive concerns are stronger than the current immune evidence, and conclusions may change before finalization.",
        zh: "这仍是EPA危害评估草案。肝脏和男性生殖方面的关注证据强于目前的免疫证据，最终完成前结论可能改变。"
      },
      refs: [
        { label: "EPA draft IRIS toxicological review of PFNA", labelZh: "EPA IRIS PFNA毒理学评估草案", url: "https://iris.epa.gov/document/%26deid%3D355409" },
        { label: "EPA PFAS research and toxicity assessments", labelZh: "EPA PFAS研究与毒性评估", url: "https://www.epa.gov/chemical-research/research-and-polyfluoroalkyl-substances-pfas" }
      ]
    },
    hfpo_da: {
      about: {
        en: "HFPO-DA is one of the GenX chemicals used as a processing aid in making some fluoropolymers. It was introduced as a replacement for some older PFAS, but it is also persistent in the environment.",
        zh: "HFPO-DA是GenX化学品之一，在制造某些含氟聚合物时用作加工助剂。它曾作为部分旧型PFAS的替代品引入，但在环境中同样具有持久性。"
      },
      health: {
        en: "EPA’s animal studies reported liver-cell injury, kidney changes, suppressed antibody response, blood changes, early deliveries or developmental delays, and liver and pancreatic tumors. EPA identified the liver as the most sensitive target and described suggestive evidence of carcinogenic potential. HFPO-DA was introduced as a replacement for older PFAS, but replacement does not mean harmless.",
        zh: "EPA动物研究报告了肝细胞损伤、肾脏变化、抗体反应受抑、血液变化、早产或发育延迟，以及肝脏和胰腺肿瘤。EPA将肝脏确定为最敏感的靶器官，并认为存在提示致癌潜力的证据。HFPO-DA作为旧型PFAS的替代品引入，但“替代品”并不等于无害。"
      },
      evidence: {
        en: "The evidence is mainly from animal studies; EPA had not identified human epidemiology studies when it completed the assessment, so the estimate of human risk is less direct.",
        zh: "证据主要来自动物研究；EPA完成评估时尚未发现人体流行病学研究，因此对人体风险的估计较为间接。"
      },
      refs: [
        { label: "EPA final GenX chemicals toxicity assessment", labelZh: "EPA最终GenX化学品毒性评估", url: "https://www.epa.gov/chemical-research/human-health-toxicity-assessments-genx-chemicals" },
        { label: "EPA: current understanding of PFAS health risks", labelZh: "EPA：对PFAS健康风险的当前认识", url: "https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas" }
      ]
    }
  };

  const COPY = {
    en: {
      navLookup: "System lookup", navMap: "Map", navTable: "State table", navStates: "Explore by state", navResearch: "Research snapshot", navMethods: "Methods & limitations",
      releaseBadge: "National · EPA UCMR 5 Data · Educational Tool",
      heroTitle: "U.S. Tap Water PFAS Checker",
      heroSubtitle: "Enter your ZIP code to check PFAS results for local water systems, understand what was found, and see what you can do next.",
      truthNote: "<strong>Before you start:</strong> Your ZIP code can list more than one water system. Match the system name to your water bill before using the results. The measurements come from EPA water-system testing, not your home faucet.",
      printButton: "Print / Save as PDF for your appointment",
      chatTitle: "PFAS Health Assistant", chatSubtitle: "Ask about results, health research, or filters · Not medical advice",
      suggestConcern: "Should I be concerned?", suggestUtility: "How do I confirm my utility?", suggestFilter: "What filter removes PFAS?", suggestHealth: "What health effects are linked to PFAS?",
      askButton: "Ask", chatDisclaimer: "Always consult a healthcare provider for personal medical guidance.",
      searchCounter: "searches", clinicalCounter: "clinical uses",
      clinicalPrompt: "Provider: enter the project code to record an anonymous clinical use", clinicalButton: "Log", clinicalThanks: "Clinical use recorded. No patient information was collected.",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing the frozen scientific release.", findSystems: "Check my area",
      verifiedRelease: "Verified release", monitoredSystems: "water systems", zipAssociations: "ZIP codes covered", resultsThrough: "EPA results through January 15, 2026",
      loadFailure: "The verified data release could not be loaded. Please use EPA’s UCMR 5 Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `No water system was found for ZIP ${zip}`,
      noAssociationContext: "This does not mean the water is PFAS-free. The ZIP link may be missing, the home may use a private well, or the local system may not appear in this EPA file.",
      noAssociationBody: "Check your water bill for the utility name. Then open its current water-quality report or search EPA’s Data Finder by system name.",
      openDataFinder: "Open EPA’s UCMR 5 Data Finder →",
      associatedTitle: (count, zip) => `${count} water system${count === 1 ? "" : "s"} listed for ZIP ${zip}`,
      associatedContext: (aboveCount, totalCount) => aboveCount ? `${aboveCount} of ${totalCount} water system${totalCount === 1 ? "" : "s"} below had at least one PFAS result at or above the EPA comparison level. Match the system name to your water bill, then review its results.` : "None of the water systems below had a complete PFAS yearly average at or above the EPA comparison level. Match the system name to your water bill before using the result.",
      communitySystem: "Community water system", publicSystem: "Public water system", residentialNotUsed: "residential Census context is not used for this system",
      completeUnavailable: "Not enough data for a yearly comparison", atLeastOne: "One or more PFAS results are at or above the EPA comparison level", noLocationMeets: "No PFAS yearly average is at or above the EPA comparison level",
      populationServed: "Population served", source: "Primary source", ownership: "Ownership", samplingLocations: "Sampling locations", serviceBoundary: "Service boundary", sdwisStatus: "SDWIS status",
      notReported: "Not reported", notAvailable: "Not available", unnamed: "Unnamed public water system",
      measure: "PFAS", highestAverage: "Highest yearly average", benchmarkHeading: "EPA comparison level", comparisonHeading: "Result",
      noCompleteAverage: "Not enough data", meets: "At or above comparison level", doesNotMeet: "Below comparison level",
      demographicSummary: "Service-area demographic context used in the research analysis", demographicNote: "Ecological estimates for the modeled service area; these do not describe any individual customer.",
      hispanic: "Hispanic", black: "non-Hispanic Black", aian: "non-Hispanic AIAN", poverty: "below poverty", rural: "rural",
      resultCaveat: "This is the highest yearly average across the system’s EPA sampling locations—not a test from your home. An EPA comparison does not by itself decide whether the system is in compliance.",
      welcome: "Ask me about PFAS, filters, health research, or how to read a result. After a ZIP search, I can explain the water systems shown on the page.",
      contextReadyAbove: "I found one or more PFAS results at or above the EPA comparison level. Ask me what the numbers mean, how to confirm your utility, or what to look for in a filter.",
      contextReadyBelow: "The water systems shown did not have a complete PFAS yearly average at or above the EPA comparison level. Ask me what that does—and does not—mean.",
      contextReadyNone: "I could not find a water system for that ZIP. Ask me how to confirm your utility or check a private well.",
      thinking: "Reviewing your question…",
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
      heroSubtitle: "输入邮政编码，查看当地供水系统的PFAS结果、了解检测内容并查看下一步建议。",
      truthNote: "<strong>开始前：</strong>一个邮政编码可能列出多个供水系统。请先将系统名称与水费账单核对。页面数值来自EPA供水系统检测，不是您家水龙头的检测结果。",
      printButton: "打印或保存PDF以供就诊参考",
      chatTitle: "PFAS健康助手", chatSubtitle: "可询问结果、健康研究或过滤器 · 非医疗建议",
      suggestConcern: "我应该担心吗？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "哪种过滤器可去除PFAS？", suggestHealth: "PFAS与哪些健康影响有关？",
      askButton: "提问", chatDisclaimer: "个人医疗问题请始终咨询专业医务人员。",
      searchCounter: "次查询", clinicalCounter: "次临床使用",
      clinicalPrompt: "医疗人员：输入项目代码以匿名记录一次临床使用", clinicalButton: "记录", clinicalThanks: "已记录临床使用。未收集患者信息。",
      loadingRelease: "正在加载已验证版本…", releaseUnavailable: "版本不可用", dataUnavailable: "数据不可用", loadingData: "正在加载数据…",
      preparing: "正在准备冻结的科学数据版本。", findSystems: "查询我的地区",
      verifiedRelease: "已验证版本", monitoredSystems: "个供水系统", zipAssociations: "个邮政编码", resultsThrough: "EPA结果截至2026年1月15日",
      loadFailure: "无法加载已验证的数据版本。问题解决前，请使用EPA UCMR 5数据查找器。",
      invalidZipTitle: "请输入有效的5位邮政编码", invalidZipContext: "邮政编码必须恰好包含五位数字。",
      noAssociationTitle: zip => `未找到邮政编码 ${zip} 的供水系统`,
      noAssociationContext: "这并不表示水中不含PFAS。该邮政编码可能由UCMR文件未关联的系统、私人水井或其他供水方服务。",
      noAssociationBody: "请使用水费账单或当地供水机构网站确认供水方，然后查看消费者信心报告或按系统名称搜索EPA数据。",
      openDataFinder: "打开EPA UCMR 5数据查找器 →",
      associatedTitle: (count, zip) => `邮政编码 ${zip} 列出了 ${count} 个供水系统`,
      associatedContext: (aboveCount, totalCount) => aboveCount ? `${totalCount} 个供水系统中有 ${aboveCount} 个的PFAS结果达到或超过EPA比较水平。请先与水费账单核对系统名称。` : "以下供水系统的完整PFAS年度平均值均未达到EPA比较水平。使用结果前，请先与水费账单核对系统名称。",
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

  function numericAverage(outcome, status) {
    const numeric = Number(status.maximum);
    if (!Number.isFinite(numeric)) return null;
    return outcome.key === "hi" ? numeric : numeric * 1000;
  }

  function renderCompoundReferences(guidance) {
    const heading = currentLang === "zh" ? "资料来源" : "Sources";
    return `<div class="compound-refs"><div class="compound-refs-label">${heading}</div>${guidance.refs.map((reference, index) => {
      const label = currentLang === "zh" ? reference.labelZh : reference.label;
      return `<a href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">[${index + 1}] ${escapeHtml(label)}</a>`;
    }).join("")}</div>`;
  }

  function renderCompoundEducationCard(system, outcome) {
    const status = outcomeStatus(system, outcome);
    const guidance = COMPOUND_GUIDANCE[outcome.key];
    const valuePpt = numericAverage(outcome, status);
    if (!guidance || valuePpt === null || valuePpt <= 0) return "";

    const isZh = currentLang === "zh";
    const value = formatAverage(status.maximum, false);
    const statusCopy = status.className === "above"
      ? (isZh ? "⚠ 检出值达到或超过EPA比较水平" : "⚠ Detected at or above the EPA comparison level")
      : status.className === "below"
        ? (isZh ? "✓ 检出值低于EPA比较水平" : "✓ Detected below the EPA comparison level")
        : (isZh ? "— 已检出；年度比较资料不完整" : "— Detected; yearly comparison data are incomplete");
    const comparisonRatio = (valuePpt / outcome.comparisonCutoff) * 100;
    const gaugeFillPct = Math.min(comparisonRatio, 150) / 150 * 100;
    const ratioLabel = isZh ? `网站技术比较阈值的 ${comparisonRatio.toFixed(0)}%` : `${comparisonRatio.toFixed(0)}% of the website comparison cutoff`;
    const benchmarkCopy = isZh
      ? `2024年4月联邦标准：${outcome.federalLevel} ppt · 2026年1月网站技术比较阈值：${outcome.comparisonCutoff} ppt`
      : `April 2024 federal level: ${outcome.federalLevel} ppt · January 2026 website comparison cutoff: ${outcome.comparisonCutoff} ppt`;
    const resultHeading = isZh ? "🩺 这个水平对您意味着什么" : "🩺 What this level means for you";
    const aboutHeading = isZh ? `🔎 ${outcome.label}是什么` : `🔎 What ${outcome.label} is`;
    const actionHeading = isZh ? "✅ 您可以采取的行动" : "✅ What you can do";
    const evidenceHeading = isZh ? "证据说明：" : "Evidence note:";
    const concernCopy = status.className === "above"
      ? (isZh
        ? "这个结果值得认真对待：该供水系统的最高年度平均值达到或超过了EPA技术比较水平。如果这是水费账单上的供水系统，减少持续暴露并向供水机构询问处理和复测计划是合理的下一步。"
        : "This result deserves attention: the water system’s highest yearly average met or exceeded the EPA technical comparison. If this is the system on your bill, reducing ongoing exposure and asking the utility about treatment and retesting are reasonable next steps.")
      : status.className === "below"
        ? (isZh
          ? "该化合物已在采样水中检出，但完整年度平均值低于EPA技术比较水平。低于阈值比高于阈值更令人放心，但并不等于零暴露；如果这是您的供水系统，了解长期趋势并减少可避免的暴露仍然有意义。"
          : "This compound was detected in sampled water, although the complete yearly average remained below the EPA technical comparison. Below the cutoff is more reassuring than above it, but it is not the same as zero exposure; if this is your system, understanding the long-term trend and reducing avoidable exposure can still be worthwhile.")
        : (isZh
          ? "该化合物已检出，但采样资料不足以完成年度技术比较。现有结果无法说明完整情况，因此如果这是您的供水系统，向供水机构索取完整数据和复测信息很重要。"
          : "This compound was detected, but the sampling record was not complete enough for the yearly technical comparison. The available result does not settle the full picture, so requesting complete data and retesting information matters if this is your system.");
    const actionCopy = isZh
      ? "如果这是水费账单上的供水系统，请询问最高结果来自哪个采样点、较新的结果是升高还是降低、正在使用什么处理方法以及何时复测。如需家用过滤器，请确认具体型号具有NSF/ANSI 53或58标准下的PFAS减少声明，并按期更换滤芯或滤膜。如果家庭中有孕妇、婴幼儿或已知长期暴露者，可将结果带给医疗专业人员讨论。本网站不销售或推荐任何品牌。"
      : "If this is the system on your bill, ask where the highest sample was collected, whether newer results are rising or falling, what treatment is in place, and when the system will retest. For a home filter, verify that the exact model has a PFAS-reduction claim under NSF/ANSI 53 or 58 and maintain it on schedule. If someone is pregnant, very young, or has known long-term exposure, bringing the result to a healthcare professional for discussion is reasonable. PFAS Estimator does not sell or endorse brands.";
    const resultCopy = `${concernCopy} ${guidance.health[currentLang]}`;
    const riskBoundary = isZh
      ? "这些危害结论涉及足够暴露条件下的人群或动物证据；单一供水系统平均值不能证明某种疾病由该水源引起。"
      : "These hazard findings concern sufficient exposure and population or animal evidence; one water-system average cannot prove that a specific illness was caused by this water.";

    return `<article class="detail-box compound-education-card ${status.className}">
      <header class="compound-education-head">
        <div><span class="compound-tag ${status.className === "above" ? "above" : ""}">${escapeHtml(outcome.label)}</span><span class="compound-education-name">${escapeHtml(outcome.fullName)}</span></div>
        <span class="compound-system-name">${escapeHtml(system.ucmr_pws_name || text("unnamed"))}</span>
      </header>
      <div class="compound-measurement ${status.className}">
        <div class="compound-measurement-status">${statusCopy}</div>
        <div class="compound-measurement-value"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(benchmarkCopy)}</span></div>
        ${status.className === "incomplete" ? `<p class="compound-incomplete-note">${isZh ? "完整采样资料不足，因此本网站不为该年度平均值分配比较结论。" : "Complete sampling information is unavailable, so the site does not assign a yearly comparison conclusion."}</p>` : `<div class="epa-bar"><div class="epa-bar-label">${escapeHtml(ratioLabel)}</div><div class="bar-track"><div class="bar-fill ${status.className === "above" ? "above" : ""}" style="width:${gaugeFillPct.toFixed(2)}%"></div><div class="bar-tick"></div></div></div>`}
      </div>
      <div class="science-box compound-result-explanation"><h3>${resultHeading}</h3><p>${escapeHtml(resultCopy)}</p></div>
      <div class="science-box compound-about"><h3>${aboutHeading}</h3><p>${escapeHtml(guidance.about[currentLang])}</p></div>
      <div class="science-box compound-action"><h3>${actionHeading}</h3><p>${escapeHtml(actionCopy)}</p></div>
      <div class="compound-evidence-note"><strong>${evidenceHeading}</strong> ${escapeHtml(guidance.evidence[currentLang])} ${escapeHtml(riskBoundary)}</div>
      ${renderCompoundReferences(guidance)}
    </article>`;
  }

  function renderOutcomeList(system) {
    return OUTCOMES.map(outcome => {
      const status = outcomeStatus(system, outcome);
      const value = formatAverage(status.maximum, outcome.key === "hi");
      const label = currentLang === "zh" && outcome.labelZh ? outcome.labelZh : outcome.label;
      return `<div class="compound-result-row ${status.className}">
        <div><span class="compound-tag ${status.className === "above" ? "above" : ""}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
        <div><span>${escapeHtml(status.label)}</span><small>${escapeHtml(outcome.benchmark)}</small></div>
      </div>`;
    }).join("");
  }

  function renderHazardIndexEducation(system) {
    const outcome = OUTCOMES.find(item => item.key === "hi");
    const status = outcomeStatus(system, outcome);
    const value = numericAverage(outcome, status);
    if (value === null || value <= 0) return "";
    const isZh = currentLang === "zh";
    return `<aside class="science-box hazard-index-education ${status.className}">
      <h3>${isZh ? "🧮 如何理解危害指数" : "🧮 How to read the Hazard Index"}</h3>
      <p><strong>${escapeHtml(formatAverage(status.maximum, true))}</strong> — ${isZh ? "危害指数不是一种化合物浓度，而是PFHxS、PFNA、HFPO-DA和PFBS混合物的相对贡献总和。当前冻结技术比较在指数至少为1.5且至少检出两种组成成分时标记结果。它不是个人健康评分。" : "The Hazard Index is not a compound concentration. It adds the relative contributions of PFHxS, PFNA, HFPO-DA, and PFBS in a mixture. The frozen technical comparison flags an index of at least 1.5 when at least two components were detected. It is not a personal health score."}</p>
      <a href="/methodology/">${isZh ? "查看完整计算方法和局限 →" : "See the full calculation and limitations →"}</a>
    </aside>`;
  }

  function renderSystem(system) {
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    const complete = Number(system.any_system_full_set) === 1;
    const headline = !complete ? text("completeUnavailable") : above ? text("atLeastOne") : text("noLocationMeets");
    const detailsLabel = currentLang === "zh" ? "查看所有六项PFAS结果" : "See all six PFAS results";
    const featuredOutcomes = OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .map(outcome => ({ outcome, status: outcomeStatus(system, outcome) }))
      .filter(item => (numericAverage(item.outcome, item.status) || 0) > 0)
      .sort((a, b) => Number(b.status.className === "above") - Number(a.status.className === "above") || ((numericAverage(b.outcome, b.status) || 0) / b.outcome.comparisonCutoff) - ((numericAverage(a.outcome, a.status) || 0) / a.outcome.comparisonCutoff));
    const featuredMarkup = featuredOutcomes.length
      ? `<div class="compound-education-list">${featuredOutcomes.map(item => renderCompoundEducationCard(system, item.outcome)).join("")}</div>`
      : `<div class="consumer-no-detections">${currentLang === "zh" ? "该供水系统显示的完整年度平均值中没有PFAS检出。" : "No PFAS detection appears in the complete yearly averages shown for this water system."}</div>`;
    return `<article class="detail-box system-summary-card water-system-card ${above ? "has-comparison" : ""}">
      <header class="system-summary-head">
        <div><span class="system-state-label">${escapeHtml(system.sdwis_state_code || "US")} ${currentLang === "zh" ? "供水系统" : "WATER SYSTEM"}</span><h3>${escapeHtml(system.ucmr_pws_name || text("unnamed"))}</h3><p>PWSID ${escapeHtml(system.pwsid)}</p></div>
        <span class="system-summary-status ${above ? "above" : complete ? "below" : "incomplete"}">${escapeHtml(headline)}</span>
      </header>
      <p class="water-system-match">${currentLang === "zh" ? "使用PFAS结果前，请在水费账单上核对完全相同的供水系统名称。" : "Check your water bill for this exact system name before using the PFAS result."}</p>
      <div class="system-fact-strip">
        <span><strong>${text("populationServed")}</strong>${formatInteger(system.population_served_count)}</span>
        <span><strong>${text("source")}</strong>${escapeHtml(system.primary_source_desc || text("notReported"))}</span>
        <span><strong>${text("samplingLocations")}</strong>${formatInteger(system.sampling_location_count)}</span>
      </div>
      ${featuredMarkup}
      ${renderHazardIndexEducation(system)}
      <details class="compound-results-details">
        <summary>${detailsLabel}</summary>
        <div class="compound-result-list">${renderOutcomeList(system)}</div>
      </details>
      <p class="system-result-caveat">${text("resultCaveat")}</p>
    </article>`;
  }

  function renderFilterGuide(hasAboveComparison) {
    const isZh = currentLang === "zh";
    const heading = isZh
      ? (hasAboveComparison ? "正在考虑购买过滤器？" : "希望进一步减少PFAS？")
      : (hasAboveComparison ? "Thinking about a filter?" : "Want an extra layer of PFAS reduction?");
    const intro = isZh
      ? (hasAboveComparison ? "请先确认被标记的供水系统与水费账单一致，再比较经过认证的过滤器声明。" : "低于比较水平不等于家庭水龙头检测。如果仍想使用过滤器，请核对PFAS减少认证，而不是只看营销用语。")
      : (hasAboveComparison ? "First confirm that the flagged water system is the one on your bill. Then use the result to compare certified filter claims." : "A below-comparison result is not a home-faucet test. If you still want a filter, compare certified PFAS-reduction claims rather than marketing language.");
    return `<aside class="result-action-guide">
      <span class="result-action-kicker">${isZh ? "下一步" : "What to do next"}</span>
      <h3>${heading}</h3>
      <p>${intro}</p>
      <ol>
        <li>${isZh ? "寻找 <strong>NSF/ANSI 53或NSF/ANSI 58</strong> 以及明确的PFAS减少声明。" : "Look for <strong>NSF/ANSI 53 or NSF/ANSI 58</strong> and a specific PFAS-reduction claim."}</li>
        <li>${isZh ? "在认可的认证目录中核实具体型号。" : "Verify the exact model in an accredited certification directory."}</li>
        <li>${isZh ? "按照制造商规定的时间更换滤芯或滤膜。" : "Replace the cartridge or membrane on the manufacturer’s schedule."}</li>
      </ol>
      <p class="result-action-links"><a href="https://www.epa.gov/cleanups/reducing-pfas-your-drinking-water-home-filter" target="_blank" rel="noopener noreferrer">${isZh ? "EPA过滤器指南 →" : "EPA filter guide →"}</a><a href="https://www.nsf.org/consumer-resources/articles/pfas-drinking-water" target="_blank" rel="noopener noreferrer">${isZh ? "认证指南 →" : "Certification guidance →"}</a></p>
      <small>${isZh ? "EPA指出，现有过滤器认证不一定证明产品可将PFAS降低到2024年每项联邦限值。PFAS Estimator不认可或销售任何产品。" : "EPA notes that current filter certifications do not necessarily show reduction down to every 2024 federal PFAS limit. PFAS Estimator does not endorse or sell products."}</small>
    </aside>`;
  }

  function buildAssistantContext(systems) {
    if (!systems.length) return "No water system was found for the searched ZIP in this EPA-linked file. This does not establish that the water is PFAS-free; the user should check a water bill, contact the local utility, or determine whether the home uses a private well.";
    const selected = systems.slice(0, 10);
    const lines = [
      `Release: ${release.release_id}.`,
      "The ZIP link can list multiple water systems and does not confirm the utility for a specific home. The user should match the system name to a water bill.",
      "Values are EPA-derived yearly averages from water-system sampling locations, not home-faucet tests. Comparison labels do not by themselves determine compliance, personal exposure, safety, or health risk.",
      `Water systems displayed: ${systems.length}.`
    ];
    selected.forEach(system => {
      const outcomes = OUTCOMES.map(outcome => {
        const status = outcomeStatus(system, outcome);
        return `${outcome.label}: ${formatAverage(status.maximum, outcome.key === "hi")}; ${status.label}`;
      }).join(" | ");
      lines.push(`${system.ucmr_pws_name} (PWSID ${system.pwsid}, ${system.sdwis_state_code}): ${outcomes}`);
    });
    if (systems.length > selected.length) lines.push(`${systems.length - selected.length} additional water systems are displayed on the page but omitted from this compact assistant context.`);
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
    context.textContent = text("associatedContext")(aboveCount, systems.length);
    body.innerHTML = `${renderFilterGuide(aboveCount > 0)}${systems.map(renderSystem).join("")}`;
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
