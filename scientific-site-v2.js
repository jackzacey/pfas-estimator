(() => {
  "use strict";

  const RELEASE_PATH = "/analysis/exports/ucmr5_final_aug2026_v1";
  const LOOKUP_URL = `${RELEASE_PATH}/website_lookup_compact.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const MONITORING_PERIODS_URL = `${RELEASE_PATH}/website_monitoring_periods.json`;
  const ASSISTANT_URL = "https://pfas-groq-proxy.jackzacey.workers.dev";
  const REQUEST_TIMEOUT_MS = 20000;
  const OUTCOMES = [
    { key: "pfoa", label: "PFOA", fullName: "Perfluorooctanoic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "EPA rounding cutoff: 4.05 ppt", reportingLimit: 4, federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfos", label: "PFOS", fullName: "Perfluorooctane sulfonic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "EPA rounding cutoff: 4.05 ppt", reportingLimit: 4, federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfhxs", label: "PFHxS", fullName: "Perfluorohexane sulfonic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "EPA rounding cutoff: 15 ppt", reportingLimit: 3, federalLevel: 10, comparisonCutoff: 15 },
    { key: "pfna", label: "PFNA", fullName: "Perfluorononanoic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "EPA rounding cutoff: 15 ppt", reportingLimit: 4, federalLevel: 10, comparisonCutoff: 15 },
    { key: "hfpo_da", label: "HFPO-DA", fullName: "GenX chemicals", benchmark: "April 2024 federal level: 10 ppt", cutoff: "EPA rounding cutoff: 15 ppt", reportingLimit: 5, federalLevel: 10, comparisonCutoff: 15 },
    { key: "hi", label: "Hazard Index", labelZh: "危害指数", fullName: "PFAS mixture measure", benchmark: "April 2024 federal level: 1", cutoff: "EPA rounding cutoff: 1.5 with at least 2 detected components", federalLevel: 1, comparisonCutoff: 1.5 },
  ];

  const STATE_NAMES = Object.freeze({
    AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
    CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia",
    HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
    LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota",
    MS: "Mississippi", MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
    NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota",
    OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
    SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia",
    WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming", PR: "Puerto Rico",
    GU: "Guam", AS: "American Samoa", MP: "Northern Mariana Islands", VI: "U.S. Virgin Islands",
  });
  const DEFAULT_STATE_PROGRAM = Object.freeze({
    url: "https://www.epa.gov/DWdata/primacy-agency-drinking-water-data",
  });
  const STATE_PROGRAMS = Object.freeze({
    VT: Object.freeze({ url: "https://dec.vermont.gov/water/drinking-water/water-quality-monitoring/and-polyfluoroalkyl-substances-pfas-drinking-water" }),
    MN: Object.freeze({ url: "https://www.health.mn.gov/communities/environment/water/pfasmap.html" }),
    PA: Object.freeze({ url: "https://www.pa.gov/agencies/dep/programs-and-services/water/bureau-of-safe-drinking-water/public-drinking-water" }),
    MI: Object.freeze({
      url: "https://www.michigan.gov/egle/about/organization/drinking-water-and-environmental-health/noncommunity-water-supply/drinking-water-analytes",
    }),
  });

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
      navLookup: "System lookup", navMap: "Map", navTable: "State table", navStates: "Explore by state", navResearch: "Research snapshot", navMethods: "How it works",
      releaseBadge: "Public drinking-water results",
      currentLanguageLabel: "Current Language:",
      heroTitle: "Check for PFAS in your water system",
      featuresSummary: "Features & resource listings",
      justinCredit: "Justin Ting supported marketing and outreach for PFAS Estimator.",
      featureTribal: "PFAS Estimator is included in Tribal Climate Health’s Resources Clearinghouse. Look for the “PFAS Estimator” entry, or use the PFAS topic filter.",
      featureEwg: "EWG+HS profiles Jack Zhang’s work building PFAS Estimator. Find Jack’s profile in the student features on the EWG+HS page.",
      featureNewsletter: "PFAS Project Lab featured the tool in its October 2026 newsletter. Look for the “PFAS Estimator Tool” section.",
      featurePha: "PFAS Estimator is included in Planetary Health Alliance’s resource library. Find the entry under “Chemical Pollution Resources” on its Chemical Pollution page.",
      featuresPermalink: "Link to this section",
      featureNewTab: " (opens in a new tab)",
      heroSubtitle: "Per- and polyfluoroalkyl substances (PFAS) are chemical pollutants. Enter your ZIP code to find available test results for public water systems in your area.",
      truthNote: '<strong>Find your water provider.</strong> A ZIP code may list several systems. Match the name to your water bill. Private wells are not included. <a href="https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state" target="_blank" rel="noopener noreferrer">Use a private well? Find testing guidance →</a>',
      printButton: "Print or save this water-system result",
      chatTitle: "PFAS Results Assistant", chatSubtitle: "Optional artificial intelligence (AI) help — not a water-safety assessment",
      expandChat: "Show full conversation", collapseChat: "Collapse conversation",
      suggestConcern: "What can this result tell me?", suggestUtility: "How do I confirm my utility?", suggestFilter: "Where were samples collected?", suggestHealth: "Where are current results?",
      askButton: "Ask", chatDisclaimer: "AI answers may be wrong. Verify them with official records; do not use them to decide whether water is safe or to make medical decisions. Do not share personal or medical information. The ZIP results do not use AI.", chatLearnMore: "How it works",
      quickExplanation: "Quick explanation", closeExplanation: "Close",
      faqResultTitle: "What this result can tell you",
      faqResultBody: "It shows what federal monitoring found in a public water system during the dates listed. Confirm the provider on your water bill first. These samples cannot tell us the PFAS level at your faucet, your personal exposure or health risk, or whether the water meets current drinking-water rules.",
      faqUtilityTitle: "How to confirm your water utility",
      faqUtilityBody: "Match the complete water-system name on this page to the name on your water bill. If they do not match, contact your local water department or city. A ZIP code can contain several systems and is only used here to find possible matches.",
      faqSamplingTitle: "Where the samples were collected",
      faqSamplingBody: "Federal monitoring samples were collected at points where treated water enters the distribution system, not at household faucets. The sampling period shown on each system card tells you when the displayed monitoring occurred.",
      faqCurrentTitle: "Where to find current official information",
      faqCurrentBody: "The data here include results in the final federal monitoring dataset, released August 2026. State or utility reports may contain more recent monitoring. Ask your water provider about recent PFAS tests and treatment, and check its annual water-quality report, called a Consumer Confidence Report.",
      faqMore: "Read the full explanation →", faqCcrLink: "Find your water-quality report →", faqCurrentLink: "Check federal monitoring records →",
      searchCounter: "ZIP searches",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing federal monitoring data.", findSystems: "Find results",
      verifiedRelease: "Final federal monitoring dataset", monitoredSystems: "water systems", zipAssociations: "ZIP associations", resultsThrough: "Final federal dataset released August 2026",
      loadFailure: "The verified data release could not be loaded. Please use the federal drinking-water Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `We could not match a water system to ZIP ${zip}`,
      noAssociationContext: "A missing result does not mean your water is free of PFAS. Our data may not include your provider or its link to this ZIP code.",
      noAssociationBody: "Find your provider’s name on your water bill, then ask it for recent PFAS results or search the federal Data Finder by name. If you use a private well, ask your state or local health or environmental agency about testing. Private wells are not included here.",
      openDataFinder: "Open the federal drinking-water Data Finder →",
      associatedTitle: (count, zip) => `${count} possible water system${count === 1 ? "" : "s"} for ZIP ${zip}`,
      associatedContext: (aboveCount, totalCount) => totalCount === 1
        ? "Check that this provider’s name matches your water bill. A ZIP match alone cannot confirm who supplies your home."
        : "Find the provider named on your water bill below. These systems have separate results; a finding at one may not apply to your provider.",
      communitySystem: "Community water system", publicSystem: "Public water system", residentialNotUsed: "residential Census context is not used for this system",
      completeUnavailable: "Not enough required samples for a yearly comparison", atLeastOne: "Above an EPA comparison level", detectedBelow: "Detected below all study benchmarks", belowReporting: "Below EPA reporting levels", noLocationMeets: "No yearly average was above an EPA comparison level",
      populationServed: "Population served", source: "Primary source", ownership: "Ownership", samplingLocations: "Sampling locations", monitoringPeriod: "Sampling period", serviceBoundary: "Service boundary", sdwisStatus: "Federal water-system record status",
      notReported: "Not reported", notAvailable: "Not available", unnamed: "Unnamed public water system",
      measure: "PFAS", highestAverage: "Highest yearly average", benchmarkHeading: "EPA-based study benchmark", comparisonHeading: "Result",
      noCompleteAverage: "Not enough required samples", meets: "Above EPA comparison level", detectedDoesNotMeet: "Detected below study benchmark", belowReportingLevel: "Below EPA reporting level", doesNotMeet: "Below study benchmark",
      demographicSummary: "Service-area demographic context used in the research analysis", demographicNote: "Ecological estimates for the modeled service area; these do not describe any individual customer.",
      hispanic: "Hispanic", black: "non-Hispanic Black", aian: "non-Hispanic American Indian or Alaska Native", poverty: "below poverty", rural: "rural",
      resultBoundaryTitle: "How to read the numbers",
      resultBoundaryBody: "The dates below show when EPA monitored each system. EPA sampled where treated water enters the distribution system, not at household faucets. If a result is below an EPA reporting level, it does not mean the concentration was zero or that the compound was absent. These results cannot identify the water system for a specific home or determine current legal compliance, household tap-water levels, personal exposure, or health risk.",
      keyTerms: "Key terms on this page",
      completeMonitoringTerm: "Complete monitoring",
      completeMonitoringDefinition: "For at least one sampling location, the water system had every required sample needed to calculate a yearly average. It does not mean every location or home was tested.",
      studyBenchmarkTerm: "EPA-based study benchmark",
      studyBenchmarkDefinition: "This comparison follows EPA’s final UCMR 5 rounding rules for the April 2024 federal levels. For example, an unrounded PFOA or PFOS average of 4.05 ppt counts as above the 4 ppt comparison level. It is not a current federal or state standard, and it does not show whether a water system complies with the law.",
      reportingLevelTerm: "EPA reporting level",
      reportingLevelDefinition: "The lowest concentration that UCMR 5 reports as a number for that compound. A result below this level is not a measured zero and does not prove that the compound was absent.",
      welcome: "Ask about PFAS, a result you see, or where to find recent tests.",
      contextReadyAbove: "Your results are shown above. Ask me to explain a chemical or comparison, or help you find recent tests. If several providers are listed, include your provider’s name.",
      contextReadyBelow: "Your results are shown above. Ask me what was found or what a missing or below-limit result means. If several providers are listed, include your provider’s name.",
      contextReadyNone: "I could not find a water system for that ZIP. Ask me how to confirm your utility or check a private well.",
      thinking: "Reviewing your question…",
      rateError: "The assistant has reached its short-term request limit. The lookup remains available; please try the chat again in about a minute.",
      timeoutError: "The assistant took too long to respond. The lookup remains available; please try the chat again.",
      unavailableError: "The assistant is temporarily unavailable. The verified lookup results above are unaffected.",
      genericError: "The assistant could not complete that request. The verified lookup results above are unaffected.",
    },
    zh: {
      navLookup: "供水系统查询", navMap: "地图", navTable: "州级表格", navStates: "按州浏览", navResearch: "研究摘要", navMethods: "方法与局限",
      releaseBadge: "公共饮用水检测结果",
      currentLanguageLabel: "当前语言：",
      heroTitle: "查查您的供水系统是否检出PFAS",
      featuresSummary: "专题介绍与资源收录",
      justinCredit: "Justin Ting 为 PFAS Estimator 的宣传推广和外联工作提供了支持。",
      featureTribal: "PFAS Estimator 已收录于 Tribal Climate Health 的 Resources Clearinghouse。请查找“PFAS Estimator”条目，或使用 PFAS 主题筛选。",
      featureEwg: "EWG+HS 介绍了 Jack Zhang 开发 PFAS Estimator 的工作。请在 EWG+HS 页面的学生介绍中查找 Jack 的个人介绍。",
      featureNewsletter: "PFAS Project Lab 在2026年10月通讯中介绍了本工具。请查找“PFAS Estimator Tool”小节。",
      featurePha: "PFAS Estimator 已收录于 Planetary Health Alliance 的资源库。请在 Chemical Pollution 页面的“Chemical Pollution Resources”部分查找本工具。",
      featuresPermalink: "本节链接",
      featureNewTab: "（在新标签页打开）",
      heroSubtitle: "全氟和多氟烷基物质（PFAS）是一类化学污染物。输入邮政编码，查找您所在地区公共供水系统的检测结果。",
      truthNote: '<strong>先确认供水机构。</strong>一个邮政编码可能列出多个系统。请与水费账单上的名称核对。这里不包括私人水井。<a href="https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state" target="_blank" rel="noopener noreferrer">使用私人水井？查找检测指导 →</a>',
      printButton: "打印或保存此供水系统结果",
      chatTitle: "PFAS结果助手", chatSubtitle: "可选人工智能帮助——不是饮用水安全评估",
      expandChat: "展开完整对话", collapseChat: "收起对话",
      suggestConcern: "这项结果能说明什么？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "样本在哪里采集？", suggestHealth: "在哪里查看最新结果？",
      askButton: "提问", chatDisclaimer: "AI可能出错。请用官方记录核实回答，不要用它判断水质是否安全或作医疗决定。请勿分享个人或医疗信息。邮政编码结果不使用AI。", chatLearnMore: "工作原理",
      quickExplanation: "简要说明", closeExplanation: "关闭",
      faqResultTitle: "这项结果能说明什么",
      faqResultBody: "它显示所列公共供水系统的冻结EPA监测结果及采样时间。它不能确认该系统是否为您家供水，也不能确定当前合规情况、家庭水龙头浓度、个人暴露或健康风险。",
      faqUtilityTitle: "如何确认您的供水机构",
      faqUtilityBody: "请将本页完整的供水系统名称与水费账单上的名称核对。如果不一致，请联系当地供水部门或城市。一个邮政编码可能包含多个系统，此处仅用邮政编码查找可能的匹配。",
      faqSamplingTitle: "样本在哪里采集",
      faqSamplingBody: "联邦监测样本采自处理后的水进入配水系统的位置，而不是家庭水龙头。每张系统卡上的采样期说明所显示监测的时间。",
      faqCurrentTitle: "在哪里查找最新官方信息",
      faqCurrentBody: "本网站使用2026年8月发布的最终联邦监测数据。州级或供水机构的报告可能包含更新的检测结果。请向供水机构询问近期检测及处理信息，并查看其年度水质报告。",
      faqMore: "查看完整说明 →", faqCcrLink: "查找消费者信心报告 →", faqCurrentLink: "打开EPA数据查找器 →",
      searchCounter: "次邮政编码查询",
      loadingRelease: "正在加载已验证版本…", releaseUnavailable: "版本不可用", dataUnavailable: "数据不可用", loadingData: "正在加载数据…",
      preparing: "正在准备冻结的科学数据版本。", findSystems: "查询我的地区",
      verifiedRelease: "最终联邦监测数据", monitoredSystems: "个供水系统", zipAssociations: "个邮政编码", resultsThrough: "2026年8月发布的最终联邦数据",
      loadFailure: "无法加载已验证的数据版本。问题解决前，请使用EPA UCMR 5数据查找器。",
      invalidZipTitle: "请输入有效的5位邮政编码", invalidZipContext: "邮政编码必须恰好包含五位数字。",
      noAssociationTitle: zip => `未找到邮政编码 ${zip} 的供水系统`,
      noAssociationContext: "这并不表示水中不含PFAS。该邮政编码可能由UCMR文件未关联的系统、私人水井或其他供水方服务。",
      noAssociationBody: "请使用水费账单或当地供水机构网站确认供水方，然后查看消费者信心报告或按系统名称搜索EPA数据。如果住宅使用私人水井，请向州或当地卫生或环境部门咨询检测指南；私人水井不在此数据集中。",
      openDataFinder: "打开联邦饮用水数据查找器 →",
      associatedTitle: (count, zip) => `邮政编码 ${zip} 列出了 ${count} 个供水系统`,
      associatedContext: (aboveCount, totalCount) => totalCount === 1 ? "请将供水机构名称与水费账单核对。仅凭邮政编码不能确认谁为您家供水。" : "请在下方找到水费账单上的供水机构。每个系统的结果各不相同，其他系统的结果可能不适用于您的供水机构。",
      communitySystem: "社区供水系统", publicSystem: "公共供水系统", residentialNotUsed: "此系统不使用居民人口普查背景",
      completeUnavailable: "规定样本不足，无法进行年度比较", atLeastOne: "高于EPA比较水平", detectedBelow: "已检出，但低于所有研究基准", belowReporting: "低于EPA报告限值", noLocationMeets: "没有年度平均值高于EPA比较水平",
      populationServed: "服务人口", source: "主要水源", ownership: "所有权", samplingLocations: "采样点", monitoringPeriod: "采样期", serviceBoundary: "服务区边界", sdwisStatus: "SDWIS状态",
      notReported: "未报告", notAvailable: "不可用", unnamed: "未命名公共供水系统",
      measure: "指标", highestAverage: "最高年度平均值", benchmarkHeading: "基于EPA的研究基准", comparisonHeading: "结果",
      noCompleteAverage: "规定样本不足", meets: "高于EPA比较水平", detectedDoesNotMeet: "已检出；低于研究基准", belowReportingLevel: "低于EPA报告限值", doesNotMeet: "低于研究基准",
      demographicSummary: "研究分析使用的服务区人口背景", demographicNote: "这是模型服务区的生态估计，不描述任何个人客户。",
      hispanic: "西班牙裔", black: "非西班牙裔黑人", aian: "非西班牙裔美洲印第安人/阿拉斯加原住民", poverty: "低于贫困线", rural: "农村",
      resultBoundaryTitle: "使用结果前请先阅读",
      resultBoundaryBody: "下方日期说明EPA何时监测每个供水系统。样本采自处理后的水进入配水系统的位置，而不是家庭水龙头。低于EPA报告限值不等于浓度为零，也不能证明该化合物不存在。这些结果不能确认某个住宅的供水系统，也不能确定当前法律合规情况、家庭水龙头浓度、个人暴露或健康风险。",
      keyTerms: "本页重要术语",
      completeMonitoringTerm: "完整监测",
      completeMonitoringDefinition: "该供水系统至少一个采样点具有计算年度平均值所需的全部规定样本。这不表示每个采样点或每个家庭都接受了检测。",
      studyBenchmarkTerm: "基于EPA的研究基准",
      studyBenchmarkDefinition: "本研究使用未舍入阈值，以重现EPA基于2024年4月联邦水平作出的最终UCMR 5技术援助分类。该基准在本研究中保持固定。它不是现行的联邦或州标准，也不能说明供水系统是否符合法律要求。",
      reportingLevelTerm: "EPA报告限值",
      reportingLevelDefinition: "UCMR 5将该化合物作为数值报告的最低浓度。低于此值不等于测得为零，也不能证明该化合物不存在。",
      welcome: "您可以询问如何理解监测结果、确认供水系统、了解采样位置或查找最新官方信息。",
      contextReadyAbove: "一项或多项年度平均值高于EPA比较水平。我可以解释这意味着什么、如何确认供水机构或在哪里查找最新信息。",
      contextReadyBelow: "结果已显示在上方。缺失的比较不能视为低于基准；我可以解释检测结果及其局限。",
      contextReadyNone: "没有找到该邮政编码的受监测系统关联。我可以解释这种缺失意味着什么以及不意味着什么。",
      thinking: "正在查看显示的供水系统背景…",
      rateError: "助手已达到短期请求限制。查询功能仍可使用；请约一分钟后重试。",
      timeoutError: "助手响应时间过长。查询功能仍可使用；请重试。",
      unavailableError: "助手暂时不可用。上方已验证的查询结果不受影响。",
      genericError: "助手无法完成该请求。上方已验证的查询结果不受影响。",
    }
  };

  const homeLanguage = typeof PFASHomeLanguage === "undefined" ? null : PFASHomeLanguage;
  Object.assign(COPY.en, {
    skipLookup:"Skip to lookup",zipLabel:"U.S. ZIP code",askLabel:"Ask a PFAS question",
    printTitle:"PFAS water-system results",printSource:"EPA UCMR 5 samples (2023–2025)",
    printNote:'Historical public-water-system results. Confirm the provider on your water bill. “Below” a reporting limit does not mean zero.',
    printFooter:"EPA UCMR 5 final dataset, released August 2026. These system results do not determine current compliance, household tap-water levels, personal exposure, or health risk. Methods: pfasestimator.org/methodology/",
    navLookup:"Find your provider",navMethods:"Methods & limitations",
    heroTitle:"Find PFAS and other chemicals in your water",
    heroSubtitle:"Search by ZIP code or provider to explore historical drinking-water test results.",
    truthNote:'<strong>Confirm your provider.</strong> Match the name to your water bill. Private wells are not included. <a href="https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state" target="_blank" rel="noopener noreferrer">Private-well guidance →</a>',
    aboutTitle:"About PFAS Estimator",aboutBody:"Built by Jack Zhang to make public drinking-water results easier to find and understand. Joshua Tamayo-Sarver, MD, PhD, provided early feedback on clinical framing and limitations.",
    reviewStatus:"Public data and code; internal checks completed. Independent reproduction and peer review are not yet complete.",
    methodsLink:"Methods and limitations →",archiveLink:"Archived research data and code →",contactLink:"Contact Jack",
    footerNote:"Independent education tool. Historical results, not a test of your home’s water.",
    chatDisclosure:"Questions about PFAS?",chatSubtitle:"Optional help with artificial intelligence",chatDisclaimer:"AI can make mistakes. Verify answers with official sources. Do not share personal or medical information.",
    noAssociationBody:"Search above by provider name or system ID, or ask your provider for recent results."
  });
  Object.assign(COPY.zh, {
    skipLookup:"跳至查询",zipLabel:"美国邮政编码",askLabel:"询问PFAS相关问题",
    printTitle:"PFAS供水系统结果",printSource:"EPA UCMR 5样本（2023–2025）",
    printNote:"历史公共供水系统结果。请与水费账单核对供水机构。低于报告限值不代表为零。",
    printFooter:"EPA UCMR 5最终数据集，2026年8月发布。系统结果不能确定当前合规性、家庭水龙头浓度、个人暴露或健康风险。方法：pfasestimator.org/methodology/",
    noAssociationBody:"请在上方按供水机构名称或系统编号搜索，或向供水机构查询最新结果。",
    heroTitle:"查找饮用水中的PFAS及其他化学物质",heroSubtitle:"按邮编或供水机构查询历史饮用水检测结果。",
    aboutTitle:"关于PFAS Estimator",aboutBody:"Jack Zhang创建本工具，帮助公众查找并理解饮用水检测结果。Joshua Tamayo-Sarver医学博士、哲学博士提供了早期临床表述与局限方面的建议。",
    reviewStatus:"数据和代码公开；已完成内部检查，尚未完成独立复现或同行评审。",
    methodsLink:"方法与局限 →",archiveLink:"归档研究数据和代码 →",contactLink:"联系Jack",footerNote:"独立教育工具。历史结果并非您家的水质检测。",chatDisclosure:"有PFAS相关问题？",chatSubtitle:"可选人工智能帮助",chatDisclaimer:"人工智能可能出错。请用官方来源核实，不要分享个人或医疗信息。"
  });
  COPY.es = {...COPY.en, ...(homeLanguage?.copy || {})};
  Object.assign(COPY.es, {aboutTitle:"Acerca de PFAS Estimator",aboutBody:"Jack Zhang creó esta herramienta para facilitar la búsqueda y comprensión de resultados de agua potable. Joshua Tamayo-Sarver, MD, PhD, aportó comentarios iniciales sobre el enfoque clínico y sus limitaciones.",reviewStatus:"Datos y código públicos; verificaciones internas completas. La reproducción independiente y la revisión por pares aún no están completas.",methodsLink:"Métodos y limitaciones →",archiveLink:"Datos y código de investigación archivados →",contactLink:"Contactar a Jack",footerNote:"Herramienta educativa independiente. Resultados históricos, no una prueba del agua de su hogar.",chatDisclosure:"¿Tiene preguntas sobre PFAS?"});

  const siteLanguages = typeof SiteLanguages === "undefined" ? null : SiteLanguages;
  siteLanguages?.setSpanishTranslator(homeLanguage?.translate);
  if(siteLanguages)for(const lang of ["hi","ar"])COPY[lang]=siteLanguages.copy(lang,COPY.en);
  let languageMenu = null;
  let searchMode = "zip";
  const searchValues = {zip:"",provider:"",id:""};
  let currentLang = "en";
  let release = null;
  let metadata = null;
  let systemsById = new Map();
  let monitoringById = new Map();
  let evidenceById = new Map();
  let providerLinks = {};
  let currentContext = "";
  let currentSystems = [];
  let chatMessages = [];
  let lastLookupZip = null;
  let lastSystemId = null;
  let activeFaqKey = null;
  let chatGeneration = 0;
  let waterMode = "pfas";
  let waterGeneration = 0;
  let providerSearchGeneration = 0;

  const $ = id => document.getElementById(id);
  const text = key => COPY[currentLang][key];
  const choose = (en,zh,es) => currentLang === "zh" ? zh : currentLang === "es" ? es : siteLanguages?.translate(en,currentLang) || en;
  const localizeMarkup = html => currentLang === "es" && homeLanguage ? homeLanguage.html(html) : siteLanguages?.html(html,currentLang) || html;
  function localizeHomeDocument() { if(typeof document === "undefined")return;if(siteLanguages)siteLanguages.dom(document.body,currentLang);else if(currentLang === "es")homeLanguage?.dom(document.body); }
  function replaceLookupUrl(url) {
    const parts = url.split('#');
    if (currentLang !== 'en') parts[0] += `${parts[0].includes('?')?'&':'?'}lang=${currentLang}`;
    history.replaceState({}, "", parts.join('#'));
  }

  function escapeHtml(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function applyLanguage() {
    document.documentElement.lang = currentLang === "zh" ? "zh-Hans" : currentLang;
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    languageMenu?.set(currentLang);
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const value = text(element.dataset.i18n);
      if (typeof value === "string") element.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach(element => {
      const value = text(element.dataset.i18nHtml);
      if (typeof value === "string") element.innerHTML = value;
    });
    if(typeof document.querySelector === "function"){const composer=document.querySelector(".ai-input-row");if(composer)composer.hidden=["hi","ar"].includes(currentLang);}
    if ($("zipInput")) { $("zipInput").placeholder = choose("Enter a 5-digit ZIP code","输入5位邮政编码","Código postal de 5 dígitos"); $("zipInput").setAttribute('aria-label',$("zipInput").placeholder); }
    if ($("aiInput")) { $("aiInput").placeholder = choose("Ask about PFAS or the displayed systems…","询问PFAS或显示的供水系统…","Pregunte sobre PFAS o los resultados…"); $("aiInput").setAttribute('aria-label',$("aiInput").placeholder); }
    if ($("faqDialogClose")) {
      $("faqDialogClose").textContent = text("closeExplanation");
      $("faqDialogClose").setAttribute("aria-label", text("closeExplanation"));
    }
    if (typeof document.querySelector === 'function') {
      document.querySelector('.home-top-nav')?.setAttribute('aria-label',choose('Main navigation','主导航','Navegación principal'));
      document.querySelector('.home-lookup-panel')?.setAttribute('aria-label',choose('Drinking-water lookup','饮用水查询','Búsqueda de agua potable'));
    }
    if ($('aiMessages')) $('aiMessages').setAttribute('aria-label',choose('Conversation','对话','Conversación'));
    if ($('chatPanel')) $('chatPanel').setAttribute('aria-label',choose('PFAS questions','PFAS相关问题','Preguntas sobre PFAS'));
    if ($('aiSuggestions')) $('aiSuggestions').setAttribute('aria-label',choose('Quick explanations','简短说明','Explicaciones breves'));
    if ($('pfasModeLabel')) $('pfasModeLabel').title=choose('Per- and polyfluoroalkyl substances','全氟和多氟烷基物质','Sustancias perfluoroalquiladas y polifluoroalquiladas');
    providerSearchGeneration++;
    if ($('waterProviderMatches')) $('waterProviderMatches').innerHTML='';
    if (activeFaqKey) populateFaq(activeFaqKey);
    if (release) updateReleaseLabels();
    updateWaterModeLabels();
    if (lastSystemId && release) renderSelectedSystem(lastSystemId);
    else if (lastLookupZip && release) renderLookup(lastLookupZip, false);
    else resetChat(text("welcome"));
    if(searchMode==="id"&&lastSystemId)$("zipInput").value=lastSystemId;
    else if(searchMode==="provider")$("zipInput").value=searchValues.provider;
    localizeHomeDocument();
  }

  function formatInteger(value) {
    if (value === null || value === undefined || value === "") return text("notReported");
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US") : text("notReported");
  }

  const FAQ_CONFIG = {
    result: { title: "faqResultTitle", body: "faqResultBody", href: "/methodology/#overview", link: "faqMore" },
    utility: { title: "faqUtilityTitle", body: "faqUtilityBody", href: "https://www.epa.gov/ccr", link: "faqCcrLink", external: true },
    sampling: { title: "faqSamplingTitle", body: "faqSamplingBody", href: "/methodology/#outcomes", link: "faqMore" },
    current: { title: "faqCurrentTitle", body: "faqCurrentBody", href: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder", link: "faqCurrentLink", external: true },
  };

  function populateFaq(key) {
    const config = FAQ_CONFIG[key];
    if (!config) return;
    activeFaqKey = key;
    $("faqDialogTitle").textContent = text(config.title);
    $("faqDialogBody").textContent = text(config.body);
    $("faqDialogLink").textContent = text(config.link);
    $("faqDialogLink").href = config.href;
    if (config.external) {
      $("faqDialogLink").target = "_blank";
      $("faqDialogLink").rel = "noopener noreferrer";
    } else {
      $("faqDialogLink").removeAttribute("target");
      $("faqDialogLink").removeAttribute("rel");
    }
  }

  function openFaq(key) {
    const dialog = $("faqDialog");
    if (!dialog || !FAQ_CONFIG[key]) return;
    populateFaq(key);
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    trackEvent("open_quick_explanation", { topic: key });
  }

  function closeFaq() {
    const dialog = $("faqDialog");
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
    activeFaqKey = null;
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
    if (isHazardIndex) {
      // EPA publishes small nonzero indices too. A fixed three-decimal
      // display can change 0.0008 into 0.001 or erase 0.0004 entirely.
      if (numeric > 0 && numeric < 0.001) {
        return numeric.toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US", { useGrouping: false, maximumSignificantDigits: 15 });
      }
      return numeric.toFixed(3);
    }
    return `${(numeric * 1000).toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 })} ppt`;
  }

  function formatOutcomeValue(outcome, status) {
    if (!status.full) return text("notAvailable");
    if (status.belowReporting && outcome.key !== "hi") {
      return choose(`Below ${outcome.reportingLimit} ppt`,`低于 ${outcome.reportingLimit} ppt`,`Menos de ${outcome.reportingLimit} ppt`);
    }
    if (status.belowReporting && outcome.key === "hi") {
      return choose("0.000 (calculated)","0.000（计算值）","0.000 (calculado)");
    }
    return formatAverage(status.maximum, outcome.key === "hi");
  }

  function formatMonitoringPeriod(system) {
    const period = monitoringById.get(String(system.pwsid));
    if (!period) return text("notReported");
    const locale = siteLanguages?.locale(currentLang) || (currentLang === "zh" ? "zh-CN" : currentLang === "es" ? "es-US" : "en-US");
    const start = new Date(`${period.monitoring_start}T00:00:00Z`);
    const end = new Date(`${period.monitoring_end}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return period.monitoring_years || text("notReported");
    if (period.monitoring_start === period.monitoring_end) {
      return start.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    }
    if (start.getUTCFullYear() === end.getUTCFullYear()) {
      const startText = start.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
      const endText = end.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
      return currentLang === "zh" ? `${startText}至${endText}` : `${startText}${currentLang === "es"?" a ":currentLang === "hi"?" से ":currentLang === "ar"?" إلى ":" to "}${endText}`;
    }
    const startText = start.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    const endText = end.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    return currentLang === "zh" ? `${startText}至${endText}` : `${startText}${currentLang === "es"?" a ":currentLang === "hi"?" से ":currentLang === "ar"?" إلى ":" to "}${endText}`;
  }

  // Apply only explicit, source-backed exclusions. State mismatch alone is not
  // grounds to remove a provider: some systems legitimately cross state lines.
  function applyZipReviews(payload, reviews) {
    if (reviews.release_id !== payload.release_id || !Array.isArray(reviews.reviews)) {
      throw new Error("ZIP review release does not match lookup data");
    }
    const links = Object.fromEntries(Object.entries(payload.zip_to_pwsids).map(([zip, ids]) => [zip, [...ids]]));
    const correctedZips = new Set(payload.corrected_zips || []);
    for (const review of reviews.reviews) {
      if (!review.pwsid || !Array.isArray(review.excluded_zips) || !review.sources?.length) {
        throw new Error("Invalid ZIP review record");
      }
      for (const zip of review.excluded_zips) {
        if (!/^\d{5}$/.test(zip)) throw new Error("Invalid reviewed ZIP");
        if (!links[zip]?.includes(review.pwsid)) continue;
        links[zip] = links[zip].filter(id => id !== review.pwsid);
        if (!links[zip].length) delete links[zip];
        correctedZips.add(zip);
      }
    }
    if (!reviews.pending_associations || typeof reviews.pending_associations !== "object" || Array.isArray(reviews.pending_associations)) {
      throw new Error("Missing pending ZIP review inventory");
    }
    const pending = reviews.pending_associations;
    for (const [zip, ids] of Object.entries(pending)) {
      if (!/^\d{5}$/.test(zip) || !Array.isArray(ids) || ids.some(id => !links[zip]?.includes(id))) {
        throw new Error("Invalid pending ZIP association");
      }
    }
    const roles = reviews.association_roles || {};
    if (typeof roles !== "object" || Array.isArray(roles)) throw new Error("Invalid provider role inventory");
    for (const [zip, entries] of Object.entries(roles)) {
      if (!/^\d{5}$/.test(zip) || !entries || typeof entries !== "object" || Array.isArray(entries)) throw new Error("Invalid provider role ZIP");
      for (const [id, entry] of Object.entries(entries)) {
        if (!links[zip]?.includes(id) || pending[zip]?.includes(id) ||
            !entry || !["wholesale", "mixed"].includes(entry.role) || !entry.sources?.length) {
          throw new Error("Invalid provider role association");
        }
      }
    }
    return { ...payload, zip_to_pwsids: links, corrected_zips: [...correctedZips], pending_associations: pending, association_roles: roles };
  }

  function hydrateRows(payload) {
    return payload.systems.map(values => Object.fromEntries(payload.columns.map((column, index) => [column, values[index]])));
  }

  function hydrateMonitoringRows(payload) {
    return payload.systems.map(values => Object.fromEntries(payload.columns.map((column, index) => [column, values[index]])));
  }

  function updateReleaseLabels() {
    $("releaseStatus").textContent = `${text("verifiedRelease")} · ${release.release_id}`;
    $("lookupDataNote").textContent = `${release.systems.length.toLocaleString()} ${text("monitoredSystems")} · ${Object.keys(release.zip_to_pwsids).length.toLocaleString()} ${text("zipAssociations")} · ${text("resultsThrough")}`;
    updateSearchControls();
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
    const numeric = Number(maximum);
    const belowReporting = full && Number.isFinite(numeric) && numeric === 0;
    if (!full) return { label: text("noCompleteAverage"), className: "incomplete", maximum, full, above, belowReporting: false };
    if (above) return { label: text("meets"), className: "above", maximum, full, above, belowReporting: false };
    if (belowReporting) return { label: text("belowReportingLevel"), className: "below", maximum, full, above, belowReporting: true };
    return { label: text("detectedDoesNotMeet"), className: "below", maximum, full, above, belowReporting: false };
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
    const value = formatAverage(status.maximum, false).replace("ppt", isZh ? "万亿分之一" : "parts per trillion");
    const statusCopy = status.className === "above"
      ? (isZh ? "最高年度平均值高于EPA比较水平。" : "The highest yearly average was above the April 2024 EPA comparison level.")
      : status.className === "below"
        ? (isZh ? "最高年度平均值未高于EPA比较水平。" : "The highest yearly average was not above the April 2024 EPA comparison level.")
        : (isZh ? "规定样本不足，暂时不能进行年度比较。" : "There are not enough required samples for a yearly comparison.");
    const comparisonRatio = (valuePpt / outcome.comparisonCutoff) * 100;
    const gaugeFillPct = Math.min(comparisonRatio, 150) / 150 * 100;
    const ratioLabel = isZh ? "年度平均值与研究比较水平" : "Yearly average compared with the study level";
    const benchmarkCopy = isZh
      ? `EPA舍入截点：${outcome.comparisonCutoff} 万亿分之一`
      : `EPA rounding cutoff: ${outcome.comparisonCutoff} parts per trillion`;
    const aboutHeading = isZh ? `${outcome.label}是什么` : `What ${outcome.label} is`;
    const healthHeading = isZh ? "健康研究发现" : "What health research says";
    const evidenceHeading = isZh ? "证据说明：" : "Evidence note:";
    const pollutantCategory = isZh ? "PFAS化学污染物：" : "PFAS chemical pollutant:";
    const riskBoundary = isZh
      ? "这些证据描述的是充分暴露后的潜在危害。该监测结果不测量任何个人的暴露，也不能预测疾病。"
      : "This evidence describes potential hazards after sufficient exposure. The monitoring result does not measure any person’s exposure or predict illness.";

    return `<article class="detail-box compound-education-card ${status.className}">
      <header class="compound-education-head">
        <div><h4 class="compound-pollutant-title"><span class="compound-pollutant-category">${pollutantCategory}</span><span class="compound-pollutant-name">${escapeHtml(outcome.label)}</span></h4></div>
      </header>
      <div class="compound-measurement ${status.className}">
        <div class="compound-measurement-status">${escapeHtml(outcome.label)} ${isZh ? "在该系统的样本中被检出。" : "was found in this system’s samples."}</div>
        <p class="compound-incomplete-note">${statusCopy}</p>
        <div class="compound-measurement-value"><span>${isZh ? "最高年度平均值：" : "Highest yearly average:"}</span><strong>${escapeHtml(value)}</strong></div>
        <p class="compound-incomplete-note">${escapeHtml(benchmarkCopy)}${isZh ? "。这是固定的研究比较，不是现行标准，也不是安全判定。" : ". A fixed research comparison, not a current standard or a safety verdict."}</p>
        ${status.className === "incomplete" ? "" : `<div class="epa-bar"><div class="epa-bar-label">${escapeHtml(ratioLabel)}</div><div class="bar-track"><div class="bar-fill ${status.className === "above" ? "above" : ""}" style="width:${gaugeFillPct.toFixed(2)}%"></div><div class="bar-tick"></div></div></div>`}
      </div>
      <details class="compound-results-details">
        <summary>${isZh ? `${outcome.label}的背景、健康研究与来源` : `${outcome.label}: background, health research and sources`}</summary>
        <p class="compound-education-name">${escapeHtml(outcome.fullName)}</p>
        <div class="science-box compound-about"><h3>${aboutHeading}</h3><p>${escapeHtml(guidance.about[currentLang])}</p></div>
        <div class="science-box compound-health"><h3>${healthHeading}</h3><p>${escapeHtml(guidance.health[currentLang])}</p></div>
        <div class="compound-evidence-note"><strong>${evidenceHeading}</strong> ${escapeHtml(guidance.evidence[currentLang])} ${escapeHtml(riskBoundary)}</div>
        ${renderCompoundReferences(guidance)}
      </details>
    </article>`;
  }

  // This is a record-age notice, not a health or regulatory threshold.
  function samplingAgeNotice(system, now = new Date()) {
    const endDate = monitoringById.get(String(system.pwsid))?.monitoring_end;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate || "")) return currentLang === "zh" ? "采样日期未报告；请向供水机构查询最新检测。" : "Sample dates are not reported; ask your provider for current tests.";
    const end = new Date(`${endDate}T00:00:00Z`);
    if (!Number.isFinite(end.getTime()) || end.toISOString().slice(0, 10) !== endDate) return currentLang === "zh" ? "采样日期无法核实；请向供水机构查询。" : "Sample dates could not be verified; check with your provider.";
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    if (end > today) return currentLang === "zh" ? "采样日期无法核实；请向供水机构查询。" : "Sample dates could not be verified; check with your provider.";
    const anniversary = new Date(end);
    anniversary.setUTCFullYear(anniversary.getUTCFullYear() + 1);
    return today > anniversary
      ? (currentLang === "zh" ? "此记录中最新的样本已超过一年。这是历史监测，不是今天的水质检测。" : "The newest sample in this record is over a year old. This is historical monitoring, not a test of today's water.")
      : (currentLang === "zh" ? "这是所列日期的历史监测，不是今天的水质检测。" : "These are historical results from the dates shown, not a test of today's water.");
  }

  function renderPrivateWellGuidance(systems = []) {
    const isZh = currentLang === "zh";
    const maine = systems.some(system => system.sdwis_state_code === "ME");
    return `<p class="water-system-match">${isZh ? "使用私人水井？本工具不包含您的井水。" : "Use a private well? This lookup does not include your well water."} <a href="https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state" target="_blank" rel="noopener noreferrer">${isZh ? "查找您所在州的井水检测指导 →" : "Find your state's well-testing guidance →"}</a>${maine ? ` · <a href="https://www.maine.gov/dhhs/mecdc/healthy-living/health-and-safety/pfas-in-maine/pfas-and-well-water" target="_blank" rel="noopener noreferrer">${isZh ? "缅因州CDC：PFAS与井水 →" : "Maine CDC: PFAS and well water →"}</a>` : ""}</p>`;
  }

  function renderProviderHelp(system) {
    const isZh = currentLang === "zh";
    const purchased = /purchased/i.test(system.primary_source_desc || "");
    return `<p class="water-system-match">${isZh ? "请让账单上的供水机构确认此处的系统名称和PWSID（公共供水系统编号）。同一家企业可能经营多个系统；邮编不能确认您家的供水范围。" : "Confirm this system name and PWSID (public water system ID) with the provider on your bill. One company may run several systems; a ZIP match does not confirm service to your home."}${purchased ? (isZh ? " 此记录标注为购入水：请向您的供水机构确认上游供应商及适用于您家的报告。本数据未列出供应商名称。" : " This record lists purchased water: ask your provider which supplier it buys from and which report applies to your home. The supplier's name is not included in this dataset.") : ""}</p>`;
  }

  function renderOfficialRecords(system) {
    const isZh = currentLang === "zh";
    const state = system.sdwis_state_code;
    const program = STATE_PROGRAMS[state] || DEFAULT_STATE_PROGRAM;
    const label = !STATE_PROGRAMS[state]
      ? (isZh ? "查找您所在州的饮用水机构" : "Find your state drinking-water agency")
      : state === "MN" ? (isZh ? "明尼苏达州官方PFAS检测仪表板" : "Minnesota's official PFAS testing dashboard") : (isZh ? "官方州饮用水信息" : `Official ${STATE_NAMES[state] || "state"} drinking-water information`);
    const direct = providerLinks[String(system.pwsid)];
    const pilot = direct ? `<div class="official-provider-links"><strong>${isZh ? "供水机构的官方信息" : "Official provider information"}</strong><p><a href="${escapeHtml(direct.report_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(direct.name)} — ${direct.report_year} ${isZh ? "水质报告" : "water-quality report"}</a> · <a href="${escapeHtml(direct.official_url)}" target="_blank" rel="noopener noreferrer">${isZh ? "供水机构网站" : "Provider website"}</a></p><small>${isZh ? "链接核对日期" : "Link checked"}: ${escapeHtml(direct.checked)}. ${isZh ? "报告不是今天的检测，也不能确认您家的供水机构。" : "A report is not a test of today's water and does not confirm service to your home."}</small></div>` : "";
    return `${pilot}<p class="result-action-links"><a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${isZh ? "EPA原始样本记录（按名称或PWSID搜索）" : "EPA sample records — search by system name or PWSID"}</a> · <a href="${escapeHtml(program.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></p>`;
  }

  function renderResultNextStep() {
    const isZh = currentLang === "zh";
    const copy = isZh
      ? "如果这是您的供水机构，请查看其最新年度水质报告（消费者信心报告）。报告可能未列出PFAS，因此也请询问：“最近的PFAS检测发现了什么？此后是否增加了处理措施？”"
      : "If this is your provider, check its latest annual water-quality report (Consumer Confidence Report). PFAS may not be listed, so also ask: “What did your most recent PFAS tests find, and has treatment changed since then?”";
    return `<aside class="result-next-step"><h3>${isZh ? "下一步：查看最新检测" : "Next step: check recent tests"}</h3><p>${escapeHtml(copy)}</p><a href="https://www.epa.gov/ccr" target="_blank" rel="noopener noreferrer">${isZh ? "查找水质报告 →" : "Find your water-quality report →"}</a></aside>`;
  }

  function renderStateContext(systems) {
    const stateCodes = [...new Set(systems.map(system => String(system.sdwis_state_code || "").toUpperCase()).filter(Boolean))];
    const isZh = currentLang === "zh";
    if (stateCodes.length !== 1) {
      const body = isZh
        ? "列出的供水系统跨越多个州或地区。本网站使用基于2024年4月联邦水平的固定研究阈值。州级规定可能不同。这些结果不能确定当前联邦或州级法律合规情况。"
        : "These systems are in different states or territories. Check the rules and guidance for your provider’s location.";
      const label = isZh ? "查找官方州或地区饮用水项目 →" : "Find your state’s drinking-water guidance →";
      return `<div><dt>${isZh ? "联邦研究基准与州级规定" : "Federal study benchmark and state rules"}</dt><dd>${escapeHtml(body)} <a href="${DEFAULT_STATE_PROGRAM.url}" target="_blank" rel="noopener noreferrer">${label}</a></dd></div>`;
    }

    const stateCode = stateCodes[0];
    const stateName = STATE_NAMES[stateCode] || stateCode;
    const program = STATE_PROGRAMS[stateCode] || DEFAULT_STATE_PROGRAM;
    const body = isZh
      ? `本网站使用基于2024年4月联邦水平的固定研究阈值。${stateName}可能采用不同的现行标准或指南。该结果不能确定当前联邦或州级法律合规情况。`
      : `${stateName} may use different current standards or guidance. Check the official state information for current rules.`;
    const label = isZh ? `查看${stateName}的现行官方信息 →` : `Check current official ${stateName} information →`;
    return `<div><dt>${isZh ? `${stateName}的现行规定` : `Current rules in ${stateName}`}</dt><dd>${escapeHtml(body)} <a href="${escapeHtml(program.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></dd></div>`;
  }

  function renderResultBoundary(systems) {
    const isZh = currentLang === "zh";
    return `<aside class="result-boundary" role="note">
      <h3>${isZh ? "怎样读懂这些数字" : "How to read the numbers"}</h3>
      <p>${isZh ? "本页使用美国环境保护署（EPA）第五轮未受监管污染物监测规则（UCMR 5）的数据，最终数据于2026年8月发布。州级或供水机构报告可能包含更新的检测结果。" : "These data come from the U.S. Environmental Protection Agency (EPA), collected under the Fifth Unregulated Contaminant Monitoring Rule (UCMR 5), with the final dataset released August 2026. State or utility reports may contain more recent monitoring."}</p>
      <div class="result-glossary">
        <dl>
          <div><dt>${isZh ? "年度平均值是什么？" : "What is the yearly average?"}</dt><dd>${isZh ? "我们从EPA最终样本记录重建各采样点年度平均值，再显示该系统中最高的平均值。低于报告限值的样本按零参与计算，但不代表实际浓度为零。" : "We use yearly averages reconstructed from EPA’s final sample records for each testing location, then show the highest of those averages for the system. Samples below the reporting limit count as zero in the calculation; they are not measured zeros."}</dd></div>
          <div><dt>${isZh ? "研究比较水平是什么？" : "What is the study comparison level?"}</dt><dd>${isZh ? "这是基于2024年4月EPA水平的固定研究基准，不是现行联邦或州标准。低于它不能证明水是安全的，达到或超过它也不能确定违法。" : "It is a fixed research benchmark based on April 2024 EPA levels, not a current federal or state standard. A lower result does not establish safety; reaching or exceeding it does not establish a legal violation."}</dd></div>
          <div><dt>${isZh ? "万亿分之一是什么？" : "What does parts per trillion mean?"}</dt><dd>${isZh ? "它表示水中化学物质的浓度，缩写为ppt，不是健康风险评分。" : "It describes the concentration of a chemical in water. The abbreviation is ppt. It is not a health-risk score."}</dd></div>
          <div><dt>${isZh ? "本页包含所有PFAS吗？" : "Does this show all PFAS?"}</dt><dd>${isZh ? "不是。本页显示五种PFAS及一个混合物指数，不是PFAS总浓度。PFBS参与混合物计算，但本存档未提供其单独的系统汇总值。不能把不同地点或年份的最高平均值相加来检验州级总量标准。" : "No. It shows five individual PFAS and a mixture index, not a total PFAS concentration. PFBS contributes to the mixture calculation, but this archive has no separate system summary for it. The highest averages may come from different locations or years; adding them cannot test a state's combined-PFAS standard."}</dd></div>
        </dl>
      </div>
      <a href="/methodology/#outcomes">${isZh ? "完整计算方法、报告限值和局限 →" : "Full calculations, reporting limits and limitations →"}</a>
      · <a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${text("faqCurrentLink")}</a>
      <div class="result-glossary"><dl>${renderStateContext(systems)}</dl></div>
    </aside>`;
  }

  function renderOutcomeList(system, excludedKeys = []) {
    return OUTCOMES.filter(outcome => !excludedKeys.includes(outcome.key)).map(outcome => {
      const status = outcomeStatus(system, outcome);
      const value = formatOutcomeValue(outcome, status);
      const label = outcome.key === "hi" ? (currentLang === "zh" ? "PFAS混合物指数" : "PFAS mixture index") : outcome.label;
      const detail = status.belowReporting && outcome.key !== "hi"
        ? (currentLang === "zh"
          ? `低于 ${outcome.reportingLimit} ppt 的报告限值；不等于零。低于限值的结果在平均值计算中按零计，但不是测得为零。`
          : `Below the ${outcome.reportingLimit} ppt reporting limit, not necessarily zero. Below-limit samples count as zero in the average, but are not measured zeros.`)
        : status.belowReporting && outcome.key === "hi"
          ? (currentLang === "zh" ? "PFAS混合物计算指标 · 研究基准：1.5" : "Calculated PFAS-mixture measure · EPA rounding cutoff: 1.5")
          : `${outcome.benchmark} · ${outcome.cutoff}`;
      return `<div class="compound-result-row ${status.className}">
        <div><span class="compound-tag ${status.className === "above" ? "above" : ""}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
        <div><span>${escapeHtml(status.label)}</span><small>${escapeHtml(detail)}</small>${outcome.key === "hi" ? `<small>${currentLang === "zh" ? "危害指数综合PFHxS、PFNA、GenX和PFBS相对于各自参考值的比例；它不是浓度或患病概率。" : "The Hazard Index combines PFHxS, PFNA, GenX and PFBS relative to their reference values. It is not a concentration or the chance of illness."}</small>` : ""}</div>
      </div>`;
    }).join("");
  }

  function renderHazardIndexEducation(system) {
    const outcome = OUTCOMES.find(item => item.key === "hi");
    const status = outcomeStatus(system, outcome);
    const value = numericAverage(outcome, status);
    if (value === null || value <= 0 || status.className !== "above") return "";
    const isZh = currentLang === "zh";
    return `<aside class="science-box hazard-index-education ${status.className}">
      <h3>${isZh ? "混合物危害指数" : "Mixture Hazard Index"}</h3>
      <p><strong>${escapeHtml(formatAverage(status.maximum, true))}</strong> — ${isZh ? "这是一项PFAS混合物的计算指标，不是化合物浓度或个人健康评分。" : "This is a calculated PFAS-mixture measure, not a compound concentration or personal health score."}</p>
      <a href="/methodology/">${isZh ? "查看完整计算方法和局限 →" : "See the full calculation and limitations →"}</a>
    </aside>`;
  }

  function partitionZipSystems(payload, zip, byId) {
    const pending = new Set(payload.pending_associations?.[zip] || []);
    const roles = payload.association_roles?.[zip] || {};
    const candidates = (payload.zip_to_pwsids[zip] || []).map(id => byId.get(String(id))).filter(Boolean);
    candidates.sort((a, b) => String(a.ucmr_pws_name).localeCompare(String(b.ucmr_pws_name)) || String(a.pwsid).localeCompare(String(b.pwsid)));
    return {
      systems: candidates.filter(s => !pending.has(s.pwsid) && roles[s.pwsid]?.role !== "wholesale"),
      uncertain: candidates.filter(s => pending.has(s.pwsid)),
      wholesale: candidates.filter(s => !pending.has(s.pwsid) && roles[s.pwsid]?.role === "wholesale")
    };
  }

  function renderWholesaleAssociations(systems) {
    if (!systems.length) return "";
    const zh = currentLang === "zh";
    const heading = zh ? "可能的上游批发供水机构" : "Possible upstream wholesale suppliers";
    const explanation = zh
      ? "这些机构向当地供水机构批发供水；这不能确认您家的供水来源，也不表示它们直接向您收费。其检测结果不计入本邮编的结果摘要。请确认水费账单上的供水机构。"
      : "These suppliers sell water to local utilities. This does not confirm who supplies or bills your home. Their results are not included in this ZIP's summary. Confirm the utility on your water bill.";
    return `<details class="compound-results-details"><summary>${heading} (${systems.length})</summary><p>${explanation}</p><ul>${systems.map(s => `<li><a href="/?system=${encodeURIComponent(s.pwsid)}">${escapeHtml(s.ucmr_pws_name)}</a> — ${zh ? "系统编号" : "System ID"} ${escapeHtml(s.pwsid)}</li>`).join("")}</ul></details>`;
  }

  function renderProviderRole(system) {
    if (release?.association_roles?.[lastLookupZip]?.[system.pwsid]?.role !== "mixed") return "";
    return `<p class="water-system-match">${currentLang === "zh"
      ? "此机构既直接向部分用户供水，也向其他供水机构批发供水。服务区与邮编重叠不能确认您家的供水机构。请核对水费账单，不要用上游供水机构的结果代替您当地供水机构的结果。"
      : "This district serves some customers directly and sells water to other utilities. A service-area overlap does not confirm that it supplies your home directly. Match the provider on your water bill; upstream-supplier results do not replace your local utility's results."}</p>`;
  }

  function renderUncertainAssociations(systems) {
    if (!systems.length) return "";
    const isZh = currentLang === "zh";
    const heading = isZh ? "需要确认的供水机构关联" : "Provider associations needing confirmation";
    const explanation = isZh
      ? "来源文件还列出了以下供水机构，但其服务范围与该邮编的关联需要核实。这不表示未做检测。请向账单上的供水机构确认，或按系统编号查看EPA记录。"
      : "The source file also lists these providers, but their connection to this ZIP needs review. This does not mean they have no testing data. Confirm your provider or search EPA records using the system ID.";
    return `<details class="compound-results-details"><summary>${heading} (${systems.length})</summary><p>${explanation}</p><ul>${systems.map(s => `<li><a href="/?system=${encodeURIComponent(s.pwsid)}">${escapeHtml(s.ucmr_pws_name)}</a> — ${escapeHtml(s.sdwis_state_code)} · PWSID ${escapeHtml(s.pwsid)}</li>`).join("")}</ul><a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${text("openDataFinder")}</a></details>`;
  }

  async function readReviewedLookup(response, reviews) {
    const raw = await response.text();
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const hash = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
    if (hash !== reviews.source_sha256) throw new Error("ZIP review source checksum does not match");
    const reviewed = applyZipReviews(JSON.parse(raw), reviews);
    reviewed.source_lookup_sha256 = hash;
    return reviewed;
  }

  function renderAssociationReview(system) {
    if (!release?.pending_associations?.[lastLookupZip]?.includes(system.pwsid)) return "";
    return `<p class="water-system-match"><strong>${currentLang === "zh"
      ? "此供水机构与该邮编的关联尚待核实。请向账单上的供水机构确认，不要仅凭此匹配判断供水范围。"
      : "This provider’s connection to your ZIP needs checking. Confirm with the provider on your bill before treating these as relevant results."}</strong></p>`;
  }

  function renderEvidence(system) {
    const zh = currentLang === "zh";
    const rows = evidenceById.get(String(system.pwsid));
    if (!rows) return `<p class="coverage-note">${zh ? "采样点覆盖资料尚未核实。" : "Location coverage has not been verified."}</p>`;
    const summaries = OUTCOMES.map((o,i) => {
      const full = rows.filter(r=>r[5][i][0] === 1 && r[5][i][1] === 1).length;
      return `${o.key === "hi" ? (zh ? "混合物指数" : "Mixture index") : o.label}: ${full}/${rows.length}`;
    }).join(" · ");
    const details = OUTCOMES.map((o,i) => {
      const status = outcomeStatus(system,o);
      const matching = status.maximum === null || status.maximum === undefined ? [] : rows.filter(r=>r[5][i][2] === status.maximum);
      const examples = matching.slice(0,5).map(r=>{
        const dates = o.key === "hi" ? null : r[6][i];
        const dateText = dates ? `${dates[0]} – ${dates[1]}` : (zh ? "无单一可核实日期范围" : "No single verified date range");
        return `<li>${escapeHtml(r[2])} — ${escapeHtml(r[0])} / ${escapeHtml(r[1])}; ${zh ? "源记录日期" : "source-record dates"}: ${escapeHtml(dateText)}; ${zh ? "来源行" : "source row"} ${r[4]}.</li>`;
      }).join("");
      const value = status.maximum == null ? (zh ? "无年度平均值" : "No yearly average") : status.maximum === 0 ? (zh ? "低于报告限值；计算按零计" : "Below reporting level; coded zero for averaging") : `${status.maximum} ${o.key === "hi" ? (zh ? "（无单位指数）" : "(unitless index)") : `µg/L × 1,000 = ${formatAverage(status.maximum)}`}`;
      return `<details class="evidence-outcome"><summary>${escapeHtml(o.key === "hi" ? (zh ? "混合物指数" : "Mixture index") : o.label)} — ${escapeHtml(formatOutcomeValue(o,status))}</summary><p>${escapeHtml(value)}</p><p>${zh ? "最高值对应采样点数" : "Locations sharing this maximum"}: ${matching.length}${matching.length > 5 ? (zh ? "（下列显示前5个）" : " (first 5 shown below)") : ""}</p><ul>${examples}</ul></details>`;
    }).join("");
    return `<details class="compound-results-details result-evidence"><summary>${zh ? "采样覆盖与数据来源" : "Sampling coverage and sources"}</summary><div class="coverage-note"><strong>${zh ? "可计算年度比较的采样点 / 归档采样点" : "Locations with a complete yearly comparison / archived locations"}</strong><p>${escapeHtml(summaries)}</p></div>
      <p>${zh ? "从EPA最终UCMR 5样本记录重建采样点年度平均值；每种物质显示各点最高平均值。不同物质可能来自不同点，不能相加为总浓度。" : "We use sampling-location yearly averages reconstructed from EPA’s final UCMR 5 records and display the highest for each chemical. Different chemicals can come from different locations; these maxima cannot be added into a total concentration."}</p>
      <p>${zh ? "日期表示该采样点的监测期。一组必需采样事件可能跨日历年；并非将2023–2025年所有样本合并。下方“单次样本与平均值计算”展示重建输入，并已与固定版本的平均值逐项核对。" : "Dates describe monitoring at each location. A required sampling set can cross a calendar year; this is not a pooled 2023–2025 average. “Individual samples and average calculations” below exposes the reconstruction inputs, checked against the frozen averages."}</p>
      <p>${zh ? "低于报告限值的样本在平均值中按零计，但不是测得浓度为零。显示保留EPA导出值的精度，不推断额外有效位。" : "Below-reporting-level samples count as zero in the average but are not measured zeros. We retain the precision of EPA’s exported average rather than infer extra digits."}</p>${details}
      <p><a href="${RELEASE_PATH}/lookup-evidence.json" target="_blank" rel="noopener noreferrer">${zh ? "全部采样点、来源行与校验记录（JSON）" : "All locations, source rows and checksums (JSON)"}</a> · <a href="https://doi.org/10.5281/zenodo.21968954" target="_blank" rel="noopener noreferrer">${zh ? "归档研究资料" : "Archived research files"}</a></p>
      <p>${zh ? "来源行对应归档文件" : "Source rows refer to the archived file"}: website_location_averages.csv. ${zh ? "研究快照" : "Website release"}: August 2026.</p></details>
      <details class="compound-results-details pfas-source-samples" data-pfas-samples="${escapeHtml(system.pwsid)}"><summary>${zh ? "单次样本与平均值计算" : "Individual samples and average calculations"}</summary><div class="pfas-sample-content">${zh ? "打开以载入检测值、未检出结果、日期及平均值计算输入。" : "Open to load detects, nondetects, dates, and the inputs behind each location average."}</div></details>`;
  }

  function incompleteSampleDetections(system) {
    // Evidence was validated and pinned before rendering; no state results are merged.
    return (evidenceById.get(String(system.pwsid)) || []).flatMap(r =>
      (r[7] || []).map(d => ({label:OUTCOMES[d[0]].label, value:d[1], date:d[2],
        sampleId:d[3], event:d[4], sourceLine:d[5], facility:r[0], point:r[1], name:r[2]})));
  }

  function renderIncompleteSamples(system) {
    const samples = incompleteSampleDetections(system);
    if (!samples.length) return "";
    const zh = currentLang === "zh";
    const rows = samples.map(d => `<li><strong>${escapeHtml(d.label)}: ${escapeHtml(String(d.value))} ppt</strong> · ${escapeHtml(d.date)} · ${escapeHtml(d.name)} (${escapeHtml(d.facility)} / ${escapeHtml(d.point)})<br><small>${zh ? "样本编号" : "Sample ID"}: ${escapeHtml(d.sampleId)} · ${escapeHtml(d.event)} · UCMR5_All.txt ${zh ? "行" : "line"} ${d.sourceLine}</small></li>`).join("");
    return `<section class="coverage-note incomplete-sample-context"><strong>${zh ? "年度比较不完整的采样点检出了PFAS" : "PFAS detected at locations without a complete yearly comparison"}</strong><p>${zh ? "以下为历史单次样本，不是年度平均值。这些结果不纳入上方完整年度平均值，也不代表今天的家庭水质或合规情况。" : "These are historical individual samples, not yearly averages. They are excluded from the complete yearly averages above and do not establish today's household water quality or compliance."}</p><details><summary>${zh ? "查看样本来源记录" : "View source sample records"} (${samples.length})</summary><ul>${rows}</ul></details></section>`;
  }

  function renderSystem(system) {
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    const complete = Number(system.any_system_full_set) === 1;
    const found = OUTCOMES.some(o => o.key !== 'hi' && (numericAverage(o,outcomeStatus(system,o)) || 0) > 0) || incompleteSampleDetections(system).length > 0;
    const all = system._comparisonCoverage?.all === true;
    const headline = found ? choose('PFAS were found','检出了PFAS','Se detectaron PFAS') : !all ? choose('Testing data are incomplete','检测数据不完整','Los datos de pruebas están incompletos') : choose('No detections in complete samples','完整样本中未检出','Sin detecciones en las muestras completas');
    const finding = above ? choose('At least one available yearly average is above a study reference.','至少一项可用年度平均值高于研究参考值。','Al menos un promedio disponible supera una referencia de estudio.') : !complete ? choose('Not enough samples for a yearly comparison.','样本不足，无法进行年度比较。','No hay suficientes muestras para calcular un promedio.') : choose('No available yearly average is above the study references.','可用年度平均值均未高于研究参考值。','Ningún promedio disponible supera las referencias del estudio.');
    const methodsUrl = `/methodology/?system=${encodeURIComponent(system.pwsid)}#sample-trace`;
    const rows = OUTCOMES.map(o => {
      const status = outcomeStatus(system,o);
      return `<div class="compact-outcome ${status.className}"><span>${o.key === 'hi' ? choose('Mixture index','混合物指数','Índice de mezcla') : o.label}</span><strong dir="auto">${escapeHtml(formatOutcomeValue(o,status))}</strong>${status.above ? `<small>${choose('Above study reference','高于研究参考值','Por encima de la referencia')}</small>` : ''}</div>`;
    }).join('');
    const direct = providerLinks[String(system.pwsid)];
    const nextUrl = direct?.report_url || 'https://www.epa.gov/ccr';
    const nextLabel = direct ? `${escapeHtml(direct.name)} — ${direct.report_year} ${choose('water-quality report','水质报告','informe de calidad del agua')}` : choose('Find your provider’s latest water-quality report','查找供水机构的最新水质报告','Busque el informe de calidad del agua de su proveedor');
    const names = [['PFAS','Per- and polyfluoroalkyl substances','全氟和多氟烷基物质','Sustancias perfluoroalquiladas y polifluoroalquiladas'],['PFOA','Perfluorooctanoic acid','全氟辛酸','Ácido perfluorooctanoico'],['PFOS','Perfluorooctane sulfonic acid','全氟辛烷磺酸','Ácido perfluorooctanosulfónico'],['PFHxS','Perfluorohexane sulfonic acid','全氟己烷磺酸','Ácido perfluorohexanosulfónico'],['PFNA','Perfluorononanoic acid','全氟壬酸','Ácido perfluorononanoico'],['HFPO-DA','Hexafluoropropylene oxide dimer acid (a GenX chemical)','六氟环氧丙烷二聚酸（GenX化学物质之一）','Ácido dímero de óxido de hexafluoropropileno (una sustancia GenX)'],['PFBS','Perfluorobutane sulfonic acid (a mixture-index component)','全氟丁烷磺酸（混合物指数的一种组分）','Ácido perfluorobutanosulfónico (componente del índice de mezcla)']];
    return `<article class="detail-box system-summary-card water-system-card compact-system ${above?'has-comparison':''}">
      <header class="system-summary-head"><div><span class="system-state-label">${escapeHtml(system.sdwis_state_code || 'US')}</span><h3 dir="auto" data-preserve-language>${escapeHtml(system.ucmr_pws_name || text('unnamed'))}</h3></div><span class="system-summary-status ${above?'above':all?'below':'incomplete'}">${headline}</span></header>
      ${localizeMarkup(renderAssociationReview(system))}${localizeMarkup(renderProviderRole(system))}
      <p class="compact-dates">${choose('Test dates','检测日期','Fechas de pruebas')}: ${escapeHtml(formatMonitoringPeriod(system))}.</p>
      <p class="compact-finding">${finding}</p>
      ${incompleteSampleDetections(system).length?`<p class="compact-warning">${choose('Some PFAS detections have incomplete sampling sets. See individual samples below.','部分PFAS检出结果的样本组不完整。请查看下方单次样本。','Algunas detecciones de PFAS tienen muestras incompletas. Consulte las muestras individuales.')}</p>`:''}
      ${!all?`<p class="compact-warning">${choose('Some comparisons are missing or unverified. Missing comparisons cannot be treated as below benchmark.','部分比较缺失或未经核实。缺失比较不能视为低于基准。','Faltan algunas comparaciones o no están verificadas; no deben interpretarse como resultados por debajo de la referencia.')}</p>`:''}
      <p class="compact-caption">${choose('Highest location averages · ppt = parts per trillion.','各采样点中的最高平均值 · ppt表示万亿分之一。','Promedios más altos por punto · ppt = partes por billón (10¹²).')}</p>
      <div class="compact-outcomes">${rows}</div>
      <p class="compact-caption">${choose('“Below” means below the reporting limit, not zero. The mixture index has no units.','“低于”指低于报告限值，并非为零。混合物指数没有单位。','«Menos de» significa por debajo del límite de reporte, no cero. El índice de mezcla no tiene unidades.')}</p>
      <p class="compact-limit">${choose('Historical system results, not a home tap test or personal health assessment. Ask your provider for recent results.','历史系统结果，并非家庭水龙头检测或个人健康评估。请向供水机构查询最新结果。','Resultados históricos del sistema, no una prueba del grifo ni una evaluación de salud personal. Pida resultados recientes a su proveedor.')}</p>
      <p class="compact-next"><a href="${escapeHtml(nextUrl)}" target="_blank" rel="noopener noreferrer">${nextLabel} →</a></p>
      <details class="compound-results-details"><summary>${choose('Terms and symbols','术语与符号','Términos y símbolos')}</summary><dl class="home-term-list">
        <div><dt>${choose('Study reference','研究参考值','Referencia de estudio')}</dt><dd>${choose('A fixed comparison based on EPA’s April 2024 levels. It does not decide current compliance or whether your home’s water is safe.','基于EPA于2024年4月水平的固定比较值，不能判定当前合规性或您家水质是否安全。','Una comparación fija basada en los niveles de la EPA de abril de 2024. No determina el cumplimiento actual ni si el agua de su hogar es segura.')}</dd></div>
        <div><dt>${choose('Mixture index','混合物指数','Índice de mezcla')}</dt><dd>${choose('A combined measure for four PFAS. Not a concentration or a probability of illness.','四种PFAS的综合指标，不是浓度或患病概率。','Una medida combinada de cuatro PFAS. No es una concentración ni la probabilidad de enfermar.')}</dd></div>
        <div><dt>${choose('Not available','不可用','No disponible')}</dt><dd>${choose('Required samples are missing; it does not mean no PFAS.','缺少必需样本，并不表示没有PFAS。','Faltan muestras necesarias; no significa que no haya PFAS.')}</dd></div>
        ${names.map(([short,en,zh,es])=>`<div><dt>${short}</dt><dd>${choose(en,zh,es)}</dd></div>`).join('')}
        <div><dt>EPA</dt><dd>${choose('U.S. Environmental Protection Agency','美国环境保护署','Agencia de Protección Ambiental de Estados Unidos')}</dd></div>
      </dl><a href="https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas" target="_blank" rel="noopener noreferrer">${choose('EPA: PFAS and health','EPA：PFAS与健康','EPA: PFAS y salud')} →</a></details>
      <details class="compound-results-details pfas-source-samples" data-pfas-samples="${escapeHtml(system.pwsid)}"><summary>${choose('Samples and test dates','样本与检测日期','Muestras y fechas de pruebas')}</summary><div class="pfas-sample-content">${choose('Open to view individual sample results.','打开以查看单次样本结果。','Abra para ver los resultados individuales.')}</div></details>
      <details class="compound-results-details"><summary>${choose('Provider details and official links','供水机构详情与官方链接','Información del proveedor y enlaces oficiales')}</summary><p>PWSID (${choose('public water system ID','公共供水系统编号','número del sistema público de agua')}): ${escapeHtml(system.pwsid)}</p><p>${choose('Population served','服务人口','Población abastecida')}: ${formatInteger(system.population_served_count)}</p><p><a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${choose('EPA source records','EPA原始记录','Registros originales de la EPA')} →</a> · <a href="${escapeHtml((STATE_PROGRAMS[system.sdwis_state_code]||DEFAULT_STATE_PROGRAM).url)}" target="_blank" rel="noopener noreferrer">${choose('Official state drinking-water information','官方州饮用水信息','Información oficial del estado sobre agua potable')} →</a></p>${/purchased/i.test(system.primary_source_desc||'')?`<p>${choose('Purchased water: ask your provider which upstream supplier and report apply to your home.','购入水：请向供水机构确认上游供应商及适用于您家的报告。','Agua comprada: pregunte a su proveedor qué suministrador e informe corresponden a su hogar.')}</p>`:''}</details>
      <a class="clinic-report-link home-method-link" href="/report/?system=${encodeURIComponent(system.pwsid)}&amp;lang=${currentLang}" target="_blank" rel="noopener">${choose("Create clinic report","生成就诊报告","Crear informe para consulta")} ↗</a>
      <a class="home-method-link" href="${methodsUrl}">${choose('Methods, calculations & limitations','方法、计算与局限','Métodos, cálculos y limitaciones (en inglés)')} →</a>
    </article>`;
  }

  function renderFilterGuide() {
    const isZh = currentLang === "zh";
    const heading = isZh ? "家用过滤器信息" : "Home-filter information";
    const intro = isZh
      ? "供水系统监测比较不能确定某个家庭是否需要过滤器。请先核对供水机构并查看其最新消费者信心报告。如果您自行考虑过滤器，请核实具体的PFAS减少认证，而不是只看营销用语。"
      : "A water-system monitoring comparison cannot determine whether a particular home needs a filter. First confirm the utility and read its current Consumer Confidence Report. If you independently consider a filter, verify a specific PFAS-reduction certification rather than relying on marketing language.";
    return `<section class="result-action-guide">
      <div class="result-action-body"><h3>${isZh ? "考虑使用过滤器？" : "Considering a water filter?"}</h3><p>${isZh ? "这些历史检测不能确定您家是否需要过滤器。如果考虑购买，请核实具体型号是否通过PFAS减少认证，并按时更换滤芯。" : "These historical tests cannot determine whether your home needs a filter. If you consider one, check the exact model’s PFAS-reduction certification and replacement schedule."}</p></div>
      <details class="compound-results-details optional-filter-guide">
      <summary><strong>${heading}</strong></summary>
      <div class="result-action-body">
        <p>${intro}</p>
        <ol>
          <li>${isZh ? "寻找 <strong>NSF/ANSI 53或NSF/ANSI 58</strong> 以及明确的PFAS减少声明。" : "Look for <strong>NSF/ANSI 53 or NSF/ANSI 58</strong> and a specific PFAS-reduction claim."}</li>
          <li>${isZh ? "在认可的认证目录中核实具体型号。" : "Verify the exact model in an accredited certification directory."}</li>
          <li>${isZh ? "按照制造商规定的时间更换滤芯或滤膜。" : "Replace the cartridge or membrane on the manufacturer’s schedule."}</li>
        </ol>
        <p class="result-action-links"><a href="https://www.epa.gov/cleanups/reducing-pfas-your-drinking-water-home-filter" target="_blank" rel="noopener noreferrer">${isZh ? "EPA过滤器指南 →" : "EPA filter guide →"}</a><a href="https://www.nsf.org/consumer-resources/articles/pfas-drinking-water" target="_blank" rel="noopener noreferrer">${isZh ? "认证指南 →" : "Certification guidance →"}</a></p>
        <small>${isZh ? "EPA指出，现有过滤器认证不一定证明产品可将PFAS降低到2024年每项联邦限值。PFAS Estimator不认可或销售任何产品。" : "EPA notes that current certifications do not necessarily show reduction to every 2024 federal PFAS limit. PFAS Estimator does not endorse or sell products."}</small>
      </div>
    </details></section>`;
  }

  function buildAssistantContext(systems, selection = "zip") {
    if (!systems.length) return "No water system was found for the searched ZIP in this EPA-linked file. This does not establish that the water is PFAS-free; the user should check a water bill, contact the local utility, or determine whether the home uses a private well.";
    const selected = systems.slice(0, 10);
    const lines = [
      `Release: ${release.release_id}.`,
      selection === "system"
        ? "The user selected this water system directly by public water system ID, without a ZIP lookup. Selection does not establish that it serves their home. The user should match the provider to a water bill."
        : "The ZIP link can list multiple water systems and does not confirm the utility for a specific home. The user should match the system name to a water bill.",
      "UCMR 5 samples were collected at entry points to the distribution system, not at a household faucet. The page identifies each system's sampling period. Each numeric PFAS value is the highest EPA-derived annual average among that water system's sampling locations. A below-reporting-level result is not proof that the concentration was zero. Comparison labels do not determine current compliance, household tap concentration, personal exposure, safety, or health risk.",
      `Water systems displayed: ${systems.length}.`
    ];
    const comparisonSystems = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1);
    lines.push(`Water systems with at least one yearly average above an EPA comparison level: ${comparisonSystems.length}. The benchmark is the unrounded cutoff used by this research to reproduce EPA's final UCMR 5 technical-assistance classification around the April 2024 federal levels; it is not a current standard or compliance finding. Names: ${comparisonSystems.length ? comparisonSystems.map(system => system.ucmr_pws_name).join("; ") : "none"}. A zero count does not mean PFAS was not detected.`);
    lines.push("Missing or unverified location/chemical comparisons are not below-benchmark results. All counts are historical, not household safety findings.");
    selected.forEach(system => {
      if (selection === "zip" && release.association_roles?.[lastLookupZip]?.[system.pwsid]?.role === "mixed") {
        lines.push(`${system.ucmr_pws_name} has both retail and wholesale roles. Do not assume it directly supplies the user's home; ask them to confirm the billed utility. Its results do not replace another retail utility's results.`);
      }
      const outcomes = OUTCOMES.map(outcome => {
        const status = outcomeStatus(system, outcome);
        return `${outcome.label}: ${formatOutcomeValue(outcome, status)}; ${status.label}`;
      }).join(" | ");
      const samples = incompleteSampleDetections(system);
      if (samples.length) lines.push(`${system.ucmr_pws_name}: ${samples.length} source sample records contain detections at locations lacking complete chemical annual averages. Examples: ${samples.slice(0,5).map(d => `${d.label} ${d.value} ppt; ${d.date}; facility ${d.facility}; point ${d.point}; sample ${d.sampleId}`).join(" | ")}. These are individual historical samples, excluded from complete annual summaries, not annual exceedances or separately collected state monitoring records.`);
      lines.push(`Comparison coverage across all six outcomes and archived locations: ${system._comparisonCoverage?.all ? "complete" : "incomplete or unverified"}.`);
      lines.push(`${system.ucmr_pws_name} (PWSID ${system.pwsid}, ${system.sdwis_state_code}; sampling period ${formatMonitoringPeriod(system)}): ${outcomes}`);
    });
    if (systems.length > selected.length) lines.push(`${systems.length - selected.length} additional water systems are displayed on the page but omitted from this compact assistant context.`);
    return lines.join("\n");
  }

  function appendChat(role, content) {
    const element = document.createElement("div");
    element.className = `ai-msg ${role}`;
    element.textContent = content;
    $("aiMessages").appendChild(element);
    requestAnimationFrame(() => {
      if (!element.isConnected) return;
      const messages = $("aiMessages");
      // Keep the beginning of a new answer in view instead of skipping to its end.
      if (!$("chatPanel").classList.contains("chat-expanded")) {
        messages.scrollTop += element.getBoundingClientRect().top - messages.getBoundingClientRect().top - 16;
      }
      updateChatExpansion();
    });
    return element;
  }

  function updateChatExpansion() {
    const expanded = $("chatPanel").classList.contains("chat-expanded");
    const messages = $("aiMessages");
    $("chatExpandBtn").hidden = !expanded && messages.scrollHeight <= messages.clientHeight + 1;
    $("chatExpandBtn").textContent = text(expanded ? "collapseChat" : "expandChat");
    $("chatExpandBtn").setAttribute("aria-expanded", String(expanded));
  }

  function resetChat(message = text("welcome")) {
    chatGeneration += 1;
    $("chatPanel").classList.remove("has-conversation", "chat-expanded");
    $("chatExpandBtn").hidden = true;
    $("chatExpandBtn").setAttribute("aria-expanded", "false");
    $("aiSendBtn").disabled = false;
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
    if(["hi","ar"].includes(currentLang)){openFaq("result");return;}
    const input = $("aiInput");
    const button = $("aiSendBtn");
    const question = input.value.trim();
    if (!question || button.disabled) { if (!question) input.focus(); return; }
    input.value = "";
    button.disabled = true;
    const generation = chatGeneration;
    $("chatPanel").classList.add("has-conversation");
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
      if (generation !== chatGeneration) return;
      thinking.remove();
      appendChat("assistant", reply);
      chatMessages.push({ role: "assistant", content: reply });
      trackEvent("ai_question", { has_system_context: currentSystems.length > 0 });
    } catch (error) {
      if (generation !== chatGeneration) return;
      thinking.remove();
      appendChat("assistant", assistantErrorMessage(error));
      console.warn("Assistant request failed", error);
    } finally {
      if (generation === chatGeneration) {
        button.disabled = false;
        input.focus({ preventScroll: true });
      }
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
    renderLookupImpl(zip, incrementCounter);
    localizeHomeDocument();
  }

  function renderLookupImpl(zip, incrementCounter = true) {
    waterGeneration++;
    if (waterMode !== "pfas") { renderAdditionalWater({zip}); return; }
    if ($("chatPanel")) $("chatPanel").hidden = false;
    if (!release) return;
    lastSystemId = null;
    const result = $("result");
    const title = $("resultTitle");
    const context = $("resultContext");
    const body = $("resultBody");
    if (!/^\d{5}$/.test(zip)) {
      // Invalid input must not leave the assistant or language toggle attached
      // to the previous ZIP's otherwise invisible water-system results.
      lastLookupZip = null;
      currentSystems = [];
      currentContext = "No valid ZIP lookup is selected. Ask for a five-digit ZIP and confirm the provider before interpreting system results.";
      replaceLookupUrl(window.location.pathname);
      result.className = "result not-found";
      title.textContent = text("invalidZipTitle");
      context.textContent = text("invalidZipContext");
      body.innerHTML = "";
      resetChat(text("invalidZipContext"));
      return;
    }

    lastLookupZip = zip;
    const { systems, uncertain, wholesale } = partitionZipSystems(release, zip, systemsById);
    currentSystems = systems;
    currentContext = systems.length ? buildAssistantContext(systems) : uncertain.length || wholesale.length
      ? "Only unresolved or wholesale supplier links were found. Do not infer that testing is absent. Ask the user to confirm their retail provider; no concentrations are supplied for these associations."
      : buildAssistantContext(systems);
    const pendingIds = release.pending_associations?.[zip] || [];
    if (pendingIds.length) {
      currentContext += `\nZIP associations needing review: ${pendingIds.join(", ")}. Do not claim these systems serve the searched ZIP or the user's home; ask the user to confirm the provider.`;
    }
    if (wholesale.length) {
      currentContext += `\nPossible wholesale supplier links shown separately: ${wholesale.map(s => s.pwsid).join(", ")}. They are not selected retail providers; do not attribute their concentrations to this ZIP or household. Ask the user to confirm the utility on their bill.`;
    }
    $("printZip").textContent = `${choose("ZIP code","邮政编码","Código postal")}: ${zip}`;
    $("printDate").textContent = `${choose("Generated","生成日期","Generado")}: ${new Date().toLocaleDateString(currentLang === "zh" ? "zh-CN" : currentLang === "es" ? "es-US" : "en-US", { year: "numeric", month: "long", day: "numeric" })}`;
    replaceLookupUrl(`${window.location.pathname}?zip=${encodeURIComponent(zip)}`);
    if (incrementCounter) {
      incrementSearchCounter();
      trackEvent("scientific_zip_lookup", { zip_has_association: systems.length > 0, associated_systems: systems.length });
    }

    if (!systems.length) {
      result.className = "result not-found";
      title.textContent = uncertain.length || wholesale.length
        ? (currentLang === "zh" ? "供水机构关联需要确认" : "Provider matches need confirmation")
        : text("noAssociationTitle")(zip);
      context.textContent = uncertain.length || wholesale.length
        ? (currentLang === "zh" ? "此邮编仅有待核实的关联，不能据此判断当地水质或是否做过检测。" : "Only unresolved provider links were found for this ZIP. They cannot establish local water quality or whether testing occurred.")
        : text("noAssociationContext");
      body.innerHTML = `<div class="lookup-empty-guidance"><p>${text("noAssociationBody")}</p><p><a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${text("openDataFinder")}</a></p></div>${renderUncertainAssociations(uncertain)}${renderWholesaleAssociations(wholesale)}`;
      if ($("waterProviderMatches")) $("waterProviderMatches").textContent = currentLang === "zh" ? "请在上方按账单上的供水机构名称或系统编号搜索。即使邮编关联缺失，监测记录仍可能存在。" : "Search above using the provider name or system ID on your bill. Monitoring records can exist even when the ZIP association is missing.";
      resetChat(uncertain.length
        ? (currentLang === "zh" ? "请先确认账单上的供水机构；这里的邮编关联尚待核实。" : "Please confirm the provider on your bill; the ZIP associations here are still under review.")
        : text("contextReadyNone"));
      return;
    }

    const aboveCount = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1).length;
    const detectedSystemCount = systems.filter(system => OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .some(outcome => (numericAverage(outcome, outcomeStatus(system, outcome)) || 0) > 0)).length;
    const hasAnyDisplayedDetection = systems.some(system => OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .some(outcome => (numericAverage(outcome, outcomeStatus(system, outcome)) || 0) > 0) || incompleteSampleDetections(system).length > 0);
    result.className = aboveCount ? "result found-above" : "result found-below";
    title.textContent = text("associatedTitle")(systems.length, zip);
    context.textContent = text("associatedContext")(aboveCount, systems.length, detectedSystemCount);
    if (release.corrected_zips?.includes(zip)) {
      context.textContent += currentLang === "zh"
        ? " 此邮编的部分错误关联已移除；供水机构列表仍可能不完整。"
        : " Incorrect associations have been removed for this ZIP; the provider list may still be incomplete.";
    }
    body.innerHTML = `${systems.map(renderSystem).join("")}${renderUncertainAssociations(uncertain)}${renderWholesaleAssociations(wholesale)}`;
    resetChat(aboveCount ? text("contextReadyAbove") : text("contextReadyBelow"));
  }

  function renderSelectedSystem(id) {
    renderSelectedSystemImpl(id);
    localizeHomeDocument();
  }

  function renderSelectedSystemImpl(id) {
    waterGeneration++;
    if (waterMode !== "pfas") { renderAdditionalWater({id}); return; }
    if ($("chatPanel")) $("chatPanel").hidden = false;
    if (!release) return;
    lastLookupZip = null;
    lastSystemId = id;
    $("zipInput").value = "";
    const system = systemsById.get(id);
    currentSystems = system ? [system] : [];
    const result = $("result");
    replaceLookupUrl(`${window.location.pathname}?system=${encodeURIComponent(id)}#result`);
    if (!system) {
      currentContext = "The requested system ID is not in the loaded release. No system is selected. Do not infer that this system lacks monitoring or that any water is safe.";
      result.className = "result not-found";
      $("resultTitle").textContent = currentLang === "zh" ? "未找到该供水系统" : "Water system not found in this release";
      $("resultContext").textContent = currentLang === "zh" ? "请使用邮政编码查询或地图选择供水机构。此结果不能判断水质或是否进行了检测。" : "Try the ZIP lookup or map to select a provider. This does not establish water quality or whether monitoring occurred.";
      $("resultBody").innerHTML = `<p><a href="/map/">${currentLang === "zh" ? "打开供水系统地图 →" : "Explore the water-system map →"}</a></p>`;
      resetChat($("resultContext").textContent);
      return;
    }
    currentContext = buildAssistantContext([system], "system");
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    result.className = above ? "result found-above" : "result found-below";
    $("resultTitle").textContent = choose("Water-system results","供水系统结果","Resultados del proveedor");
    $("resultContext").textContent = currentLang === "zh"
      ? "直接按供水系统编号选择，未进行邮编关联。请核对水费账单上的供水机构。下方为历史检测结果，不能确定您家当前的自来水水质。"
      : "Selected directly by water system ID, without a ZIP match. Confirm the provider on your water bill. These historical results do not establish current household tap-water quality.";
    const hasDetection = OUTCOMES.filter(o => o.key !== "hi").some(o => (numericAverage(o,outcomeStatus(system,o)) || 0) > 0) || incompleteSampleDetections(system).length > 0;
    $("resultBody").innerHTML = renderSystem(system);
    $("printZip").textContent = `${choose("Water system ID","供水系统编号","Número de sistema")}: ${system.pwsid}`;
    $("printDate").textContent = `${choose("Generated","生成日期","Generado")}: ${new Date().toLocaleDateString(currentLang === "zh" ? "zh-CN" : currentLang === "es" ? "es-US" : "en-US")}`;
    resetChat(above ? text("contextReadyAbove") : text("contextReadyBelow"));
  }

  function checkZip() { return performLookup(); }

  function updateWaterModeLabels() {
    const zh = currentLang === "zh";
    const labels={waterRecordLegend:choose("Results","结果","Resultados"),lithiumModeLabel:choose("Lithium","锂","Litio"),lcrModeLabel:choose("Lead & copper","铅和铜","Plomo y cobre"),waterModeNote:choose("Map and state summaries show PFAS.","地图及各州汇总显示PFAS。","El mapa y los resúmenes por estado muestran PFAS.")};
    for(const [id,value] of Object.entries(labels))if($(id))$(id).textContent=value;
    document.querySelectorAll('[name="water-result-mode"]').forEach(input=>{input.checked=input.value===waterMode;});
    if($("chatDisclosure"))$("chatDisclosure").hidden=waterMode!=="pfas";
    updateSearchControls();
  }

  function updateSearchControls() {
    const labels={lookupSearchLegend:choose("Search by","搜索方式","Buscar por"),zipSearchLabel:choose("ZIP code","邮政编码","Código postal"),providerSearchLabel:choose("Provider name","供水机构名称","Nombre del proveedor"),idSearchLabel:choose("System ID","系统编号","Número de sistema")};
    for(const [id,value] of Object.entries(labels))if($(id))$(id).textContent=value;
    const input=$("zipInput");
    if(!input)return;
    const placeholder=searchMode==='zip'?choose("Enter a 5-digit ZIP code","输入5位邮政编码","Código postal de 5 dígitos"):searchMode==='provider'?choose("Enter a provider name","输入供水机构名称","Introduzca el nombre del proveedor"):choose("Enter a water system ID","输入供水系统编号","Introduzca el número del sistema");
    input.placeholder=placeholder;if($("lookupInputLabel"))$("lookupInputLabel").textContent=placeholder;input.setAttribute('aria-label',placeholder);input.setAttribute('inputmode',searchMode==='zip'?'numeric':'text');input.setAttribute('maxlength',searchMode==='zip'?'5':searchMode==='id'?'20':'100');input.setAttribute('autocomplete',searchMode==='zip'?'postal-code':'off');input.setAttribute('type',searchMode==='zip'?'text':'search');input.setAttribute('dir',searchMode==='provider'?'auto':'ltr');
    document.querySelectorAll('[name="lookup-search-mode"]').forEach(radio=>{radio.checked=radio.value===searchMode;});
    if($("lookupSearchHint")){
      $("lookupSearchHint").hidden=searchMode==='zip';
      $("lookupSearchHint").textContent=searchMode==='provider'?choose("Use the official provider name on your water bill (at least 3 characters).","请使用水费账单上的供水机构正式名称（至少3个字符）。","Use el nombre oficial de su factura (al menos 3 caracteres)."):searchMode==='id'?choose("Enter the exact water system ID, including any letters and leading zeros.","请输入完整系统编号，包括字母和开头的零。","Introduzca el número exacto, incluidas las letras y los ceros iniciales."):'';
    }
    if($("lookupButton"))$("lookupButton").textContent=!release?text('loadingData'):searchMode==='provider'?choose("Search providers","查找供水机构","Buscar proveedores"):searchMode==='id'?choose("Find this system","查找此系统","Buscar este sistema"):text('findSystems');
  }

  function setSearchMode(mode,focus=false) {
    if(!['zip','provider','id'].includes(mode))return;
    searchValues[searchMode]=$("zipInput").value||'';searchMode=mode;providerSearchGeneration++;
    $("waterProviderMatches").innerHTML='';$("zipInput").value=searchValues[mode];updateSearchControls();
    if(focus)$("zipInput").focus();
  }

  function clearDisplayedLookup() {
    waterGeneration++;lastLookupZip=null;lastSystemId=null;currentSystems=[];currentContext="No provider selected.";
    $("result").className="result";$("resultBody").innerHTML='';$("resultTitle").textContent='';$("resultContext").textContent='';
    resetChat(text('welcome'));replaceLookupUrl(window.location.pathname+(waterMode==='pfas'?'':'?view='+waterMode));
  }

  async function performLookup() {
    const raw=$("zipInput").value.trim(),value=siteLanguages?siteLanguages.normalizeDigits(raw):raw;
    searchValues[searchMode]=raw;
    if(searchMode==='zip'){providerSearchGeneration++;$("waterProviderMatches").innerHTML='';renderLookup(value,true);return;}
    const generation=++providerSearchGeneration,target=$("waterProviderMatches"),mode=waterMode;
    if(searchMode==='id'){
      const id=value.toUpperCase();
      if(!/^[A-Z0-9]{1,20}$/.test(id)){clearDisplayedLookup();target.textContent=choose("Enter a valid water system ID.","请输入有效的供水系统编号。","Introduzca un número de sistema válido.");return;}
      target.innerHTML='';await renderSelectedSystem(id);if(generation===providerSearchGeneration&&searchMode==='id')$("zipInput").value=id;return;
    }
    clearDisplayedLookup();
    if(value.length<3){target.textContent=choose("Enter at least 3 characters.","请输入至少3个字符。","Introduzca al menos 3 caracteres.");return;}
    target.textContent=choose("Searching…","正在查找…","Buscando…");
    try{
      const rows=mode==='pfas'?searchPfasProviders(value,'name'):await window.DrinkingWaterRecords.search(value,mode,'name');
      if(generation!==providerSearchGeneration||mode!==waterMode||searchMode!=='provider')return;
      target.innerHTML=rows.length?`<ul class="water-provider-options">${rows.map(r=>`<li><button type="button" data-water-system="${escapeHtml(r[0])}"><bdi data-preserve-language>${escapeHtml(r[1])}</bdi> · <bdi dir="ltr" data-preserve-language>${escapeHtml(r[2])} · ${escapeHtml(r[0])}</bdi></button></li>`).join('')}</ul><p>${choose("Up to 20 matches shown. Confirm the provider name before selecting.","最多显示20个匹配，请核对供水机构名称。","Se muestran hasta 20 coincidencias. Confirme el proveedor antes de elegir.")}</p>`:choose("No matching records in this snapshot. Check with your provider.","此快照中未找到匹配记录，请向供水机构查询。","No hay registros coincidentes. Consulte a su proveedor.");localizeHomeDocument();
    }catch(error){if(generation===providerSearchGeneration)target.textContent=choose("Provider search could not load. Please retry.","无法载入搜索，请重试。","No se pudo cargar la búsqueda. Inténtelo de nuevo.");}
  }


  async function renderAdditionalWater(query) {
    const generation = ++waterGeneration;
    const mode = waterMode;
    const lang = currentLang;
    const zh = lang === "zh";
    currentSystems = [];
    currentContext = "Supplemental chemical records selected. No PFAS result context is selected.";
    resetChat(); // Invalidate an in-flight PFAS explanation before hiding the assistant.
    $("chatPanel").hidden = true;
    if ($("chatDisclosure")) $("chatDisclosure").hidden = true;
    $("result").className = "result additional-records found-below";
    $("resultBody").innerHTML = "";
    $("resultContext").textContent = "";
    if (query.zip && !/^\d{5}$/.test(query.zip)) {
      lastLookupZip = null; lastSystemId = null;
      $("resultTitle").textContent = text("invalidZipTitle");
      $("resultContext").textContent = text("invalidZipContext");
      replaceLookupUrl(`${window.location.pathname}?view=${mode}`);
      localizeHomeDocument();
      return;
    }
    lastLookupZip = query.zip || null;
    lastSystemId = query.id || null;
    if (query.id) $("zipInput").value = "";
    const params = new URLSearchParams({view: mode, ...(query.zip ? {zip: query.zip} : {system: query.id})});
    replaceLookupUrl(`${window.location.pathname}?${params}#result`);
    $("resultTitle").textContent = zh ? "正在载入监测记录…" : "Loading monitoring records…";
    localizeHomeDocument();
    try {
      const data = await window.DrinkingWaterRecords.query({...query, mode});
      if (generation !== waterGeneration) return;
      $("resultTitle").textContent = query.zip ? (zh ? `邮编 ${query.zip}：${data.systems.length}个可能匹配的供水系统` : `${data.systems.length} possible water system${data.systems.length === 1 ? '' : 's'} for ZIP ${query.zip}`) : data.systems.length ? choose('Water-system results','供水系统结果','Resultados del proveedor') : choose('No records found in this snapshot','此快照中未找到记录','No se encontraron registros en esta versión');
      $("resultContext").textContent = query.zip ? (zh ? "报告的邮编关联可能不完整，并非确认家庭供水。请核对水费账单。" : "Reported ZIP associations may be incomplete and do not confirm household service. Match the provider to your water bill.") : (zh ? "按系统编号直接选择；未使用邮编关联。请确认供水机构。" : "Selected by system ID without a ZIP match. Confirm your provider.");
      $("resultBody").innerHTML = window.DrinkingWaterRecords.render(data, mode, lang);
      localizeHomeDocument();
    } catch (error) {
      if (generation !== waterGeneration) return;
      $("resultTitle").textContent = zh ? "暂时无法载入这些记录" : "These records could not be loaded";
      $("resultContext").textContent = zh ? "下载失败并不代表没有检测。请重试或查询EPA原始资料。" : "A download failure does not mean no testing. Please retry or check the original EPA records.";
      $("resultBody").innerHTML = '<p><a href="/methodology/#additional-chemicals">' + (zh ? "数据来源与局限" : "Data sources and limitations") + '</a></p>';
      localizeHomeDocument();
      console.error(error);
    }
  }

  function searchPfasProviders(value,field="all") {
    const query = value.trim().toLowerCase();
    if (query.length < 3) return [];
    const rank = row => row[0].toLowerCase() === query ? 0 : row[1].toLowerCase() === query ? 1 : row[1].toLowerCase().startsWith(query) ? 2 : 3;
    return [...systemsById.values()].map(s => [String(s.pwsid), s.ucmr_pws_name || "", s.sdwis_state_code || ""])
      .filter(r => r[1].toLowerCase().includes(query) || field !== "name" && r[0].toLowerCase().includes(query))
      .sort((a,b) => rank(a) - rank(b) || a[1].length - b[1].length || a[1].localeCompare(b[1])).slice(0,20);
  }

  async function initialize() {
    const requestedLanguage = new URLSearchParams(window.location.search).get("lang");
    if (Object.hasOwn(COPY,requestedLanguage)) currentLang=requestedLanguage;
    else if(siteLanguages)currentLang=siteLanguages.initialLanguage(window.location.search);
    applyLanguage();
    $("releaseStatus").textContent = text("loadingRelease");
    $("lookupButton").textContent = text("loadingData");
    $("lookupDataNote").textContent = text("preparing");
    resetChat();
    loadCounters();
    try {
      const [lookupResponse, metadataResponse, monitoringResponse, zipReviewsResponse, evidenceResponse, linksResponse] = await Promise.all([
        fetch(LOOKUP_URL, { cache: "no-cache" }),
        fetch(METADATA_URL, { cache: "no-cache" }),
        fetch(MONITORING_PERIODS_URL, { cache: "no-cache" }),
        fetch(`${RELEASE_PATH}/zip-association-reviews.json`, { cache: "no-cache" }),
        fetch(`${RELEASE_PATH}/lookup-evidence.json`, { cache: "no-cache" }),
        fetch("/config/provider-links.json", { cache: "no-cache" })
      ]);
      if (!lookupResponse.ok || !metadataResponse.ok || !monitoringResponse.ok || !zipReviewsResponse.ok || !evidenceResponse.ok || !linksResponse.ok) throw new Error("Frozen analysis files unavailable");
      release = await readReviewedLookup(lookupResponse, await zipReviewsResponse.json());
      metadata = await metadataResponse.json();
      const monitoringPeriods = await monitoringResponse.json();
      if (release.release_id !== metadata.release_id || release.release_id !== monitoringPeriods.release_id) throw new Error("Release identifiers do not match");
      const evidenceText = await evidenceResponse.text();
      const evidenceDigest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(evidenceText));
      const evidenceHash = Array.from(new Uint8Array(evidenceDigest), v => v.toString(16).padStart(2, "0")).join("");
      if (evidenceHash !== "66676706b9f2aac3f32725cacdb3210ae9dd391c1a0151d8352970c3f49e1c37") throw new Error("Evidence checksum does not match");
      const evidence = PFASLookupEvidence.validate(JSON.parse(evidenceText), release, release.source_lookup_sha256);
      evidenceById = new Map(Object.entries(evidence.systems));
      providerLinks = (await linksResponse.json()).systems;
      const systems = hydrateRows(release);
      systems.forEach(system => { system._comparisonCoverage = PFASLookupEvidence.coverage(system, evidenceById.get(String(system.pwsid))); });
      const periods = hydrateMonitoringRows(monitoringPeriods);
      systemsById = new Map(systems.map(system => [String(system.pwsid), system]));
      monitoringById = new Map(periods.map(period => [String(period.pwsid), period]));
      updateReleaseLabels();
      $("lookupButton").disabled = false;
      const params = new URLSearchParams(window.location.search);
      if (["lithium", "lcr"].includes(params.get("view"))) waterMode = params.get("view");
      updateWaterModeLabels();
      const deepLink = params.get("zip");
      if (params.has("system")) {
        searchMode="id";searchValues.id=params.get("system");updateSearchControls();
        renderSelectedSystem(params.get("system"));$("zipInput").value=params.get("system");
        requestAnimationFrame(() => $("result").scrollIntoView({block:"start"}));
      } else if (/^\d{5}$/.test(deepLink || "")) {
        $("zipInput").value = deepLink;
        renderLookup(deepLink, false);
      }
    } catch (error) {
      setLoadFailure();
      console.error(error);
    }
    localizeHomeDocument();
  }

  $("lookupButton").addEventListener("click", checkZip);
  $("resultBody").addEventListener("toggle", async event => {
    const details = event.target;
    const id = details.dataset?.pfasSamples;
    if (!id || !details.open || details.dataset.loading || details.dataset.loaded) return;
    const target = details.querySelector(".pfas-sample-content");
    const system = systemsById.get(id);
    if (!target || !system) return;
    const lang = currentLang;
    details.dataset.loading = "true";
    target.textContent = choose("Loading and verifying source samples…","正在载入并核对样本…","Cargando y verificando muestras…");
    try {
      const locations = await window.PFASSampleTrace.query(system);
      if (!details.isConnected || lang !== currentLang) return;
      target.innerHTML = window.PFASSampleTrace.render(locations, system, lang, {calculations:false});
      details.dataset.loaded = "true";
    } catch (error) {
      if (details.isConnected) target.textContent = choose("Sample records could not be loaded or verified. Close and reopen to retry. This does not mean no testing.","无法载入或核对样本。关闭后重新打开以重试。此错误不代表没有检测。","No se pudieron cargar o verificar las muestras. Cierre y vuelva a abrir para reintentar. No significa que no se hayan realizado pruebas.");
      console.error(error);
    } finally { delete details.dataset.loading; }
  }, true);
  $("waterRecordModes")?.addEventListener("change", event => {
    const mode = event.target.value;
    if (!["pfas", "lithium", "lcr"].includes(mode) || mode === waterMode) return;
    waterMode = mode;
    waterGeneration++; providerSearchGeneration++;
    $("waterProviderMatches").innerHTML = "";
    $("chatPanel").hidden = mode !== "pfas";
    applyLanguage();
    if (!lastSystemId && !lastLookupZip) {
      $("resultBody").innerHTML = "";
      $("resultTitle").textContent = "";
      $("resultContext").textContent = "";
      $("result").className = "result";
      replaceLookupUrl(mode === "pfas" ? window.location.pathname : `${window.location.pathname}?view=${mode}`);
    }
  });
  $("lookupSearchModes")?.addEventListener("change",event=>{if(event.target.name==='lookup-search-mode')setSearchMode(event.target.value);});
  $("zipInput").addEventListener("input",()=>{providerSearchGeneration++;$("waterProviderMatches").innerHTML='';});
  $("waterProviderMatches")?.addEventListener("click", event => {
    const button = event.target.closest("[data-water-system]");
    if (button) {
      renderSelectedSystem(button.dataset.waterSystem);
      $("waterProviderMatches").innerHTML = "";
      if(searchMode==='provider')$("zipInput").value=searchValues.provider;
      $("result").scrollIntoView({block:"start"});
    }
  });
  $("zipInput").addEventListener("keydown", event => { if (event.key === "Enter") checkZip(); });
  $("aiSendBtn").addEventListener("click", sendChat);
  $("chatExpandBtn").addEventListener("click", () => {
    $("chatPanel").classList.toggle("chat-expanded");
    updateChatExpansion();
  });
  window.addEventListener("resize", updateChatExpansion);
  $("aiInput").addEventListener("keydown", event => { if (event.key === "Enter") sendChat(); });
  $("aiSuggestions").addEventListener("click", event => {
    const button = event.target.closest("[data-faq-key]");
    if (button) openFaq(button.dataset.faqKey);
  });
  $("faqDialogClose").addEventListener("click", closeFaq);
  $("faqDialog").addEventListener("click", event => { if (event.target === $("faqDialog")) closeFaq(); });
  $("faqDialog").addEventListener("close", () => { activeFaqKey = null; });
  if(typeof SiteLanguageMenu!=="undefined")languageMenu=SiteLanguageMenu.mount($("languageMenu"),currentLang,language=>{
    if(!Object.hasOwn(COPY,language)||language===currentLang)return;
    currentLang=language;siteLanguages?.remember(language);applyLanguage();
    if(!lastSystemId&&!lastLookupZip)replaceLookupUrl(window.location.pathname+(waterMode==='pfas'?'':'?view='+waterMode));
    trackEvent("language_switch",{language:currentLang});
  });

  function openLinkedFeatures() {
    if (!["#features", "#project-features"].includes(window.location.hash)) return;
    const features = $("features");
    if (!features) return;
    features.open = true;
    features.scrollIntoView({ block: "start" });
  }
  window.addEventListener("hashchange", openLinkedFeatures);
  window.addEventListener("load", () => requestAnimationFrame(openLinkedFeatures), { once: true });

  applyLanguage();
  openLinkedFeatures();
  initialize();
})();
