"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const tools = require("../assistant-result-tools.js");

const releasePath = path.join(__dirname, "..", "analysis", "exports", "ucmr5_jan2026_v0_2", "website_lookup_compact.json");
const release = JSON.parse(fs.readFileSync(releasePath, "utf8"));
const systems = release.systems.map(values => Object.fromEntries(release.columns.map((column, index) => [column, values[index]])));
const systemsById = new Map(systems.map(system => [String(system.pwsid), system]));
const zipSystems = (release.zip_to_pwsids["01720"] || []).map(id => systemsById.get(String(id))).filter(Boolean);
const flaggedNames = zipSystems.filter(system => Number(system.any_system_above_mcl_comparison) === 1).map(system => system.ucmr_pws_name).sort();

assert.deepEqual(flaggedNames, ["ACTON WATER SUPPLY DISTRICT", "CONCORD WATER DEPT, MA", "MAYNARD DPW, WATER DIVISION"]);

const unsafeReply = tools.answerComparisonSystems("Which water system in ZIP 01720 is unsafe for my family?", zipSystems, "en");
assert.match(unsafeReply, /does not classify any water system as safe or unsafe/i);
assert.match(unsafeReply, /3 of 4 listed water systems/i);
flaggedNames.forEach(name => assert.ok(unsafeReply.includes(name), `Missing ${name}`));

const countReply = tools.answerComparisonSystems("How many water systems met a comparison?", zipSystems, "en");
assert.match(countReply, /3 of 4 listed water systems/i);
flaggedNames.forEach(name => assert.ok(countReply.includes(name), `Missing ${name}`));

assert.equal(tools.answerComparisonSystems("How do I confirm my water system?", zipSystems, "en"), null);

const chineseReply = tools.answerComparisonSystems("哪些供水系统达到比较水平？", zipSystems, "zh");
assert.match(chineseReply, /4个供水系统中，有3个/);
flaggedNames.forEach(name => assert.ok(chineseReply.includes(name), `Chinese reply missing ${name}`));

assert.match(
  tools.answerBoundaryQuestion("Am I exposed because of this result?", zipSystems, "en"),
  /cannot determine your personal exposure, dose, or health risk/i
);
assert.match(
  tools.answerBoundaryQuestion("What percent of my PFAS exposure comes from drinking water?", zipSystems, "en"),
  /cannot calculate what share/i
);
assert.match(
  tools.answerBoundaryQuestion("Is my utility violating the law?", zipSystems, "en"),
  /do not by themselves determine whether a water system is in compliance/i
);
assert.match(
  tools.answerBoundaryQuestion("Should I see a doctor?", zipSystems, "en"),
  /cannot determine whether someone needs medical care/i
);
assert.match(
  tools.answerBoundaryQuestion("No result means there is no PFAS, right?", [], "en"),
  /does not mean that PFAS is absent/i
);
assert.match(
  tools.answerBoundaryQuestion("Where were the samples collected?", zipSystems, "en"),
  /entry points to the distribution system/i
);
assert.match(
  tools.answerBoundaryQuestion("Where can I find current official results?", zipSystems, "en"),
  /final UCMR 5 dataset in August 2026/i
);
assert.equal(tools.answerBoundaryQuestion("What is PFOA?", zipSystems, "en"), null);

console.log("Assistant deterministic-result and boundary tests passed for ZIP 01720.");
