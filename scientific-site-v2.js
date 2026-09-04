(() => {
  "use strict";

  const RELEASE_PATH = "/analysis/exports/ucmr5_jan2026_v0_2";
  const LOOKUP_URL = `${RELEASE_PATH}/website_lookup_compact.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const ASSISTANT_URL = "https://pfas-groq-proxy.jackzacey.workers.dev";
  const REQUEST_TIMEOUT_MS = 20000;
  const OUTCOMES = [
    { key: "pfoa", label: "PFOA", fullName: "Perfluorooctanoic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "Frozen EPA classification cutoff: 4.05 ppt", federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfos", label: "PFOS", fullName: "Perfluorooctane sulfonic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "Frozen EPA classification cutoff: 4.05 ppt", federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfhxs", label: "PFHxS", fullName: "Perfluorohexane sulfonic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Frozen EPA classification cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "pfna", label: "PFNA", fullName: "Perfluorononanoic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Frozen EPA classification cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "hfpo_da", label: "HFPO-DA", fullName: "GenX chemicals", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Frozen EPA classification cutoff: 15 ppt", federalLevel: 10, comparisonCutoff: 15 },
    { key: "hi", label: "Hazard Index", labelZh: "危害指数", fullName: "PFAS mixture measure", benchmark: "April 2024 federal level: 1", cutoff: "Frozen EPA classification cutoff: 1.5 with at least 2 detected components", federalLevel: 1, comparisonCutoff: 1.5 },
  ];

  const COMPOUND_GUIDANCE = {
    pfoa: {
      about: {
        en: "PFOA is a long-lasting PFAS historically connected with fluoropolymer manufacturing and products designed to resist heat, oil, stains, grease, and water. It can remain in the environment and in the human body for years.",
        zh: "PFOA是一种长期存在的PFAS，过去与含氟聚合物制造以及耐热、耐油、耐污、防油脂和防水产品有关。它可在环境和人体内存在多年。"
      },
      health: {
        en: "EPA links sufficient PFOA exposure with reduced vaccine response in children, lower birth weight, higher cholesterol, and kidney cancer. Long-term exposure matters because PFOA can remain in the body for years.",
        zh: "EPA将足够的PFOA暴露与儿童疫苗反应下降、出生体重降低、胆固醇升高和肾癌联系起来。PFOA可在体内存在多年，因此长期暴露更值得关注。"
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
        en: "EPA links sufficient PFOS exposure with immune, liver, developmental, and cardiovascular effects and classifies PFOS as likely to be carcinogenic. Long-term exposure matters because PFOS can build up in the body.",
        zh: "EPA将足够的PFOS暴露与免疫、肝脏、发育和心血管影响联系起来，并将PFOS归类为可能对人类致癌。PFOS可在体内累积，因此长期暴露更值得关注。"
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
        en: "EPA links sufficient PFHxS exposure with thyroid and developmental immune effects. This is general research evidence, not a conclusion about exposure or health effects for customers of this water system.",
        zh: "EPA将足够的PFHxS暴露与甲状腺和发育期免疫影响联系起来。孕期、婴儿期和儿童期是减少可避免暴露的重要阶段。"
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
        en: "EPA’s draft review links sufficient PFNA exposure with liver and male reproductive effects, mainly from animal studies. The conclusions may change before the review is final.",
        zh: "EPA评估草案将足够的PFNA暴露与肝脏和男性生殖影响联系起来，证据主要来自动物研究。正式评估完成前，结论仍可能改变。"
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
        en: "EPA animal studies link sufficient HFPO-DA exposure with liver, kidney, immune, developmental, and tumor effects. Human evidence is limited.",
        zh: "EPA动物研究将足够的HFPO-DA暴露与肝脏、肾脏、免疫、发育和肿瘤影响联系起来。人体证据仍有限。"
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
      heroTitle: "U.S. Public Water PFAS Monitoring Lookup",
      heroSubtitle: "Enter a ZIP code to find public water systems associated with it and review their EPA UCMR 5 monitoring results.",
      truthNote: "<strong>Before you start:</strong> A ZIP code can list more than one water system. Match the system name to your water bill before reading its results. UCMR 5 samples were collected at entry points to the distribution system, not at your home faucet. <strong>Research snapshot:</strong> This site preserves EPA results received through January 15, 2026. EPA released the final UCMR 5 dataset in August 2026; use the EPA Data Finder for current federal records.",
      printButton: "Print or save this water-system result",
      chatTitle: "PFAS Results Assistant", chatSubtitle: "Ask how to read monitoring results or verify official information",
      suggestConcern: "What can this result tell me?", suggestUtility: "How do I confirm my utility?", suggestFilter: "Where were samples collected?", suggestHealth: "Where are current results?",
      askButton: "Ask", chatDisclaimer: "AI can make mistakes. Do not share names or medical details. ZIP results do not use AI.", chatLearnMore: "How it works",
      searchCounter: "ZIP searches",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing verified EPA data.", findSystems: "Check my area",
      verifiedRelease: "Verified release", monitoredSystems: "water systems", zipAssociations: "ZIP codes covered", resultsThrough: "EPA results through January 15, 2026",
      loadFailure: "The verified data release could not be loaded. Please use EPA’s UCMR 5 Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `No water system was found for ZIP ${zip}`,
      noAssociationContext: "This does not mean the water is PFAS-free. The ZIP link may be missing, the home may use a private well, or the local system may not appear in this EPA file.",
      noAssociationBody: "Check your water bill for the utility name. Then read its current Consumer Confidence Report, contact the utility, or search EPA’s Data Finder by system name. If the home uses a private well, contact the state or local health or environmental agency for testing guidance; private wells are outside this dataset.",
      openDataFinder: "Open EPA’s UCMR 5 Data Finder →",
      associatedTitle: (count, zip) => `${count} water system${count === 1 ? "" : "s"} listed for ZIP ${zip}`,
      associatedContext: (aboveCount, totalCount) => aboveCount
        ? (totalCount === 1
          ? "The listed water system had at least one complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff. Match the system name to your water bill before reading its result."
          : `${aboveCount} of the ${totalCount} listed water systems had at least one complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff. Match the system name to your water bill before reading their results.`)
        : (totalCount === 1
          ? "The listed water system had no complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff. This does not mean that PFAS was not detected. Match the system name to your water bill before reading its result."
          : `All ${totalCount} listed water systems had no complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff. This does not mean that PFAS was not detected. Match the system names to your water bill before reading their results.`),
      communitySystem: "Community water system", publicSystem: "Public water system", residentialNotUsed: "residential Census context is not used for this system",
      completeUnavailable: "Not enough data for a yearly comparison", atLeastOne: "One or more complete PFAS yearly averages are at or above a frozen technical cutoff", noLocationMeets: "No complete PFAS yearly average is at or above a frozen technical cutoff",
      populationServed: "Population served", source: "Primary source", ownership: "Ownership", samplingLocations: "Sampling locations", serviceBoundary: "Service boundary", sdwisStatus: "SDWIS status",
      notReported: "Not reported", notAvailable: "Not available", unnamed: "Unnamed public water system",
      measure: "PFAS", highestAverage: "Highest yearly average", benchmarkHeading: "EPA comparison level", comparisonHeading: "Result",
      noCompleteAverage: "Not enough data", meets: "At or above technical cutoff", doesNotMeet: "Below technical cutoff",
      demographicSummary: "Service-area demographic context used in the research analysis", demographicNote: "Ecological estimates for the modeled service area; these do not describe any individual customer.",
      hispanic: "Hispanic", black: "non-Hispanic Black", aian: "non-Hispanic AIAN", poverty: "below poverty", rural: "rural",
      resultCaveat: "UCMR 5 samples were collected at entry points to the distribution system. The value shown is the highest yearly average among this system’s EPA sampling locations, not a home-faucet result. It does not determine current compliance, household tap concentration, personal exposure, or health risk.",
      welcome: "Ask me how to read the monitoring results, confirm a water system, understand where samples were collected, or find current official information.",
      contextReadyAbove: "One or more displayed yearly averages are at or above a frozen EPA technical-assistance cutoff. I can explain what that classification does and does not mean, how to confirm the utility, or where to find current official information.",
      contextReadyBelow: "No displayed complete yearly average is at or above a frozen EPA technical-assistance cutoff. I can explain why that does not mean PFAS was absent or determine current conditions.",
      contextReadyNone: "I could not find a water system for that ZIP. Ask me how to confirm your utility or check a private well.",
      thinking: "Reviewing your question…",
      rateError: "The assistant has reached its short-term request limit. The lookup remains available; please try the chat again in about a minute.",
      timeoutError: "The assistant took too long to respond. The lookup remains available; please try the chat again.",
      unavailableError: "The assistant is temporarily unavailable. The verified lookup results above are unaffected.",
      genericError: "The assistant could not complete that request. The verified lookup results above are unaffected.",
    },
    zh: {
      navLookup: "供水系统查询", navMap: "地图", navTable: "州级表格", navStates: "按州浏览", navResearch: "研究摘要", navMethods: "方法与局限",
      releaseBadge: "全美 · EPA UCMR 5 数据 · 教育工具",
      heroTitle: "美国公共供水PFAS监测查询",
      heroSubtitle: "输入邮政编码，查找与其关联的公共供水系统并查看EPA UCMR 5监测结果。",
      truthNote: "<strong>开始前：</strong>一个邮政编码可能列出多个供水系统。阅读结果前，请先将系统名称与水费账单核对。UCMR 5样本采自进入配水系统的位置，而不是您家的水龙头。<strong>研究快照：</strong>本网站保留截至2026年1月15日收到的EPA结果。EPA已于2026年8月发布最终UCMR 5数据集；最新联邦记录请使用EPA数据查找器。",
      printButton: "打印或保存此供水系统结果",
      chatTitle: "PFAS结果助手", chatSubtitle: "询问如何理解监测结果或核实官方信息",
      suggestConcern: "这项结果能说明什么？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "样本在哪里采集？", suggestHealth: "在哪里查看最新结果？",
      askButton: "提问", chatDisclaimer: "AI可能出错。请勿分享姓名或医疗详情。邮政编码结果不使用AI。", chatLearnMore: "工作原理",
      searchCounter: "次邮政编码查询",
      loadingRelease: "正在加载已验证版本…", releaseUnavailable: "版本不可用", dataUnavailable: "数据不可用", loadingData: "正在加载数据…",
      preparing: "正在准备冻结的科学数据版本。", findSystems: "查询我的地区",
      verifiedRelease: "已验证版本", monitoredSystems: "个供水系统", zipAssociations: "个邮政编码", resultsThrough: "EPA结果截至2026年1月15日",
      loadFailure: "无法加载已验证的数据版本。问题解决前，请使用EPA UCMR 5数据查找器。",
      invalidZipTitle: "请输入有效的5位邮政编码", invalidZipContext: "邮政编码必须恰好包含五位数字。",
      noAssociationTitle: zip => `未找到邮政编码 ${zip} 的供水系统`,
      noAssociationContext: "这并不表示水中不含PFAS。该邮政编码可能由UCMR文件未关联的系统、私人水井或其他供水方服务。",
      noAssociationBody: "请使用水费账单或当地供水机构网站确认供水方，然后查看消费者信心报告或按系统名称搜索EPA数据。如果住宅使用私人水井，请向州或当地卫生或环境部门咨询检测指南；私人水井不在此数据集中。",
      openDataFinder: "打开EPA UCMR 5数据查找器 →",
      associatedTitle: (count, zip) => `邮政编码 ${zip} 列出了 ${count} 个供水系统`,
      associatedContext: (aboveCount, totalCount) => aboveCount ? `列出的${totalCount}个供水系统中，有${aboveCount}个至少一项完整PFAS年度平均值达到或超过2026年1月冻结的EPA技术援助分类阈值。阅读结果前，请先与水费账单核对系统名称。` : `列出的${totalCount}个供水系统均没有完整PFAS年度平均值达到或超过2026年1月冻结的EPA技术援助分类阈值。这并不表示未检出PFAS。阅读结果前，请先与水费账单核对系统名称。`,
      communitySystem: "社区供水系统", publicSystem: "公共供水系统", residentialNotUsed: "此系统不使用居民人口普查背景",
      completeUnavailable: "资料不足，无法进行年度比较", atLeastOne: "至少一项完整PFAS年度平均值达到或超过冻结技术阈值", noLocationMeets: "没有完整PFAS年度平均值达到或超过冻结技术阈值",
      populationServed: "服务人口", source: "主要水源", ownership: "所有权", samplingLocations: "采样点", serviceBoundary: "服务区边界", sdwisStatus: "SDWIS状态",
      notReported: "未报告", notAvailable: "不可用", unnamed: "未命名公共供水系统",
      measure: "指标", highestAverage: "最高采样点平均值", benchmarkHeading: "2024年4月基准", comparisonHeading: "EPA技术比较",
      noCompleteAverage: "资料不足", meets: "达到或超过技术阈值", doesNotMeet: "低于技术阈值",
      demographicSummary: "研究分析使用的服务区人口背景", demographicNote: "这是模型服务区的生态估计，不描述任何个人客户。",
      hispanic: "西班牙裔", black: "非西班牙裔黑人", aian: "非西班牙裔美洲印第安人/阿拉斯加原住民", poverty: "低于贫困线", rural: "农村",
      resultCaveat: "UCMR 5样本采自进入配水系统的位置。显示值是该系统EPA采样位置中最高的年度平均值，不是家庭水龙头结果，也不能确定当前合规情况、家庭水龙头浓度、个人暴露或健康风险。",
      welcome: "您可以询问如何理解监测结果、确认供水系统、了解采样位置或查找最新官方信息。",
      contextReadyAbove: "一项或多项显示的年度平均值达到或超过冻结的EPA技术援助分类阈值。我可以解释该分类能说明什么、不能说明什么，以及如何确认供水机构或查找最新官方信息。",
      contextReadyBelow: "显示的完整年度平均值均未达到冻结的EPA技术援助分类阈值。我可以解释为何这不表示PFAS不存在，也不能确定当前状况。",
      contextReadyNone: "没有找到该邮政编码的受监测系统关联。我可以解释这种缺失意味着什么以及不意味着什么。",
      thinking: "正在查看显示的供水系统背景…",
      rateError: "助手已达到短期请求限制。查询功能仍可使用；请约一分钟后重试。",
      timeoutError: "助手响应时间过长。查询功能仍可使用；请重试。",
      unavailableError: "助手暂时不可用。上方已验证的查询结果不受影响。",
      genericError: "助手无法完成该请求。上方已验证的查询结果不受影响。",
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
      ? (isZh ? "检出值达到或超过冻结技术阈值" : "Detected at or above the frozen technical cutoff")
      : status.className === "below"
        ? (isZh ? "检出值低于冻结技术阈值" : "Detected below the frozen technical cutoff")
        : (isZh ? "— 已检出；年度比较资料不完整" : "— Detected; yearly comparison data are incomplete");
    const comparisonRatio = (valuePpt / outcome.comparisonCutoff) * 100;
    const gaugeFillPct = Math.min(comparisonRatio, 150) / 150 * 100;
    const ratioLabel = isZh ? "检测值与冻结技术比较阈值" : "Measured value compared with the frozen technical cutoff";
    const benchmarkCopy = isZh
      ? `显示的最高年度平均值 · 2024年4月联邦水平：${outcome.federalLevel} ppt · 冻结分类阈值：${outcome.comparisonCutoff} ppt`
      : `Highest yearly average shown · April 2024 federal level: ${outcome.federalLevel} ppt · frozen classification cutoff: ${outcome.comparisonCutoff} ppt`;
    const resultHeading = isZh ? "如何理解这项监测结果" : "How to read this monitoring result";
    const aboutHeading = isZh ? `🔎 ${outcome.label}是什么` : `🔎 What ${outcome.label} is`;
    const evidenceHeading = isZh ? "证据说明：" : "Evidence note:";
    const concernCopy = status.className === "above"
      ? (isZh
        ? "该供水系统显示的最高年度平均值达到或超过冻结的EPA技术援助分类阈值。请先与水费账单核对系统名称，然后查看供水机构的最新信息。"
        : "The highest yearly average shown for this water system is at or above the frozen EPA technical-assistance cutoff. Confirm the system name on your water bill, then check the utility's current information.")
      : status.className === "below"
        ? (isZh
          ? "采样中检出了这种PFAS，但显示的年度平均值低于冻结的EPA技术援助分类阈值。这并不表示PFAS不存在，也不能确定家庭水龙头的浓度。"
          : "This PFAS was detected, but the yearly average shown is below the frozen EPA technical-assistance cutoff. This does not show that PFAS was absent or determine the concentration at a home faucet.")
        : (isZh
          ? "检出了这种PFAS，但采样资料不足以完成年度比较。如果这是水费账单上的供水系统，请向供水机构索取完整结果和复测信息。"
          : "This PFAS was detected, but the sampling record was not complete enough for a yearly comparison. If this is the system on your bill, ask the utility for complete results and retesting information.");
    const generalResearchLabel = isZh ? "一般研究背景：" : "General research context: ";
    const resultCopy = `${concernCopy} ${generalResearchLabel}${guidance.health[currentLang]}`;
    const riskBoundary = isZh
      ? "这些研究不能证明某种疾病由这个供水系统引起。"
      : "These studies cannot prove that this water system caused a specific illness.";

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
      <details class="compound-results-details">
        <summary>${isZh ? `了解${outcome.label}和资料来源` : `About ${outcome.label} and sources`}</summary>
        <div class="science-box compound-about"><h3>${aboutHeading}</h3><p>${escapeHtml(guidance.about[currentLang])}</p></div>
        <div class="compound-evidence-note"><strong>${evidenceHeading}</strong> ${escapeHtml(guidance.evidence[currentLang])} ${escapeHtml(riskBoundary)}</div>
        ${renderCompoundReferences(guidance)}
      </details>
    </article>`;
  }

  function renderSystemAction(hasAboveComparison) {
    const isZh = currentLang === "zh";
    const copy = isZh
      ? (hasAboveComparison
        ? "请先与水费账单核对供水系统。然后查看该机构最新的消费者信心报告，或询问最新检测、处理和合规信息。此冻结监测结果本身不能确定家庭水龙头浓度、个人暴露或健康风险。"
        : "请先与水费账单核对供水系统。然后查看该机构最新的消费者信心报告或询问最新检测信息。低于冻结技术阈值并不表示未检出PFAS，也不能确定家庭水龙头的当前状况。")
      : (hasAboveComparison
        ? "Confirm the system on your water bill. Then read its current Consumer Confidence Report or ask the utility about newer sampling, treatment, and compliance information. This frozen monitoring result alone cannot determine a household tap concentration, personal exposure, or health risk."
        : "Confirm the system on your water bill. Then read its current Consumer Confidence Report or ask the utility about newer sampling. A result below the frozen technical cutoff does not mean PFAS was absent or establish current conditions at a household faucet.");
    return `<div class="science-box compound-action"><h3>${isZh ? "核实当前信息" : "Verify current information"}</h3><p>${escapeHtml(copy)}</p></div>`;
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
      : `<div class="consumer-no-detections">${currentLang === "zh" ? "该供水系统显示的六项PFAS结果中没有检出。" : "No detection appears among the six PFAS results shown for this water system."}</div>`;
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
      ${renderSystemAction(above)}
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
    const heading = isZh ? "可选的家用过滤器信息" : "Optional home-filter information";
    const intro = isZh
      ? "供水系统监测比较不能确定某个家庭是否需要过滤器。请先核对供水机构并查看其最新消费者信心报告。如果您自行考虑过滤器，请核实具体的PFAS减少认证，而不是只看营销用语。"
      : "A water-system monitoring comparison cannot determine whether a particular home needs a filter. First confirm the utility and read its current Consumer Confidence Report. If you independently consider a filter, verify a specific PFAS-reduction certification rather than relying on marketing language.";
    return `<aside class="result-action-guide">
      <span class="result-action-kicker">${isZh ? "一般信息" : "General information"}</span>
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
      "UCMR 5 samples were collected at entry points to the distribution system, not at a household faucet. Each value shown is the highest EPA-derived annual average among that water system's sampling locations. Comparison labels do not determine current compliance, household tap concentration, personal exposure, safety, or health risk.",
      `Water systems displayed: ${systems.length}.`
    ];
    const comparisonSystems = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1);
    lines.push(`Water systems with at least one complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff: ${comparisonSystems.length}. Names: ${comparisonSystems.length ? comparisonSystems.map(system => system.ucmr_pws_name).join("; ") : "none"}. A zero count does not mean PFAS was not detected.`);
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
    const deterministicReply = window.PFASAssistantResultTools?.answerBoundaryQuestion(question, currentSystems, currentLang)
      || window.PFASAssistantResultTools?.answerComparisonSystems(question, currentSystems, currentLang);
    if (deterministicReply) {
      appendChat("assistant", deterministicReply);
      chatMessages.push({ role: "assistant", content: deterministicReply });
      trackEvent("assistant_verified_result_question", { associated_systems: currentSystems.length });
      button.disabled = false;
      input.focus();
      return;
    }
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
    try { displayCount("searchCount", await counterRequest("searches")); } catch (error) { console.warn("Search counter unavailable", error); }
  }

  async function incrementSearchCounter() {
    try { displayCount("searchCount", await counterRequest("searches", "increment")); } catch (error) { console.warn("Search counter unavailable", error); }
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
  function toggleLanguage() { currentLang = currentLang === "en" ? "zh" : "en"; applyLanguage(); trackEvent("language_switch", { language: currentLang }); }
  $("languageToggle").addEventListener("click", toggleLanguage);
  $("languageToggle").addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleLanguage(); } });

  applyLanguage();
  initialize();
})();
