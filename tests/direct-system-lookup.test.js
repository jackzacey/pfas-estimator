'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(root,'scientific-site-v2.js'),'utf8');
const read = file => JSON.parse(fs.readFileSync(path.join(root,'analysis/exports/ucmr5_final_aug2026_v1',file)));
const elements = new Map();
const element = () => ({value:'',textContent:'',innerHTML:'',hidden:false,className:'',classList:{add(){},remove(){}},setAttribute(){},replaceChildren(){},appendChild(){}});
let lastUrl;
const ctx = vm.createContext({document:{documentElement:{},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},querySelectorAll(){return [];},createElement:element},requestAnimationFrame(){},window:{location:{pathname:'/'}},history:{replaceState(_state,_title,url){lastUrl=url;}},console});
const boundary = '  $("lookupButton").addEventListener("click", checkZip);';
vm.runInContext(source.slice(0,source.indexOf(boundary)) + `
globalThis.subject = {
 setup(data,periods){release=data;systemsById=new Map(hydrateRows(data).map(s=>[s.pwsid,s]));monitoringById=new Map(hydrateMonitoringRows(periods).map(s=>[s.pwsid,s]));},
 system(id){renderSelectedSystem(id);},zip(zip){renderLookup(zip,false);},language(lang){currentLang=lang;applyLanguage();},
 state(){return {ids:currentSystems.map(s=>s.pwsid),context:currentContext,zip:lastLookupZip,system:lastSystemId};}
};})();`,ctx);
ctx.subject.setup(read('website_lookup_compact.json'),read('website_monitoring_periods.json'));
ctx.subject.zip('95032');
ctx.subject.system('010106001');
let state = ctx.subject.state();
assert.deepEqual(Array.from(state.ids),['010106001']);
assert.equal(state.zip,null);
assert.match(state.context,/selected this water system directly/);
assert.equal(lastUrl,'/?system=010106001#result');
assert.match(elements.get('resultBody').innerHTML,/Mashantucket Pequot Water System/);
assert.doesNotMatch(elements.get('resultBody').innerHTML,/SAN JOSE WATER/);
assert.match(elements.get('printZip').textContent,/010106001/);
assert.equal(elements.get('zipInput').value,'');
ctx.subject.language('zh');
assert.equal(ctx.subject.state().system,'010106001');
assert.match(elements.get('resultContext').textContent,/未进行邮编关联/);
ctx.subject.language('en');
ctx.subject.system('<unknown>');
assert.equal(ctx.subject.state().ids.length,0);
assert.equal(elements.get('printBtn').hidden,true);
assert.doesNotMatch(elements.get('resultBody').innerHTML,/compound-result-row|Mashantucket|<unknown>/);
ctx.subject.zip('95032');
assert.equal(ctx.subject.state().system,null);
assert.match(lastUrl,/\?zip=95032/);
assert.match(elements.get('resultBody').innerHTML,/SAN JOSE WATER/);
ctx.subject.zip('bad');
assert.equal(ctx.subject.state().ids.length,0);
console.log('Direct system selection passed: exact ID, leading zeros, ZIP transitions, bilingual state, unknown ID, print and assistant context.');
