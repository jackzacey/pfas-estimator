(function attachAssistantResultTools(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PFASAssistantResultTools = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function systemName(system) {
    return String(system?.ucmr_pws_name || "Unnamed public water system").trim();
  }

  function asksForComparisonSystems(question) {
    const value = String(question || "").toLowerCase();
    const mentionsSystem = /\b(?:water\s+)?systems?\b|\butilit(?:y|ies)\b|供水系统|供水机构/.test(value);
    const asksWhichOrHowMany = /\bwhich\b|\bwhat\b|\bhow many\b|\blist\b|\bname(?:s|d)?\b|哪些|哪个|多少|列出|名称/.test(value);
    const mentionsComparison = /\bunsafe\b|\bsafe\b|\bflagged\b|\bcomparisons?\b|\bat or above\b|\babove\b|\bmeets?\b|\bmet\b|\bexceeds?\b|\bexceeded\b|\bhigh\b|不安全|安全|标记|比较水平|达到|超过/.test(value);
    return mentionsSystem && asksWhichOrHowMany && mentionsComparison;
  }

  function answerComparisonSystems(question, systems, language = "en") {
    if (!asksForComparisonSystems(question) || !Array.isArray(systems) || !systems.length) return null;
    const atOrAbove = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1);
    const names = atOrAbove.map(systemName);
    const askedSafety = /\bunsafe\b|\bsafe\b|不安全|安全/.test(String(question || "").toLowerCase());

    if (language === "zh") {
      const safety = askedSafety ? "本网站不会把任何供水系统归类为“安全”或“不安全”。" : "";
      const result = atOrAbove.length
        ? `页面显示的${systems.length}个供水系统中，有${atOrAbove.length}个至少一项完整PFAS年度平均值达到或超过2026年1月冻结的EPA技术援助分类阈值：${names.join("；")}。`
        : `页面显示的${systems.length}个供水系统中，没有系统的完整PFAS年度平均值达到或超过2026年1月冻结的EPA技术援助分类阈值。这并不表示未检出PFAS。`;
      return `${safety}${result}邮政编码关联不能确定哪一个系统为您家供水，请与水费账单上的名称核对并查看供水机构的最新信息。\n\n资料：本页显示的EPA UCMR 5冻结研究数据。`;
    }

    const safety = askedSafety ? "This site does not classify any water system as safe or unsafe. " : "";
    const result = atOrAbove.length
      ? `The page shows ${atOrAbove.length} of ${systems.length} listed water systems with at least one complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff: ${names.join("; ")}. `
      : `All ${systems.length} listed water systems had no complete PFAS yearly average at or above a frozen January 2026 EPA technical-assistance cutoff. This does not mean PFAS was not detected. `;
    return `${safety}${result}A ZIP match does not identify which system serves your home, so compare these names with your water bill and check the utility's current information.\n\nSource: frozen EPA UCMR 5 research data shown on this page.`;
  }

  function answerBoundaryQuestion(question, systems, language = "en") {
    const value = String(question || "").toLowerCase();
    const hasSystems = Array.isArray(systems) && systems.length > 0;
    const asksExposureShare = /(?:percent|percentage|how much|what share|20\s*%)\b.*\b(?:exposure|pfas).*\b(?:water|drinking)|\b(?:exposure|pfas).*\b(?:percent|percentage|what share|20\s*%)/.test(value);
    const asksPersonalExposure = /\b(?:am i|was i|have i been|my|our)\b.*\b(?:exposed|exposure|dose|health risk|cancer risk)\b|我.*(?:暴露|剂量|健康风险|癌症风险)/.test(value);
    const asksCompliance = /\b(?:compliance|compliant|noncompliance|non-compliance|violation|violating|illegal|breaking the law)\b|合规|违规|违法/.test(value);
    const asksSafety = /\b(?:safe|unsafe|dangerous)\b|安全|不安全|危险/.test(value);
    const asksMedical = /\b(?:see|visit|call|ask|need)\b.{0,24}\b(?:doctor|physician|medical care|healthcare professional)\b|(?:看|咨询|联系).{0,12}(?:医生|医疗专业人员)/.test(value);
    const asksNoResultMeaning = /\b(?:no|missing|without)\b.{0,16}\b(?:result|data|record)\b.*\b(?:no pfas|pfas[- ]free|safe|zero|absent)\b|没有.{0,12}(?:结果|数据).{0,12}(?:没有PFAS|安全|零)/.test(value);
    const asksSamplingLocation = /\bwhere\b.*\b(?:sample|sampling|collect|collected|tested)\b|样本.*哪里|在哪里.*采样/.test(value);
    const asksCurrentData = /\b(?:current|latest|newest|up[- ]to[- ]date|official)\b.*\b(?:results?|data|records?|information)\b|(?:最新|当前|官方).*(?:结果|数据|信息)/.test(value);

    if (language === "zh") {
      if (asksExposureShare) return "此查询无法计算饮用水占个人PFAS总暴露的比例。供水系统监测结果不能确定个人剂量；食物、消费品和其他环境来源也可能影响暴露。\n\n资料：EPA和ATSDR的PFAS指南。";
      if (asksPersonalExposure) return "此查询不能根据供水系统监测结果确定您的个人暴露、剂量或健康风险。确认水费账单上的供水机构，并使用该机构的最新信息；确定家庭水龙头浓度需要合适的家庭采样。\n\n资料：本页显示的EPA UCMR 5冻结研究数据。";
      if (asksCompliance) return "UCMR 5监测结果不能单独确定供水系统是否合规。请查看供水机构、州饮用水主管机构或消费者信心报告发布的最新合规信息。\n\n资料：EPA UCMR 5和消费者信心报告指南。";
      if (asksSafety) return "本网站不会把供水系统或家庭水龙头归类为“安全”或“不安全”。该结果是冻结的供水系统监测比较，不能确定当前合规情况、家庭水龙头浓度、个人暴露或健康风险。\n\n资料：本页显示的EPA UCMR 5冻结研究数据。";
      if (asksMedical) return "这项供水系统监测结果本身不能确定某人是否需要医疗护理。如有个人医疗问题，请根据个人病史和适当的暴露信息咨询合格的医疗专业人员。\n\n资料：EPA和ATSDR的PFAS健康指南。";
      if (asksNoResultMeaning) return "没有显示结果并不表示水中没有PFAS，也不表示水是安全或不安全的。请先确认供水机构，然后查看其最新消费者信心报告或联系供水机构；私人水井不在此数据集中。\n\n资料：EPA UCMR 5和消费者信心报告指南。";
      if (asksSamplingLocation) return "UCMR 5样本采自进入配水系统的位置，而不是某个家庭的水龙头。因此结果代表供水系统监测，不代表特定住宅内的水。\n\n资料：EPA UCMR 5采样指南。";
      if (asksCurrentData) return "本网站保留截至2026年1月15日收到的研究快照。EPA已于2026年8月发布最终UCMR 5数据集；最新信息请查看EPA数据查找器、供水机构和消费者信心报告。\n\n资料：EPA UCMR 5数据查找器。";
      return null;
    }

    if (asksExposureShare) return "This lookup cannot calculate what share of a person's total PFAS exposure comes from drinking water. A water-system monitoring result cannot determine personal dose, and food, consumer products, and other environmental sources may also contribute.\n\nSource: EPA and ATSDR PFAS guidance.";
    if (asksPersonalExposure) return "This lookup cannot determine your personal exposure, dose, or health risk from a water-system monitoring result. Confirm the utility on your bill and use its current information; determining a household tap concentration requires appropriate household sampling.\n\nSource: frozen EPA UCMR 5 research data shown on this page.";
    if (asksCompliance) return "UCMR 5 monitoring results do not by themselves determine whether a water system is in compliance. Check current compliance information from the utility, the state drinking-water agency, or its Consumer Confidence Report.\n\nSource: EPA UCMR 5 and Consumer Confidence Report guidance.";
    if (asksSafety) return "This site does not classify a water system or household tap as safe or unsafe. The result is a frozen water-system monitoring comparison and does not determine current compliance, household tap concentration, personal exposure, or health risk.\n\nSource: frozen EPA UCMR 5 research data shown on this page.";
    if (asksMedical) return "This water-system monitoring result alone cannot determine whether someone needs medical care. For a personal medical concern, a qualified healthcare professional would need individual history and appropriate exposure information, not this system result alone.\n\nSource: EPA and ATSDR PFAS health guidance.";
    if (asksNoResultMeaning) return "No displayed result does not mean that PFAS is absent or that the water is safe or unsafe. First confirm the utility, then check its current Consumer Confidence Report or contact it directly; private wells are outside this dataset.\n\nSource: EPA UCMR 5 and Consumer Confidence Report guidance.";
    if (asksSamplingLocation) return "UCMR 5 samples were collected at entry points to the distribution system, not at an individual household faucet. The results therefore describe water-system monitoring, not the water inside a particular home.\n\nSource: EPA UCMR 5 sampling guidance.";
    if (asksCurrentData) return `This site preserves a research snapshot of EPA results received through January 15, 2026${hasSystems ? " for the systems displayed" : ""}. EPA released the final UCMR 5 dataset in August 2026; use the EPA Data Finder, the utility, and its Consumer Confidence Report for current information.\n\nSource: EPA UCMR 5 Data Finder.`;
    return null;
  }

  return { asksForComparisonSystems, answerComparisonSystems, answerBoundaryQuestion };
});
