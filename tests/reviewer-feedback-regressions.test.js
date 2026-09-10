"use strict";

const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = relative => fs.readFileSync(path.join(root, relative));
const readText = relative => read(relative).toString("utf8");
const sha256 = relative => crypto.createHash("sha256").update(read(relative)).digest("hex");

const frozenHashes = {
  "analysis/PROTOCOL.md": "402d7d8ef6469058f67e022717b2a4375c87b94b4ce3a89444f1a667b49097e2",
  "analysis/exports/ucmr5_jan2026_v0_2/release_manifest.json": "1f2336bccc62e55f43ecb9e50a84bb875e36c9cd04f9ee20cac25201fd227612",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_cohort_flow.csv": "c3efa8e4e6e4efdcb0013ebf67caff4e65c10500669d0609f1251b0627281494",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_policy_scenario.csv": "2801732c18b4bf002f5d10b41f56590a51933c7962b8b5afa2f530c370bfe322",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_primary_outcome_counts.csv": "eec614812b53217304da1409fd74166eafba94c015b0acba345f2d38d6a5a6bd",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_primary_sensitivities.csv": "785a946f0a0427a2d9b31100f50b082db60aea258cae151be2ebaa19c3d3f898",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_secondary_outcomes.csv": "b199a18bf699e5e9b0cfb2875831fdcfb0fbab2c7d303f77cfa6e8d79734e682",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_table1.csv": "385e0656eb97af069feefd7e8612f5dfe670641c638a28394f787aaf83a30b84",
  "analysis/exports/ucmr5_jan2026_v0_2/manuscript_table2.csv": "801f077f6602dcb731a842fb2e23b1a735a7d4a4595fc544a7e87f06974a9e55",
  "analysis/exports/ucmr5_jan2026_v0_2/website_lookup_compact.json": "0352a53470b61e6dc8a2999b58d7cdd7b227b60407a91eaef70bf5236b269115",
  "analysis/exports/ucmr5_jan2026_v0_2/website_metadata.json": "b54f75e826cff5adb704126388fe5778b53be71f68cb1693e37ccd59f803df7c",
  "analysis/exports/ucmr5_jan2026_v0_2/website_state_summary.json": "64a26545de18c6e50880d618d3c9144a7a8c063fa280aa55beda301119078f2b",
  "analysis/exports/ucmr5_jan2026_v0_2/website_zip_to_monitored_systems.json": "35fb1bdfd48901944519324134badbb93a4f3755de04bc437302f1960aaae608",
  "config/thresholds.json": "d27231e8473ada527017b5ebc77b51e1ebdc04b3af2a64bd61a93fa89970e146",
};

Object.entries(frozenHashes).forEach(([relative, expected]) => {
  assert.equal(sha256(relative), expected, `${relative} changed even though the research release is frozen`);
});

const approvedStyleHashes = {
  "styles.css": "6ad4148ba4062131babd7fc9326e915914a6a8d7efd02c7d32a0b8f5dbc1d817",
  "scientific-site-v2.css": "2d6a139e20ee7170ea3ed47c61aee6902691f88aaa06c167164f020fb0951174",
};
Object.entries(approvedStyleHashes).forEach(([relative, expected]) => {
  assert.equal(sha256(relative), expected, `${relative} changed outside the approved readability revision`);
});

assert.equal(
  sha256("analysis/exports/ucmr5_jan2026_v0_2/website_monitoring_periods.json"),
  "a2c56f2b34cd76db6efd00d9318cd08ea661f0c02e6e6b17b3f078ab5cfd0513",
  "Website sampling-period context changed without an intentional rebuild",
);

const metadata = JSON.parse(readText("analysis/exports/ucmr5_jan2026_v0_2/website_metadata.json"));
assert.equal(metadata.primary_inferential_cohort.systems, 8069);
assert.equal(metadata.primary_inferential_cohort.events, 964);

