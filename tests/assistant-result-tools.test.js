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

console.log("Assistant deterministic-result tests passed for ZIP 01720.");
