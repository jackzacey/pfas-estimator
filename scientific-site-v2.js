(() => {
  "use strict";

  const RELEASE_PATH = "/analysis/exports/ucmr5_jan2026_v0_2";
  const LOOKUP_URL = `${RELEASE_PATH}/website_lookup_compact.json`;
  const METADATA_URL = `${RELEASE_PATH}/website_metadata.json`;
  const MONITORING_PERIODS_URL = `${RELEASE_PATH}/website_monitoring_periods.json`;
  const ASSISTANT_URL = "https://pfas-groq-proxy.jackzacey.workers.dev";
  const REQUEST_TIMEOUT_MS = 20000;
  const OUTCOMES = [
    { key: "pfoa", label: "PFOA", fullName: "Perfluorooctanoic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "Study benchmark: 4.05 ppt", reportingLimit: 4, federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfos", label: "PFOS", fullName: "Perfluorooctane sulfonic acid", benchmark: "April 2024 federal level: 4 ppt", cutoff: "Study benchmark: 4.05 ppt", reportingLimit: 4, federalLevel: 4, comparisonCutoff: 4.05 },
    { key: "pfhxs", label: "PFHxS", fullName: "Perfluorohexane sulfonic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Study benchmark: 15 ppt", reportingLimit: 3, federalLevel: 10, comparisonCutoff: 15 },
    { key: "pfna", label: "PFNA", fullName: "Perfluorononanoic acid", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Study benchmark: 15 ppt", reportingLimit: 4, federalLevel: 10, comparisonCutoff: 15 },
    { key: "hfpo_da", label: "HFPO-DA", fullName: "GenX chemicals", benchmark: "April 2024 federal level: 10 ppt", cutoff: "Study benchmark: 15 ppt", reportingLimit: 5, federalLevel: 10, comparisonCutoff: 15 },
    { key: "hi", label: "Hazard Index", labelZh: "危害指数", fullName: "PFAS mixture measure", benchmark: "April 2024 federal level: 1", cutoff: "Study benchmark: 1.5 with at least 2 detected components", federalLevel: 1, comparisonCutoff: 1.5 },
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
      releaseBadge: "National · EPA UCMR 5 Data · Educational Tool",
      heroTitle: "Check for PFAS in your water system",
      heroSubtitle: "PFAS are chemical pollutants. Enter your ZIP code to find available test results for public water systems in your area.",
      truthNote: "<strong>Find your water provider.</strong> A ZIP code may list several systems. Match the name to your water bill. Private wells are not included.",
      printButton: "Print or save this water-system result",
      chatTitle: "PFAS Results Assistant", chatSubtitle: "Get help understanding PFAS and these results",
      expandChat: "Show full conversation", collapseChat: "Collapse conversation",
      suggestConcern: "What can this result tell me?", suggestUtility: "How do I confirm my utility?", suggestFilter: "Where were samples collected?", suggestHealth: "Where are current results?",
      askButton: "Ask", chatDisclaimer: "AI answers may be wrong. Do not share personal or medical information. The ZIP results do not use AI.", chatLearnMore: "How it works",
      quickExplanation: "Quick explanation", closeExplanation: "Close",
      faqResultTitle: "What this result can tell you",
      faqResultBody: "It shows what EPA testing found in a public water system during the dates listed. Confirm the provider on your water bill first. These samples cannot tell us the PFAS level at your faucet, your personal exposure or health risk, or whether the water meets current drinking-water rules.",
      faqUtilityTitle: "How to confirm your water utility",
      faqUtilityBody: "Match the complete water-system name on this page to the name on your water bill. If they do not match, contact your local water department or city. A ZIP code can contain several systems and is only used here to find possible matches.",
      faqSamplingTitle: "Where EPA collected the samples",
      faqSamplingBody: "UCMR 5 samples were collected at points where treated water enters the distribution system, not at household faucets. The sampling period shown on each system card tells you when the displayed monitoring occurred.",
      faqCurrentTitle: "Where to find current official information",
      faqCurrentBody: "The data here include results received by EPA through January 15, 2026. Newer results may be available in EPA’s Data Finder. Ask your water provider about recent PFAS tests and treatment, and check its annual water-quality report, called a Consumer Confidence Report.",
      faqMore: "Read the full explanation →", faqCcrLink: "Find your water-quality report →", faqCurrentLink: "Check newer EPA results →",
      searchCounter: "ZIP searches",
      loadingRelease: "Loading verified release…", releaseUnavailable: "Release unavailable", dataUnavailable: "Data unavailable", loadingData: "Loading data…",
      preparing: "Preparing EPA data.", findSystems: "Find results",
      verifiedRelease: "Verified release", monitoredSystems: "water systems", zipAssociations: "ZIP codes covered", resultsThrough: "EPA results through January 15, 2026",
      loadFailure: "The verified data release could not be loaded. Please use EPA’s UCMR 5 Data Finder while this is resolved.",
      invalidZipTitle: "Enter a valid 5-digit ZIP code", invalidZipContext: "ZIP codes must contain exactly five numbers.",
      noAssociationTitle: zip => `We could not match a water system to ZIP ${zip}`,
      noAssociationContext: "A missing result does not mean your water is free of PFAS. Our data may not include your provider or its link to this ZIP code.",
      noAssociationBody: "Find your provider’s name on your water bill, then ask it for recent PFAS results or search EPA’s Data Finder by name. If you use a private well, ask your state or local health or environmental agency about testing. Private wells are not included here.",
      openDataFinder: "Open EPA’s UCMR 5 Data Finder →",
      associatedTitle: (count, zip) => `${count} water system${count === 1 ? "" : "s"} listed for ZIP ${zip}`,
      associatedContext: (aboveCount, totalCount) => totalCount === 1
        ? "Check that this provider’s name matches your water bill. A ZIP match alone cannot confirm who supplies your home."
        : "Find the provider named on your water bill below. These systems have separate results; a finding at one may not apply to your provider.",
      communitySystem: "Community water system", publicSystem: "Public water system", residentialNotUsed: "residential Census context is not used for this system",
      completeUnavailable: "Not enough required samples for a yearly comparison", atLeastOne: "At or above an EPA-based study benchmark", detectedBelow: "Detected below all study benchmarks", belowReporting: "Below EPA reporting levels", noLocationMeets: "No yearly average was at or above a study benchmark",
      populationServed: "Population served", source: "Primary source", ownership: "Ownership", samplingLocations: "Sampling locations", monitoringPeriod: "Sampling period", serviceBoundary: "Service boundary", sdwisStatus: "SDWIS status",
      notReported: "Not reported", notAvailable: "Not available", unnamed: "Unnamed public water system",
      measure: "PFAS", highestAverage: "Highest yearly average", benchmarkHeading: "EPA-based study benchmark", comparisonHeading: "Result",
      noCompleteAverage: "Not enough required samples", meets: "At or above study benchmark", detectedDoesNotMeet: "Detected below study benchmark", belowReportingLevel: "Below EPA reporting level", doesNotMeet: "Below study benchmark",
      demographicSummary: "Service-area demographic context used in the research analysis", demographicNote: "Ecological estimates for the modeled service area; these do not describe any individual customer.",
      hispanic: "Hispanic", black: "non-Hispanic Black", aian: "non-Hispanic AIAN", poverty: "below poverty", rural: "rural",
      resultBoundaryTitle: "How to read the numbers",
      resultBoundaryBody: "The dates below show when EPA monitored each system. EPA sampled where treated water enters the distribution system, not at household faucets. If a result is below an EPA reporting level, it does not mean the concentration was zero or that the compound was absent. These results cannot identify the water system for a specific home or determine current legal compliance, household tap-water levels, personal exposure, or health risk.",
      keyTerms: "Key terms on this page",
      completeMonitoringTerm: "Complete monitoring",
      completeMonitoringDefinition: "For at least one sampling location, the water system had every required sample needed to calculate a yearly average. It does not mean every location or home was tested.",
      studyBenchmarkTerm: "EPA-based study benchmark",
      studyBenchmarkDefinition: "This research uses an unrounded cutoff to reproduce EPA’s January 2026 technical-assistance classification based on the April 2024 federal levels. The benchmark is fixed for this study. It is not a current federal or state standard, and it does not show whether a water system complies with the law.",
      reportingLevelTerm: "EPA reporting level",
      reportingLevelDefinition: "The lowest concentration that UCMR 5 reports as a number for that compound. A result below this level is not a measured zero and does not prove that the compound was absent.",
      welcome: "Ask about PFAS, a result you see, or where to find recent tests. You can also use the quick explanations below.",
      contextReadyAbove: "Your results are ready below. Ask me to explain a chemical or comparison, or help you find recent tests. If several providers are listed, include your provider’s name.",
      contextReadyBelow: "Your results are ready below. Ask me what was found or what a missing or below-limit result means. If several providers are listed, include your provider’s name.",
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
      heroTitle: "查查您的供水系统是否检出PFAS",
      heroSubtitle: "PFAS是一类化学污染物。输入邮政编码，查找您所在地区公共供水系统的检测结果。",
      truthNote: "<strong>先确认供水机构。</strong>一个邮政编码可能列出多个系统。请与水费账单上的名称核对。这里不包括私人水井。",
      printButton: "打印或保存此供水系统结果",
      chatTitle: "PFAS结果助手", chatSubtitle: "打开简要说明或询问监测结果",
      expandChat: "展开完整对话", collapseChat: "收起对话",
      suggestConcern: "这项结果能说明什么？", suggestUtility: "如何确认我的供水机构？", suggestFilter: "样本在哪里采集？", suggestHealth: "在哪里查看最新结果？",
      askButton: "提问", chatDisclaimer: "AI可能出错。请勿分享姓名或医疗详情。邮政编码结果不使用AI。", chatLearnMore: "工作原理",
      quickExplanation: "简要说明", closeExplanation: "关闭",
      faqResultTitle: "这项结果能说明什么",
      faqResultBody: "它显示所列公共供水系统的冻结EPA监测结果及采样时间。它不能确认该系统是否为您家供水，也不能确定当前合规情况、家庭水龙头浓度、个人暴露或健康风险。",
      faqUtilityTitle: "如何确认您的供水机构",
      faqUtilityBody: "请将本页完整的供水系统名称与水费账单上的名称核对。如果不一致，请联系当地供水部门或城市。一个邮政编码可能包含多个系统，此处仅用邮政编码查找可能的匹配。",
      faqSamplingTitle: "EPA在哪里采样",
      faqSamplingBody: "UCMR 5样本采自处理后的水进入配水系统的位置，而不是家庭水龙头。每张系统卡上的采样期说明所显示监测的时间。",
      faqCurrentTitle: "在哪里查找最新官方信息",
      faqCurrentBody: "本网站保留截至2026年1月15日收到的EPA结果。更新的联邦记录请使用EPA UCMR 5数据查找器。当前当地处理和合规信息请查看供水机构的消费者信心报告或联系供水机构。",
      faqMore: "查看完整说明 →", faqCcrLink: "查找消费者信心报告 →", faqCurrentLink: "打开EPA数据查找器 →",
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
      associatedContext: (aboveCount, totalCount) => totalCount === 1 ? "请将供水机构名称与水费账单核对。仅凭邮政编码不能确认谁为您家供水。" : "请在下方找到水费账单上的供水机构。每个系统的结果各不相同，其他系统的结果可能不适用于您的供水机构。",
      communitySystem: "社区供水系统", publicSystem: "公共供水系统", residentialNotUsed: "此系统不使用居民人口普查背景",
      completeUnavailable: "规定样本不足，无法进行年度比较", atLeastOne: "达到或超过基于EPA的研究基准", detectedBelow: "已检出，但低于所有研究基准", belowReporting: "低于EPA报告限值", noLocationMeets: "没有年度平均值达到或超过研究基准",
      populationServed: "服务人口", source: "主要水源", ownership: "所有权", samplingLocations: "采样点", monitoringPeriod: "采样期", serviceBoundary: "服务区边界", sdwisStatus: "SDWIS状态",
      notReported: "未报告", notAvailable: "不可用", unnamed: "未命名公共供水系统",
      measure: "指标", highestAverage: "最高年度平均值", benchmarkHeading: "基于EPA的研究基准", comparisonHeading: "结果",
      noCompleteAverage: "规定样本不足", meets: "达到或超过研究基准", detectedDoesNotMeet: "已检出；低于研究基准", belowReportingLevel: "低于EPA报告限值", doesNotMeet: "低于研究基准",
      demographicSummary: "研究分析使用的服务区人口背景", demographicNote: "这是模型服务区的生态估计，不描述任何个人客户。",
      hispanic: "西班牙裔", black: "非西班牙裔黑人", aian: "非西班牙裔美洲印第安人/阿拉斯加原住民", poverty: "低于贫困线", rural: "农村",
      resultBoundaryTitle: "使用结果前请先阅读",
      resultBoundaryBody: "下方日期说明EPA何时监测每个供水系统。样本采自处理后的水进入配水系统的位置，而不是家庭水龙头。低于EPA报告限值不等于浓度为零，也不能证明该化合物不存在。这些结果不能确认某个住宅的供水系统，也不能确定当前法律合规情况、家庭水龙头浓度、个人暴露或健康风险。",
      keyTerms: "本页重要术语",
      completeMonitoringTerm: "完整监测",
      completeMonitoringDefinition: "该供水系统至少一个采样点具有计算年度平均值所需的全部规定样本。这不表示每个采样点或每个家庭都接受了检测。",
      studyBenchmarkTerm: "基于EPA的研究基准",
      studyBenchmarkDefinition: "本研究使用未舍入阈值，以重现EPA于2026年1月基于2024年4月联邦水平作出的技术援助分类。该基准在本研究中保持固定。它不是现行的联邦或州标准，也不能说明供水系统是否符合法律要求。",
      reportingLevelTerm: "EPA报告限值",
      reportingLevelDefinition: "UCMR 5将该化合物作为数值报告的最低浓度。低于此值不等于测得为零，也不能证明该化合物不存在。",
      welcome: "您可以询问如何理解监测结果、确认供水系统、了解采样位置或查找最新官方信息。",
      contextReadyAbove: "一项或多项年度平均值达到或超过基于EPA的研究基准。我可以解释这意味着什么、如何确认供水机构或在哪里查找最新信息。",
      contextReadyBelow: "没有完整年度平均值达到或超过基于EPA的研究基准。我可以解释为何这不表示PFAS不存在，也不能确定当前状况。",
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
  let monitoringById = new Map();
  let currentContext = "";
  let currentSystems = [];
  let chatMessages = [];
  let lastLookupZip = null;
  let activeFaqKey = null;
  let chatGeneration = 0;

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
    if ($("faqDialogClose")) {
      $("faqDialogClose").textContent = text("closeExplanation");
      $("faqDialogClose").setAttribute("aria-label", text("closeExplanation"));
    }
    if (activeFaqKey) populateFaq(activeFaqKey);
    if (release) updateReleaseLabels();
    if (lastLookupZip && release) renderLookup(lastLookupZip, false);
    else resetChat(text("welcome"));
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
    if (isHazardIndex) return numeric.toFixed(3);
    return `${(numeric * 1000).toLocaleString(currentLang === "zh" ? "zh-CN" : "en-US", { maximumFractionDigits: 2 })} ppt`;
  }

  function formatOutcomeValue(outcome, status) {
    if (!status.full) return text("notAvailable");
    if (status.belowReporting && outcome.key !== "hi") {
      return currentLang === "zh"
        ? `低于 ${outcome.reportingLimit} ppt`
        : `Below ${outcome.reportingLimit} ppt`;
    }
    if (status.belowReporting && outcome.key === "hi") {
      return currentLang === "zh" ? "0.000（计算值）" : "0.000 (calculated)";
    }
    return formatAverage(status.maximum, outcome.key === "hi");
  }

  function formatMonitoringPeriod(system) {
    const period = monitoringById.get(String(system.pwsid));
    if (!period) return text("notReported");
    const locale = currentLang === "zh" ? "zh-CN" : "en-US";
    const start = new Date(`${period.monitoring_start}T00:00:00Z`);
    const end = new Date(`${period.monitoring_end}T00:00:00Z`);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return period.monitoring_years || text("notReported");
    if (period.monitoring_start === period.monitoring_end) {
      return start.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    }
    if (start.getUTCFullYear() === end.getUTCFullYear()) {
      const startText = start.toLocaleDateString(locale, { month: "short", day: "numeric", timeZone: "UTC" });
      const endText = end.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
      return currentLang === "zh" ? `${startText}至${endText}` : `${startText} to ${endText}`;
    }
    const startText = start.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    const endText = end.toLocaleDateString(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
    return currentLang === "zh" ? `${startText}至${endText}` : `${startText} to ${endText}`;
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
      ? (isZh ? "最高年度平均值达到或超过本研究的比较水平。" : "The highest yearly average reached or exceeded this study’s comparison level.")
      : status.className === "below"
        ? (isZh ? "最高年度平均值低于本研究的比较水平。" : "The highest yearly average was below this study’s comparison level.")
        : (isZh ? "规定样本不足，暂时不能进行年度比较。" : "There are not enough required samples for a yearly comparison.");
    const comparisonRatio = (valuePpt / outcome.comparisonCutoff) * 100;
    const gaugeFillPct = Math.min(comparisonRatio, 150) / 150 * 100;
    const ratioLabel = isZh ? "年度平均值与研究比较水平" : "Yearly average compared with the study level";
    const benchmarkCopy = isZh
      ? `研究比较水平：${outcome.comparisonCutoff} 万亿分之一`
      : `Study comparison level: ${outcome.comparisonCutoff} parts per trillion`;
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
        <p class="compound-incomplete-note">${escapeHtml(benchmarkCopy)}</p>
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

  function renderResultNextStep() {
    const isZh = currentLang === "zh";
    const copy = isZh
      ? "如果这是您的供水机构，请查看其最新年度水质报告（消费者信心报告），并询问：“最近的PFAS检测发现了什么？此后是否增加了处理措施？”"
      : "If this is your provider, check its latest annual water-quality report (Consumer Confidence Report). Ask: “What did your most recent PFAS tests find, and has treatment changed since then?”";
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
      <p>${isZh ? "本页只包含EPA截至2026年1月15日收到的检测结果。新结果可能已经发布。" : "These data include results received by EPA through January 15, 2026. Newer tests may be available."}</p>
      <div class="result-glossary">
        <dl>
          <div><dt>${isZh ? "年度平均值是什么？" : "What is the yearly average?"}</dt><dd>${isZh ? "我们按采样点计算一年的平均值，再显示该系统中最高的平均值。低于报告限值的样本按零参与计算，但不代表实际浓度为零。" : "We average the samples from a year at each testing location, then show the highest of those averages for the system. Samples below the reporting limit count as zero in the calculation; they are not measured zeros."}</dd></div>
          <div><dt>${isZh ? "研究比较水平是什么？" : "What is the study comparison level?"}</dt><dd>${isZh ? "这是基于2024年4月EPA水平的固定研究基准，不是现行联邦或州标准。低于它不能证明水是安全的，达到或超过它也不能确定违法。" : "It is a fixed research benchmark based on April 2024 EPA levels, not a current federal or state standard. A lower result does not establish safety; reaching or exceeding it does not establish a legal violation."}</dd></div>
          <div><dt>${isZh ? "万亿分之一是什么？" : "What does parts per trillion mean?"}</dt><dd>${isZh ? "它表示水中化学物质的浓度，缩写为ppt，不是健康风险评分。" : "It describes the concentration of a chemical in water. The abbreviation is ppt. It is not a health-risk score."}</dd></div>
        </dl>
      </div>
      <a href="/methodology/#outcomes">${isZh ? "完整计算方法、报告限值和局限 →" : "Full calculations, reporting limits and limitations →"}</a>
      · <a href="https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder" target="_blank" rel="noopener noreferrer">${text("faqCurrentLink")}</a>
      <div class="result-glossary"><dl>${renderStateContext(systems)}</dl></div>
    </aside>`;
  }

  function renderOutcomeList(system) {
    return OUTCOMES.map(outcome => {
      const status = outcomeStatus(system, outcome);
      const value = formatOutcomeValue(outcome, status);
      const label = currentLang === "zh" && outcome.labelZh ? outcome.labelZh : outcome.label;
      const detail = status.belowReporting && outcome.key !== "hi"
        ? (currentLang === "zh"
          ? `UCMR 5报告限值：${outcome.reportingLimit} ppt · 低于限值的结果在年度平均值计算中按零计`
          : `UCMR 5 reporting level: ${outcome.reportingLimit} ppt · Below-limit results count as zero in the yearly-average calculation`)
        : status.belowReporting && outcome.key === "hi"
          ? (currentLang === "zh" ? "PFAS混合物计算指标 · 研究基准：1.5" : "Calculated PFAS-mixture measure · Study benchmark: 1.5")
          : `${outcome.benchmark} · ${outcome.cutoff}`;
      return `<div class="compound-result-row ${status.className}">
        <div><span class="compound-tag ${status.className === "above" ? "above" : ""}">${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
        <div><span>${escapeHtml(status.label)}</span><small>${escapeHtml(detail)}</small></div>
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

  function renderSystem(system) {
    const above = Number(system.any_system_above_mcl_comparison) === 1;
    const complete = Number(system.any_system_full_set) === 1;
    const detectedOutcomes = OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .filter(outcome => (numericAverage(outcome, outcomeStatus(system, outcome)) || 0) > 0);
    const isZh = currentLang === "zh";
    const allIndividualComplete = OUTCOMES.filter(outcome => outcome.key !== "hi").every(outcome => outcomeStatus(system, outcome).full);
    const headline = above || detectedOutcomes.length
      ? (isZh ? "检出了PFAS" : "PFAS were found")
      : !allIndividualComplete
        ? (isZh ? "检测数据不完整" : "Testing data are incomplete")
        : (isZh ? "未达到检测报告限值" : "No detections at reporting limits");
    const finding = !complete && !above && !detectedOutcomes.length
      ? (isZh ? "规定样本不足，无法进行年度比较。我们无法根据缺失的结果判断是否存在PFAS。" : "There are not enough required samples for a yearly comparison. Missing results cannot tell us whether PFAS were present.")
      : above
      ? (isZh ? "至少一项化学物质或混合物的年度平均值达到或超过本研究的比较水平。下方可查看具体结果。" : "At least one chemical or mixture yearly average reached or exceeded this study’s comparison level. The results below show which ones.")
      : detectedOutcomes.length
        ? (isZh ? "样本中检出了PFAS。在资料足够的年度比较中，没有达到或超过本研究比较水平的结果。" : "PFAS were found in the samples. Where enough samples were available, no yearly comparison reached or exceeded the study level.")
        : (isZh ? "在资料完整的结果中，本页五种PFAS均未达到EPA报告限值。更低浓度仍可能存在。" : "In the results with complete sampling, the five PFAS shown were not detected at or above EPA reporting limits. Smaller amounts may still have been present.");
    const detailsLabel = isZh ? "全部检测数字及供水系统信息" : "All test numbers and water-system details";
    const featuredOutcomes = OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .map(outcome => ({ outcome, status: outcomeStatus(system, outcome) }))
      .filter(item => (numericAverage(item.outcome, item.status) || 0) > 0)
      .sort((a, b) => Number(b.status.className === "above") - Number(a.status.className === "above") || ((numericAverage(b.outcome, b.status) || 0) / b.outcome.comparisonCutoff) - ((numericAverage(a.outcome, a.status) || 0) / a.outcome.comparisonCutoff));
    const featuredMarkup = featuredOutcomes.length
      ? `<div class="compound-education-list">${featuredOutcomes.map(item => renderCompoundEducationCard(system, item.outcome)).join("")}</div>`
      : "";
    return `<article class="detail-box system-summary-card water-system-card ${above ? "has-comparison" : ""}">
      <header class="system-summary-head">
        <div><span class="system-state-label">${escapeHtml(system.sdwis_state_code || "US")} ${currentLang === "zh" ? "供水系统" : "WATER SYSTEM"}</span><h3>${escapeHtml(system.ucmr_pws_name || text("unnamed"))}</h3><p>PWSID ${escapeHtml(system.pwsid)}</p></div>
        <span class="system-summary-status ${above ? "above" : complete ? "below" : "incomplete"}">${escapeHtml(headline)}</span>
      </header>
      <p class="water-system-match">${isZh ? "这是您的供水机构吗？请与水费账单上的名称核对。" : "Is this your water provider? Match the name to your water bill."}</p>
      <div class="system-fact-strip">
        <span><strong>${isZh ? "检测日期" : "When samples were taken"}</strong>${escapeHtml(formatMonitoringPeriod(system))}</span>
      </div>
      <div class="consumer-no-detections"><p>${finding}</p>${!allIndividualComplete ? `<p>${isZh ? "部分化学物质缺少规定样本，因此无法完成所有年度比较。" : "Some chemicals are missing required samples, so not every yearly comparison is available."}</p>` : ""}</div>
      <p class="water-system-match">${isZh ? "这些样本采自处理后的水进入管网的位置。它们不能说明您家水龙头的PFAS浓度、您的个人暴露或健康风险，也不能确定是否符合现行饮用水规定。" : "These samples were taken where treated water enters the pipe network. They cannot tell us the PFAS level at your faucet, your personal exposure or health risk, or whether the water meets current drinking-water rules."}</p>
      ${renderResultNextStep()}
      <p class="water-system-match">${isZh ? "下方每个浓度数字都是该系统各采样点年度平均值中的最高值。比较水平是基于2024年4月EPA水平的研究基准，不是现行标准。" : "Each concentration below is the highest yearly average across this system’s testing locations. Comparison levels are research benchmarks based on April 2024 EPA levels, not current drinking-water standards."} <a href="#lookup-number-guide">${isZh ? "数字说明" : "How the numbers work"}</a></p>
      ${featuredMarkup}
      ${renderHazardIndexEducation(system)}
      <details class="compound-results-details">
        <summary>${detailsLabel}</summary>
        <div class="system-fact-strip">
          <span><strong>${text("populationServed")}</strong>${formatInteger(system.population_served_count)}</span>
          <span><strong>${text("source")}</strong>${escapeHtml(system.primary_source_desc || text("notReported"))}</span>
          <span><strong>${text("samplingLocations")}</strong>${formatInteger(system.sampling_location_count)}</span>
        </div>
        <div class="compound-result-list">${renderOutcomeList(system)}</div>
      </details>
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

  function buildAssistantContext(systems) {
    if (!systems.length) return "No water system was found for the searched ZIP in this EPA-linked file. This does not establish that the water is PFAS-free; the user should check a water bill, contact the local utility, or determine whether the home uses a private well.";
    const selected = systems.slice(0, 10);
    const lines = [
      `Release: ${release.release_id}.`,
      "The ZIP link can list multiple water systems and does not confirm the utility for a specific home. The user should match the system name to a water bill.",
      "UCMR 5 samples were collected at entry points to the distribution system, not at a household faucet. The page identifies each system's sampling period. Each numeric PFAS value is the highest EPA-derived annual average among that water system's sampling locations. A below-reporting-level result is not proof that the concentration was zero. Comparison labels do not determine current compliance, household tap concentration, personal exposure, safety, or health risk.",
      `Water systems displayed: ${systems.length}.`
    ];
    const comparisonSystems = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1);
    lines.push(`Water systems with at least one yearly average at or above an EPA-based study benchmark: ${comparisonSystems.length}. The benchmark is the unrounded cutoff used by this research to reproduce EPA's January 2026 technical-assistance classification around the April 2024 federal levels; it is not a current standard or compliance finding. Names: ${comparisonSystems.length ? comparisonSystems.map(system => system.ucmr_pws_name).join("; ") : "none"}. A zero count does not mean PFAS was not detected.`);
    selected.forEach(system => {
      const outcomes = OUTCOMES.map(outcome => {
        const status = outcomeStatus(system, outcome);
        return `${outcome.label}: ${formatOutcomeValue(outcome, status)}; ${status.label}`;
      }).join(" | ");
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
    const detectedSystemCount = systems.filter(system => OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .some(outcome => (numericAverage(outcome, outcomeStatus(system, outcome)) || 0) > 0)).length;
    const hasAnyDisplayedDetection = systems.some(system => OUTCOMES
      .filter(outcome => outcome.key !== "hi")
      .some(outcome => (numericAverage(outcome, outcomeStatus(system, outcome)) || 0) > 0));
    result.className = aboveCount ? "result found-above" : "result found-below";
    title.textContent = text("associatedTitle")(systems.length, zip);
    context.textContent = text("associatedContext")(aboveCount, systems.length, detectedSystemCount);
    body.innerHTML = `${systems.map(renderSystem).join("")}${hasAnyDisplayedDetection ? renderFilterGuide() : ""}<div id="lookup-number-guide">${renderResultBoundary(systems)}</div>`;
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
      const [lookupResponse, metadataResponse, monitoringResponse] = await Promise.all([
        fetch(LOOKUP_URL, { cache: "no-cache" }),
        fetch(METADATA_URL, { cache: "no-cache" }),
        fetch(MONITORING_PERIODS_URL, { cache: "no-cache" })
      ]);
      if (!lookupResponse.ok || !metadataResponse.ok || !monitoringResponse.ok) throw new Error("Frozen analysis files unavailable");
      release = await lookupResponse.json();
      metadata = await metadataResponse.json();
      const monitoringPeriods = await monitoringResponse.json();
      if (release.release_id !== metadata.release_id || release.release_id !== monitoringPeriods.release_id) throw new Error("Release identifiers do not match");
      const systems = hydrateRows(release);
      const periods = hydrateMonitoringRows(monitoringPeriods);
      systemsById = new Map(systems.map(system => [String(system.pwsid), system]));
      monitoringById = new Map(periods.map(period => [String(period.pwsid), period]));
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
  function toggleLanguage() { currentLang = currentLang === "en" ? "zh" : "en"; applyLanguage(); trackEvent("language_switch", { language: currentLang }); }
  $("languageToggle").addEventListener("click", toggleLanguage);
  $("languageToggle").addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleLanguage(); } });

  applyLanguage();
  initialize();
})();