const monitoringPeriods = JSON.parse(readText("analysis/exports/ucmr5_jan2026_v0_2/website_monitoring_periods.json"));
assert.equal(monitoringPeriods.release_id, metadata.release_id);
assert.equal(monitoringPeriods.systems.length, 10289);
const monitoringColumns = monitoringPeriods.columns;
const bostonPeriodValues = monitoringPeriods.systems.find(row => row[0] === "MA3035000");
const bostonPeriod = Object.fromEntries(monitoringColumns.map((column, index) => [column, bostonPeriodValues[index]]));
assert.equal(bostonPeriod.monitoring_start, "2024-01-10");
assert.equal(bostonPeriod.monitoring_end, "2024-10-22");
assert.equal(bostonPeriod.sampling_event_count, 4);

const stateSummary = JSON.parse(readText("analysis/exports/ucmr5_jan2026_v0_2/website_state_summary.json"));
assert.equal(stateSummary.states.reduce((sum, row) => sum + Number(row.eligible_cws_with_complete_monitoring), 0), 8936);
assert.equal(stateSummary.states.reduce((sum, row) => sum + Number(row.above_any_april_2024_benchmark), 0), 1030);
const michigan = stateSummary.states.find(row => row.state === "MI");
assert.equal(Number(michigan.eligible_cws_with_complete_monitoring), 291);
assert.equal(Number(michigan.above_any_april_2024_benchmark), 5);

const publicFiles = [
  "index.html",
  "scientific-site-v2.js",
  "assistant-result-tools.js",
  "cloudflare-worker.js",
  "templates/state_page_template.html",
  "build_state_pages.py",
  "map/index.html",
  "state-table/index.html",
  "national-data.js",
  "methodology/index.html",
];
const publicText = publicFiles.map(readText).join("\n");

assert.ok(
  !readText("index.html").includes('src="/science.js"'),
  "The dormant legacy medical-advice script must not be loaded by the public page",
);

[
  "U.S. Tap Water PFAS Checker",
  "PFAS Health Assistant",
  "Print or save for a medical appointment",
  "What this level means for you",
  "Should I be concerned?",
  "Meets at least one",
  "None met",
  "Systems meeting any",
  "Systems meeting comparison",
  "Systems reaching",
  "reached a study comparison level",
  "patient-friendly interpretation a careful doctor",
].forEach(phrase => assert.ok(!publicText.includes(phrase), `Misleading public phrase remains: ${phrase}`));

[
  "U.S. Public Water PFAS Monitoring Lookup",
  "EPA-based study benchmark",
  "Complete monitoring",
  "all required samples needed to calculate a yearly average",
  "Read this before using the results",
  "entry points to the distribution system",
  "Consumer Confidence Report",
  "EPA released the final UCMR 5 dataset in August 2026",
  "does not mean PFAS was not detected",
  "Below EPA reporting level",
  "This does not mean their concentrations were zero",
  "Sampling period",
  "cannot determine current legal compliance, household tap levels, personal exposure, or health risk",
].forEach(phrase => assert.ok(publicText.includes(phrase), `Required clarification is missing: ${phrase}`));

const homeSource = readText("index.html");
const resultSource = readText("scientific-site-v2.js");
assert.ok(homeSource.includes('<dialog class="faq-dialog"'), "Quick explanations should open in an accessible dialog");
assert.ok(homeSource.includes('type="button" data-faq-key="result"'), "Quick explanations should use native buttons");
assert.ok(resultSource.includes("dialog.showModal()"), "The quick-explanation dialog must open without posting a chat message");

assert.ok(
  resultSource.indexOf("${renderResultBoundary()}") < resultSource.indexOf("${systems.map(renderSystem).join(\"\")}"),
  "The prominent result boundary must appear before the water-system cards",
);
assert.ok(
  resultSource.indexOf("${systems.map(renderSystem).join(\"\")}") < resultSource.lastIndexOf("renderFilterGuide()"),
  "Optional filter guidance must appear after the water-system cards",
);

console.log("Frozen-release and reviewer-feedback regression tests passed.");
