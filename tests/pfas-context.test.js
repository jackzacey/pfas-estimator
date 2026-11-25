'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const chemical=require('../chemical-context');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'scientific-site-v2.js'),'utf8');
const boundary='  $("lookupButton").addEventListener("click", checkZip);';
function app(withEducation){const context=vm.createContext({SiteLanguages:require('../site-languages'),PFASHomeLanguage:require('../homepage-language'),...(withEducation?{ChemicalContext:chemical}:{})});vm.runInContext(source.slice(0,source.indexOf(boundary))+`globalThis.subject={renderSystem,setLanguage(v){currentLang=v;}};})();`,context);return context.subject;}
const current=app(true),baseline=app(false);
const data=JSON.parse(fs.readFileSync(path.join(root,'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json'),'utf8'));
const systems=data.systems.map(row=>Object.fromEntries(data.columns.map((k,i)=>[k,row[i]])));
for(const s of systems){
 const html=current.renderSystem(s),old=baseline.renderSystem(s);
 assert(html.includes('data-chemical-context="pfas"'),s.pwsid+' always has education');
 assert.match(html,/What does this mean for me/);
 assert.match(html,/Exposure research and next steps/);
 const outcomes=/<div class="compact-outcomes">([\s\S]*?)<\/div>\s*<p class="compact-caption">/;
 assert.equal(html.match(outcomes)?.[1],old.match(outcomes)?.[1],s.pwsid+' keeps the exact scientific result markup');
}
const sjw=systems.find(s=>s.pwsid==='CA4310011');assert(sjw);
for(const lang of ['en','zh','es','hi','ar','fr','bn','ru']){
 current.setLanguage(lang);
 for(const s of [sjw,{...sjw,any_system_above_mcl_comparison:1},{...sjw,any_system_full_set:0},Object.fromEntries(Object.entries(sjw).map(([k,v])=>[k,k.endsWith('_max_location_average')?0:v]))]){
  const html=current.renderSystem(s);
  assert(html.includes('data-chemical-context="pfas"'));
  assert(html.includes(chemical.copy[lang].pfas[0]));
  assert(!html.includes('undefined'));
 }
}
console.log('PFAS education regression passed for all 10,307 provider records with exact unchanged outcomes; all eight languages retain education for detections, nondetects, above-reference and incomplete scenarios.');
