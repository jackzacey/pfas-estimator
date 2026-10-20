"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const source = fs.readFileSync(path.join(root, "scientific-site-v2.js"), "utf8");
const startup = '  $("lookupButton").addEventListener("click", checkZip);';
assert.equal(source.split(startup).length, 2, "Find the unique browser startup boundary");
// Exercise the real rendering functions without starting network requests or adding
// test-only globals to the production page.
const context = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf(startup)) + `
  globalThis.subject = {
    OUTCOMES, samplingAgeNotice, renderProviderHelp, renderOfficialRecords,
    renderPrivateWellGuidance, renderSystem, renderOutcomeList, renderResultBoundary,
    outcomeStatus, formatOutcomeValue, formatAverage,
    setLanguage(value) { currentLang = value; },
    setPeriods(rows) { monitoringById = new Map(rows.map(row => [String(row.pwsid), row])); }
  };
})();`, context);
const subject = context.subject;
const readRelease = name => JSON.parse(fs.readFileSync(path.join(root, "analysis/exports/ucmr5_final_aug2026_v1", name), "utf8"));
const hydrate = payload => payload.systems.map(row => Object.fromEntries(payload.columns.map((key, index) => [key, row[index]])));
const systems = hydrate(readRelease("website_lookup_compact.json"));
const periods = hydrate(readRelease("website_monitoring_periods.json"));

const now = new Date("2026-09-21T12:00:00Z");
const sample = { pwsid: "date-test" };
function age(endDate) {
  subject.setPeriods([{ pwsid: sample.pwsid, monitoring_end: endDate }]);
  return subject.samplingAgeNotice(sample, now);
}
assert.match(age("2025-09-20"), /in this record is over a year old/);
assert.doesNotMatch(age("2025-09-21"), /over a year old/);
assert.doesNotMatch(age("2026-09-21"), /over a year old/);
assert.match(age("2026-09-22"), /could not be verified/);
assert.match(age("2025-02-30"), /could not be verified/);
assert.match(age("2025-13-01"), /could not be verified/);
assert.match(age(undefined), /not reported/);
assert.match(age(""), /not reported/);
subject.setLanguage("zh");
assert.match(age("2025-09-20"), /超过一年/);
assert.match(age(undefined), /未报告/);
subject.setLanguage("en");

assert.match(subject.renderProviderHelp({ primary_source_desc: "Purchased surface water" }), /supplier it buys from/);
assert.match(subject.renderProviderHelp({ primary_source_desc: "Purchased ground water" }), /supplier's name is not included/);
assert.doesNotMatch(subject.renderProviderHelp({ primary_source_desc: "Ground water" }), /supplier it buys from/);
assert.match(subject.renderOfficialRecords({ sdwis_state_code: "MN" }), /health\.mn\.gov.*official PFAS testing dashboard/);
assert.match(subject.renderOfficialRecords({ sdwis_state_code: "VT" }), /dec\.vermont\.gov/);
assert.match(subject.renderOfficialRecords({ sdwis_state_code: "PA" }), /pa\.gov\/agencies\/dep/);
assert.match(subject.renderOfficialRecords({ sdwis_state_code: "XX" }), /epa\.gov\/DWdata\/primacy-agency-drinking-water-data/);
assert.match(subject.renderPrivateWellGuidance(), /private-drinking-water-well-programs-your-state/);
assert.doesNotMatch(subject.renderPrivateWellGuidance(), /Maine CDC/);
assert.match(subject.renderPrivateWellGuidance([{ sdwis_state_code: "ME" }]), /Maine CDC/);

for (const language of ["en", "zh"]) {
  subject.setLanguage(language);
  for (const value of [0.0008, 0.0004, 0.0005, 0.00001, 0.001, 0.5, 2]) {
    assert.equal(Number(subject.formatAverage(value, true)), value, "A small nonzero Hazard Index must retain EPA precision");
  }
}
subject.setLanguage("en");
subject.setPeriods(periods);
let found = 0, belowLimit = 0, incomplete = 0;
for (const language of ["en", "zh"]) {
  subject.setLanguage(language);
  // Every archived system must render without dropping outcomes or fabricating a
  // PFBS concentration. Featured detected chemicals are not duplicated in rows.
  for (const system of systems) {
    const html = subject.renderSystem(system);
    assert.doesNotMatch(html, /undefined|NaN|Invalid Date/);
    assert.equal((html.match(/class="compound-pollutant-name"/g) || []).length +
      (html.match(/class="compound-result-row /g) || []).length, 6);
    assert.match(html, /PWSID/);
    assert.match(html, /\/methodology\/#outcomes/);
    assert.doesNotMatch(html, /PFBS<\/span><strong>/);
    for (const outcome of subject.OUTCOMES) {
      const status = subject.outcomeStatus(system, outcome);
      const row = subject.renderOutcomeList(system, subject.OUTCOMES.filter(item => item.key !== outcome.key).map(item => item.key));
      assert.ok(row.includes(subject.formatOutcomeValue(outcome, status)));
      if (!status.full) incomplete++;
      else if (status.belowReporting && outcome.key !== "hi") {
        belowLimit++;
        assert.match(row, language === "en" ? /not necessarily zero/ : /不等于零/);
      } else {
        found++;
        const displayed = subject.formatOutcomeValue(outcome, status).replace(/,/g, "").replace(" ppt", "").replace(" (calculated)", "").replace("（计算值）", "");
        const expected = Number(status.maximum) * (outcome.key === "hi" ? 1 : 1000);
        assert.ok(Math.abs(Number(displayed) - expected) < 1e-10, `Displayed ${outcome.key} must retain the official average for ${system.pwsid}`);
      }
    }
  }
}
assert.ok(found && belowLimit && incomplete, "Cover detected, below-limit and incomplete records");
subject.setLanguage("en");
const malicious = subject.renderSystem({ ...systems[0], ucmr_pws_name: '<img src=x onerror="alert(1)">' });
assert.doesNotMatch(malicious, /<img/);
assert.match(malicious, /&lt;img/);
assert.match(subject.renderResultBoundary([]), /PFBS contributes to the mixture calculation/);
assert.match(subject.renderResultBoundary([]), /different locations or years/);
console.log(`Lookup clarity tests passed for all ${systems.length} systems in English and Chinese.`);
