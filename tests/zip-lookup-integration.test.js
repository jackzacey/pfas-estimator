'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto} = require('node:crypto');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'scientific-site-v2.js'), 'utf8');
const rawText = fs.readFileSync(path.join(root, 'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json'), 'utf8');
const reviews = JSON.parse(fs.readFileSync(path.join(root, 'analysis/exports/ucmr5_final_aug2026_v1/zip-association-reviews.json')));
const elements = new Map();
const element = () => ({textContent:'',innerHTML:'',hidden:false,className:'',classList:{add(){},remove(){},contains(){return false;}},setAttribute(){},replaceChildren(){},appendChild(){}});
const ctx = vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,document:{getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element},requestAnimationFrame(){},window:{location:{pathname:'/'}},history:{replaceState(){}},console});
const boundary = '  $("lookupButton").addEventListener("click", checkZip);';
vm.runInContext(source.slice(0, source.indexOf(boundary)) + `
 globalThis.subject={readReviewedLookup, partitionZipSystems, renderUncertainAssociations,
 setup(data){ release=data; systemsById=new Map(hydrateRows(data).map(s=>[s.pwsid,s])); },
 render(zip, lang='en'){currentLang=lang;renderLookup(zip,false);return {context:currentContext,ids:currentSystems.map(s=>s.pwsid)};}
 };})();`,ctx);
(async()=>{
 const data=await ctx.subject.readReviewedLookup({text:async()=>rawText},reviews);
 await assert.rejects(ctx.subject.readReviewedLookup({text:async()=>rawText+' '},reviews),/checksum/);
 ctx.subject.setup(data);
 let view=ctx.subject.render('95032');
 assert.deepEqual(Array.from(view.ids),['CA4310011']);
 assert.match(elements.get('resultBody').innerHTML,/SAN JOSE WATER/);
 assert.doesNotMatch(elements.get('resultBody').innerHTML,/KOHALA RANCH/);
 view=ctx.subject.render('abc');
 assert.equal(view.ids.length,0,'Invalid input must clear the previous provider selection');
 assert.match(view.context,/No valid ZIP lookup/);
 assert.equal(elements.get('resultBody').innerHTML,'');
 assert.equal(elements.get('printBtn').hidden,true);
 view=ctx.subject.render('42223');
 assert.equal(view.ids.length,0,'Unresolved associations cannot feed concentration summaries');
 assert.match(elements.get('resultTitle').textContent,/need confirmation/);
 assert.match(elements.get('resultBody').innerHTML,/FORT CAMPBELL/);
 assert.doesNotMatch(elements.get('resultBody').innerHTML,/Highest yearly average|compound-result-row/);
 assert.doesNotMatch(view.context,/PFOS:|PFOA:/);
 assert.equal(elements.get('printBtn').hidden,true);
 view=ctx.subject.render('42223','zh');
 assert.match(elements.get('resultTitle').textContent,/需要确认/);
 view=ctx.subject.render('00000');
 assert.match(elements.get('resultContext').textContent,/may not include/);
 // Synthetic mixed list: severity must not rank providers; pending records
 // must not contaminate visible summary or deterministic/LLM inputs.
 const a={pwsid:'a',ucmr_pws_name:'Alpha',any_system_above_mcl_comparison:0};
 const z={pwsid:'z',ucmr_pws_name:'Zulu',any_system_above_mcl_comparison:1};
 const p={pwsid:'p',ucmr_pws_name:'Pending',any_system_above_mcl_comparison:1};
 const split=ctx.subject.partitionZipSystems({zip_to_pwsids:{'12345':['z','p','a']},pending_associations:{'12345':['p']}},'12345',new Map([a,z,p].map(s=>[s.pwsid,s])));
 assert.deepEqual(Array.from(split.systems,s=>s.pwsid),['a','z']);
 assert.deepEqual(Array.from(split.uncertain,s=>s.pwsid),['p']);
 assert.doesNotMatch(ctx.subject.renderUncertainAssociations([p]),/PFOS|Highest yearly average/);
 console.log('Lookup integration passed: source hash, uncertain-only and mixed lists, bilingual rendering, neutral order, AI isolation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
