'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createHash} = require('node:crypto');
const model = require('../system-map-model');
const evidenceApi = require('../lookup-evidence');
const root = path.join(__dirname,'..');
const read = name => JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const base = 'analysis/exports/ucmr5_final_aug2026_v1/';
const raw = fs.readFileSync(path.join(root,base+'website_lookup_compact.json'));
const release = JSON.parse(raw);
const evidence = read(base+'lookup-evidence.json');
const geo = read('data/system-map-locations.json');
const audit = read('data/system-map-audit.json');
const digest = createHash('sha256').update(raw).digest('hex');
assert.equal(geo.lookup_sha256,digest);
assert.equal(geo.release_id,release.release_id);
evidenceApi.validate(evidence,release,digest);
const systems = model.hydrate(release);
const ids = new Set(systems.map(s => s.pwsid));
assert.equal(ids.size,10307);
assert.equal(Object.keys(geo.locations).length,audit.mapped);
assert.equal(audit.mapped + audit.unmapped,ids.size);
assert.deepEqual(audit.missing_system_ids.sort(),[...ids].filter(id => !geo.locations[id]).sort());
for (const [id,row] of Object.entries(geo.locations)) {
  assert.ok(ids.has(id),'No phantom systems introduced by geometry matching');
  assert.ok(Number.isFinite(row[0]) && Math.abs(row[0]) <= 180);
  assert.ok(Number.isFinite(row[1]) && Math.abs(row[1]) <= 85);
  assert.equal(typeof row[2],'string');
  assert.ok(Number.isInteger(row[4]));
}
const counts = {above:0,below:0,incomplete:0};
let incompleteWithAverage = 0, nondetect = 0;
for (const s of systems) {
  s._comparisonCoverage = evidenceApi.coverage(s,evidence.systems[s.pwsid]);
  const result = model.summary(s);
  counts[result.key]++;
  assert.equal(result.key === 'above',s.any_system_above_mcl_comparison === 1,'Map summary must preserve published flags');
  if (result.key === 'below') assert.equal(s._comparisonCoverage.all,true,'Missing data must never be colored as complete');
  for (const k of Object.keys(model.CHEMICALS)) {
    const r = model.chemical(s,k);
    assert.doesNotMatch(r.label + r.valueLabel,/NaN|undefined|null/);
    if (r.key === 'incomplete') {
      assert.ok(s._comparisonCoverage.outcomes[k].unavailable > 0 || s[k+'_system_full_set'] !== 1);
      if (r.ppt > 0) incompleteWithAverage++;
    } else if (r.key === 'nondetect') {
      nondetect++;
      assert.equal(r.ppt,null,'Nondetects do not advertise a measured zero');
      assert.match(r.valueLabel,/Below .*reporting limit/);
    } else {
      assert.equal(r.ppt,s[k+'_max_location_average'] * 1000,'Keep the lookup concentration and unit conversion');
      assert.equal(s._comparisonCoverage.outcomes[k].unavailable,0);
    }
  }
}
assert.ok(incompleteWithAverage > 0 && nondetect > 0,'Exercise partial coverage with detected values and below-limit results');
assert.equal(model.summary({any_system_above_mcl_comparison:0}).key,'incomplete');
assert.equal(model.chemical({pfoa_system_full_set:1,pfoa_max_location_average:null},'pfoa').key,'incomplete');
assert.equal(model.resultUrl('010106001'),'/?system=010106001#result','Leading-zero system IDs survive direct links');
console.log('Map audit and scientific classification passed for all 10,307 systems and five chemicals.',counts);
