'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const helper=require('../lookup-evidence.js');
const assistant=require('../assistant-result-tools.js');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const release=read('analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json');
const evidence=read('analysis/exports/ucmr5_final_aug2026_v1/lookup-evidence.json');
const source=fs.readFileSync(path.join(root,'scientific-site-v2.js'),'utf8');
assert.ok(source.includes(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,'analysis/exports/ucmr5_final_aug2026_v1/lookup-evidence.json'))).digest('hex')));
helper.validate(evidence,release,evidence.lookup_sha256);
assert.throws(()=>helper.validate({...evidence,release_id:'other'},release,evidence.lookup_sha256));
const altered=structuredClone(evidence);
altered.systems[release.systems[0][0]][0][5][0][2]=100;
assert.throws(()=>helper.validate(altered,release,evidence.lookup_sha256));
const systems=release.systems.map(r=>Object.fromEntries(release.columns.map((k,i)=>[k,r[i]])));
for(const s of systems) s._comparisonCoverage=helper.coverage(s,evidence.systems[s.pwsid]);
const mixed=systems.find(s=>s._comparisonCoverage.outcomes.pfoa.complete>0 && s._comparisonCoverage.outcomes.pfoa.unavailable>0 && !s.any_system_above_mcl_comparison);
const missing=systems.find(s=>!s.any_system_full_set);
const below=systems.find(s=>s._comparisonCoverage.all && !s.any_system_above_mcl_comparison);
const above=systems.find(s=>s.any_system_above_mcl_comparison);
assert.ok(mixed&&missing&&below&&above);
for(const lang of ['en','zh']) {
 const q=lang==='en'?'Which systems are above the comparison?':'哪些供水系统达到比较水平？';
 const a=assistant.answerComparisonSystems(q,[mixed,missing,below,above],lang);
 assert.match(a,lang==='en'?/Unavailable comparisons are not below-benchmark/:/缺失比较不等于低于基准/);
 const noData=assistant.answerComparisonSystems(q,[missing],lang);
 assert.doesNotMatch(noData,/None of the 1 listed/);
}
const boundary='  $("lookupButton").addEventListener("click", checkZip);';
const ctx=vm.createContext({});
vm.runInContext(source.slice(0,source.indexOf(boundary))+`
 globalThis.subject={renderSystem,renderEvidence,renderOfficialRecords,buildAssistantContext,setup(e,l,data){release=data;evidenceById=new Map(Object.entries(e.systems));providerLinks=l.systems;},language(v){currentLang=v;}};
})();`,ctx);
ctx.subject.setup(evidence,read('config/provider-links.json'),release);
for(const lang of ['en','zh']) {
 ctx.subject.language(lang);
 for(const s of systems) {
  const html=ctx.subject.renderSystem(s);
  assert.doesNotMatch(html,/undefined|NaN|Invalid Date/);
  if(!s._comparisonCoverage.all) assert.match(html,lang==='en'?/Missing comparisons cannot/:/缺失比较不能/);
 }
 const html=ctx.subject.renderSystem(mixed);
 assert.match(html,lang==='en'?/archived locations/:/归档采样点/);
}
ctx.subject.language('en');
const sj=systems.find(s=>s.pwsid==='CA4310011');
const html=ctx.subject.renderSystem(sj);
assert.match(html,/2024 water-quality report/);
assert.match(html,/not a verified list of samples/);
assert.match(html,/0.004 µg\/L × 1,000 = 4 ppt/);
for(const id of Object.keys(read('config/provider-links.json').systems)) assert.ok(systems.some(s=>s.pwsid===id),id);
const page=fs.readFileSync(path.join(root,'index.html'),'utf8');
assert.ok(page.indexOf('id="resultBody"')<page.indexOf('id="chatPanel"'));
assert.ok(page.indexOf('/lookup-evidence.js')<page.indexOf('/scientific-site-v2.js'));
console.log(`Evidence and coverage: all ${systems.length} systems validated and rendered EN/ZH; mixed, unavailable, nondetect and positive cases passed. Mixed fixture: ${mixed.pwsid}.`);

// Regression: incomplete annual records can contain real detections. Keep the
// individual measurement separate from the official annual result and flags.
let sampleSystems=0, otherwiseNoPositiveAverage=0;
for(const s of systems) {
 const detections=helper.incompleteDetections(evidence.systems[s.pwsid]);
 if(!detections.length) continue;
 sampleSystems++;
 if(!helper.keys.slice(0,5).some(k=>(s[k+'_max_location_average']||0)>0)) otherwiseNoPositiveAverage++;
 for(const d of detections) {
  assert.ok(d.valuePpt>0 && d.sourceLine>=2 && d.sampleId);
  assert.ok(d.chemicalIndex<5,'PFBS and HI are not individual displayed sample concentrations');
 }
 for(const lang of ['en','zh']) {
  ctx.subject.language(lang);
  const html=ctx.subject.renderSystem(s);
  assert.match(html,lang==='en'?/PFAS detected at locations without a complete yearly comparison/:/年度比较不完整的采样点检出了PFAS/);
  assert.match(html,lang==='en'?/historical individual samples, not yearly averages/:/历史单次样本，不是年度平均值/);
  if(s.any_system_above_mcl_comparison) assert.match(html,lang==='en'?/At least one available yearly average is above/:/至少一项可用结果高于/);
  assert.doesNotMatch(html,/No detections in complete samples|The five PFAS shown were not detected in complete samples/);
 }
}
assert.equal(sampleSystems,134);
assert.equal(otherwiseNoPositiveAverage,66);
ctx.subject.language('en');
const utah=systems.find(s=>s.pwsid==='UTAH18026');
const samples=helper.incompleteDetections(evidence.systems[utah.pwsid]);
assert.deepEqual(samples.map(d=>[helper.keys[d.chemicalIndex],d.valuePpt,d.date,d.facilityId,d.pointId]).sort(),[
 ['pfhxs',18.2,'2023-10-02','00017','WS017'],['pfos',7.1,'2023-10-02','00017','WS017']]);
assert.equal(utah.pfos_max_location_average,0);
assert.equal(utah.any_system_above_mcl_comparison,0);
const utahHTML=ctx.subject.renderSystem(utah);
assert.match(utahHTML,/PFOS: 7\.1 ppt/);
assert.match(utahHTML,/PFHxS: 18\.2 ppt/);
assert.match(utahHTML,/PFAS were found/);
assert.match(utahHTML,/Below 4 ppt/);
for(const mutate of [
 d=>d[0]=5,d=>d[1]=-1,d=>d[1]=NaN,d=>d[2]='2023-02-30',
 d=>d[3]='',d=>d[4]='SE5',d=>d[5]=1
]) {
 const broken=structuredClone(evidence);
 const row=broken.systems[utah.pwsid].find(r=>r[7].length);
 mutate(row[7][0]);
 assert.throws(()=>helper.validate(broken,release,evidence.lookup_sha256),/Invalid incomplete sample detection/);
}
const stale=structuredClone(evidence);delete stale.systems[utah.pwsid][0][7];
assert.throws(()=>helper.validate(stale,release,evidence.lookup_sha256),/Missing sample detection context/);
console.log(`Incomplete sample regressions passed: ${sampleSystems} systems; ${otherwiseNoPositiveAverage} without positive complete annual averages; Utah sample/annual separation and malformed evidence rejection.`);

const assistantContext=ctx.subject.buildAssistantContext([utah]);
assert.match(assistantContext,/PFOS 7\.1 ppt/);
assert.match(assistantContext,/not annual exceedances or separately collected state monitoring records/);
