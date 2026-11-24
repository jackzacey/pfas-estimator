'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const languages=require('../site-languages');
const spanish=require('../homepage-language');
const evidence=require('../lookup-evidence');
const hydrate=data=>data.systems.map(row=>Object.fromEntries(data.columns.map((k,i)=>[k,row[i]])));
const base='analysis/exports/ucmr5_final_aug2026_v1/';
const lookup=JSON.parse(read(base+'website_lookup_compact.json'));
const periods=hydrate(JSON.parse(read(base+'website_monitoring_periods.json')));
const evidenceRows=JSON.parse(read(base+'lookup-evidence.json')).systems;
const elements=new Map();
function element(){return {value:'',textContent:'',innerHTML:'',hidden:false,className:'',attributes:{},classList:{add(){},remove(){},contains(){return false;}},setAttribute(k,v){this.attributes[k]=v;},replaceChildren(){},appendChild(){},focus(){}};}
const context=vm.createContext({SiteLanguages:languages,PFASHomeLanguage:spanish,console,crypto:webcrypto,TextEncoder,Uint8Array,URLSearchParams,trackEvent(){},
 document:{body:null,documentElement:{},getElementById(id){if(!elements.has(id))elements.set(id,element());return elements.get(id);},createElement:element,querySelectorAll(){return[];},querySelector(){return null;}},
 requestAnimationFrame(){},history:{replaceState(){}},window:{location:{pathname:'/'},DrinkingWaterRecords:{}},
 fetch:async url=>({ok:true,text:async()=>read(url.replace(/^\//,''))})});
const source=read('scientific-site-v2.js'),boundary='  $("lookupButton").addEventListener("click", checkZip);';
vm.runInContext(source.slice(0,source.indexOf(boundary))+`
 incrementSearchCounter=async()=>{};
 globalThis.subject={COPY,readReviewedLookup,setup(data,p,e){release=data;systemsById=new Map(hydrateRows(data).map(s=>[s.pwsid,s]));monitoringById=new Map(p.map(s=>[s.pwsid,s]));evidenceById=new Map(Object.entries(e));},
 configure(search,water='pfas',lang='en'){searchMode=search;waterMode=water;currentLang=lang;},
 run(value){$("zipInput").value=value;return performLookup();},setSearchMode,renderSystem,
 language(lang){currentLang=lang;},state(){return {ids:currentSystems.map(s=>s.pwsid),searchMode,lastSystemId};}};
})();`,context);
const api=context.subject;
(async()=>{
 const reviewed=await api.readReviewedLookup({text:async()=>read(base+'website_lookup_compact.json')},JSON.parse(read(base+'zip-association-reviews.json')));
 api.setup(reviewed,periods,evidenceRows);
 const html=read('index.html');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'No duplicate controls or IDs');
 assert.doesNotMatch(html,/id="printBtn"|id="languageSelect"|id="waterProviderSearch"|id="waterProviderInput"/);
 assert.equal((html.match(/name="lookup-search-mode"/g)||[]).length,3);
 assert.equal((html.match(/id="zipInput"/g)||[]).length,1,'One shared search field');
 assert.equal(languages.normalizeDigits('٠١٢٣٤٥٦٧٨٩ ۰۱۲۳۴۵۶۷۸۹ ०१२३४५६७८९'),'0123456789 0123456789 0123456789');
 assert.deepEqual(languages.supported,['en','zh','es','hi','ar','fr','bn','ru']);
 for(const lang of ['hi','ar','fr','bn','ru'])for(const [key,value] of Object.entries(api.COPY.en)){
   if(typeof value==='string'&&value!=='PFAS'&&!(lang==='fr'&&key==='rural'))assert.notEqual(api.COPY[lang][key],value,lang+' copy '+key);
 }
 for(const lang of ['en','zh','es','hi','ar','fr','bn','ru']){
   api.configure('zip','pfas',lang);const labels=[];
   for(const mode of ['zip','provider','id']){api.setSearchMode(mode);labels.push(elements.get('lookupButton').textContent);}
   assert.equal(new Set(labels).size,1,lang+' uses the same action label so field width cannot change with the search mode');
 }
 api.configure('provider');await api.run('Raleigh');
 assert.match(elements.get('waterProviderMatches').innerHTML,/RALEIGH, CITY OF/);
 api.configure('provider');await api.run('NC0392010');
 assert.doesNotMatch(elements.get('waterProviderMatches').innerHTML,/data-water-system/,'Provider name search does not silently search IDs');
 api.configure('id','pfas','ar');await api.run('٠١٠١٠٦٠٠١');
 assert.deepEqual(Array.from(api.state().ids),['010106001']);assert.equal(elements.get('zipInput').value,'010106001');
 api.configure('id');await api.run('nc0392010');assert.deepEqual(Array.from(api.state().ids),['NC0392010']);
 api.configure('id');await api.run('<script>');assert.match(elements.get('waterProviderMatches').textContent,/valid water system ID/);assert.equal(api.state().ids.length,0,'Invalid searches clear the previous provider');
 api.configure('zip','pfas','hi');await api.run('९५०३२');assert.deepEqual(Array.from(api.state().ids),['CA4310011']);
 assert.doesNotMatch(elements.get('resultContext').textContent,/Incorrect associations/);
 assert.match(languages.translate('2 possible water systems for ZIP 95032','ar'),/95032/);
 assert.doesNotMatch(languages.translate('2 possible water systems for ZIP 95032','hi'),/possible water/);
 let releaseSearch;
 context.window.DrinkingWaterRecords.search=()=>new Promise(resolve=>{releaseSearch=resolve;});
 api.configure('provider','lithium');const pending=api.run('raleigh');api.setSearchMode('id');releaseSearch([['STALE','Stale result','NC']]);await pending;
 assert.equal(elements.get('waterProviderMatches').innerHTML,'','An old provider response cannot replace a changed search mode');
 const numbers=html=>[...html.matchAll(/class="compact-outcome [^>]+><span>[^<]*<\/span><strong(?: dir="auto")?>([^<]*)<\/strong>/g)].map(m=>m[1].replace(/[^0-9.,]/g,''));
 for(const row of lookup.systems){
   const system=Object.fromEntries(lookup.columns.map((k,i)=>[k,row[i]]));system._comparisonCoverage=evidence.coverage(system,evidenceRows[system.pwsid]);
   api.language('en');const en=api.renderSystem(system),expected=numbers(en);assert.equal(expected.length,6);
   for(const lang of ['hi','ar','fr','bn','ru']){
     api.language(lang);const rendered=api.renderSystem(system);assert.deepEqual(numbers(rendered),expected,system.pwsid+' '+lang+' values');
     assert.doesNotMatch(rendered,/undefined|NaN|Invalid Date|Terms and symbols|Test dates|Create clinic report|Above study reference|Not enough required samples/);
     assert(rendered.includes(encodeURIComponent(system.pwsid)));assert(rendered.includes('lang='+lang));
   }
 }
 // Real supplemental records and report generation use the same verified data modules.
 for(const p of ['vendor/qrcodegen.js','drinking-water-records.js','pfas-sample-trace.js'])vm.runInContext(read(p),context);
 context.module={exports:{}};vm.runInContext(read('clinic-report.js'),context);const report=context.module.exports;
 const data=await report.load('CA4310011');
 const values=html=>[...html.matchAll(/<strong(?: dir="auto")?>([^<]*)<\/strong>/g)].map(m=>m[1].replace(/[^0-9.,]/g,''));
 const expected=values(report.render(data,'en'));assert(expected.length>=8);
 for(const lang of ['hi','ar','fr','bn','ru']){
   const rendered=report.render(data,lang);assert.deepEqual(values(rendered),expected);assert.match(rendered,/CA4310011/);
   assert.doesNotMatch(rendered,/Water-system report|A summary to share|Sample dates|Historical system records|No complete average|Not available|No matching usable records|Sources: U.S./);
   assert.equal(new URL(report.providerUrl('010106001',lang)).searchParams.get('lang'),lang);
 }
 const li={lithium:{lithium:[['2025-01-01',9,'<']]},failed:[false,false,false]};assert.match(report.lithiumSection(li,'hi'),/9 µg\/L से नीचे/);
 const lcr={lcr:{lead:[['2025-01-01','2025-06-30',0,'']],copper:[]},failed:[false,false,false]};
 assert.match(report.lcrSection(lcr,'hi'),/शून्य/);assert.match(report.lcrSection(lcr,'ar'),/الصفر/);
 assert.match(source,/clinic-report-link home-method-link/);assert.doesNotMatch(read('clinic-report.css'),/\.home-shell \.clinic-report-link[^\n]*padding/);
 console.log('Accessibility checks passed: three search modes, exact IDs and native digits, stale-response rejection, all 10,307 PFAS values unchanged in Hindi, Arabic, French, Bengali and Russian, report values, nondetects, missing data, translated copy and clean controls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
