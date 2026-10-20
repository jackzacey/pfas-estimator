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
 globalThis.subject={renderSystem,renderEvidence,renderOfficialRecords,setup(e,l){evidenceById=new Map(Object.entries(e.systems));providerLinks=l.systems;},language(v){currentLang=v;}};
})();`,ctx);
ctx.subject.setup(evidence,read('config/provider-links.json'));
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
