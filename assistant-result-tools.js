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
    const flagged = systems.filter(system => Number(system.any_system_above_mcl_comparison) === 1);
    const names = flagged.map(systemName);
    const askedSafety = /\bunsafe\b|\bsafe\b|不安全|安全/.test(String(question || "").toLowerCase());

    if (language === "zh") {
      const safety = askedSafety ? "本网站不会把任何供水系统归类为“安全”或“不安全”。" : "";
      const result = flagged.length
        ? `页面显示的${systems.length}个供水系统中，有${flagged.length}个至少一项PFAS年度平均值达到或超过EPA技术比较水平：${names.join("；")}。`
        : `页面显示的${systems.length}个供水系统中，没有系统的完整PFAS年度平均值达到或超过EPA技术比较水平。`;
      return `${safety}${result}邮政编码关联不能确定哪一个系统为您家供水，请与水费账单上的名称核对。\n\n资料：本页显示的EPA UCMR 5数据。`;
    }

    const safety = askedSafety ? "This site does not classify any water system as safe or unsafe. " : "";
    const result = flagged.length
      ? `The page shows ${flagged.length} of ${systems.length} listed water systems with at least one PFAS yearly average at or above an EPA technical comparison: ${names.join("; ")}. `
      : `None of the ${systems.length} listed water systems had a complete PFAS yearly average at or above an EPA technical comparison. `;
    return `${safety}${result}A ZIP match does not identify which system serves your home, so compare these names with your water bill.\n\nSource: EPA UCMR 5 data shown on this page.`;
  }

  return { asksForComparisonSystems, answerComparisonSystems };
});
