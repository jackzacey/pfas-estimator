'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const language=require('../homepage-language');
const assistant=require('../assistant-result-tools');
const records=require('../drinking-water-records');
const trace=require('../pfas-sample-trace');
const evidenceTools=require('../lookup-evidence');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const {webcrypto}=require('node:crypto');
const app=read('scientific-site-v2.js');
const boundary='  $("lookupButton").addEventListener("click", checkZip);';
const context=vm.createContext({PFASHomeLanguage:language});
vm.runInContext(app.slice(0,app.indexOf(boundary))+`
 globalThis.subject={COPY,renderSystem,setLanguage(v){currentLang=v;},
 setup(periods,evidence){monitoringById=new Map(periods.map(s=>[s.pwsid,s]));evidenceById=new Map(Object.entries(evidence));}};
})();`,context);
const subject=context.subject;
for(const key of [...read('index.html').matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map(m=>m[1])) {
 for(const lang of ['en','zh','es'])assert.equal(typeof subject.COPY[lang][key],'string',`${lang} copy: ${key}`);
}
assert.notEqual(subject.COPY.es.heroTitle,subject.COPY.en.heroTitle);
const hydrate=data=>data.systems.map(row=>Object.fromEntries(data.columns.map((key,i)=>[key,row[i]])));
const base='analysis/exports/ucmr5_final_aug2026_v1/';
const systems=hydrate(JSON.parse(read(base+'website_lookup_compact.json')));
const evidence=JSON.parse(read(base+'lookup-evidence.json')).systems;
subject.setup(hydrate(JSON.parse(read(base+'website_monitoring_periods.json'))),evidence);
const values=html=>[...html.matchAll(/<div class="compact-outcome [^>]+><span>[^<]*<\/span><strong>([^<]+)<\/strong>/g)].map(m=>m[1].replace(/[^\d.,]/g,''));
for(const system of systems) {
 system._comparisonCoverage=evidenceTools.coverage(system,evidence[system.pwsid]);
 subject.setLanguage('en');const en=subject.renderSystem(system);
 subject.setLanguage('es');const es=subject.renderSystem(system);
 assert.deepEqual(values(es),values(en),`Same six numeric outcomes in Spanish: ${system.pwsid}`);
 assert.equal(values(es).length,6);
 assert.doesNotMatch(es,/undefined|NaN|Invalid Date|Above study reference|Terms and symbols|Test dates|Calculation inputs/);
 assert.match(es,/Términos y símbolos/);assert.match(es,/Muestras y fechas/);
 assert.match(es,new RegExp('/methodology/\\?system='+system.pwsid+'#sample-trace'));
 assert.equal(/class="compact-warning"/.test(es),/class="compact-warning"/.test(en));
}
const fixture={id:'TEST',name:'Example Water',state:'UT',active:'A',type:'CWS',wholesale:'N',
 lithium:[['2025-01-01',9,'<','f','p','s','SE1',2]],lead:[['2024-01-01','2024-06-30',2,'','a','x',3]],copper:[]};
let es=records.renderSystem(fixture,'lithium','es');
assert.match(es,/&lt; 9 µg\/L/);assert.match(es,/microgramos por litro/);assert.match(es,/no es un límite.*exigible/);
assert.doesNotMatch(es,/Highest|below reporting|enforceable drinking/);
es=records.renderSystem(fixture,'lcr','es');
assert.match(es,/Percentil 90/);assert.match(es,/no especifica/);assert.match(es,/No hay un resultado disponible/);
assert.doesNotMatch(es,/Not supplied|No result available|Latest reported/);
const sampleLocation={name:'Plant A',facility:'F1',point:'P1',samples:[[0,'2025-01-01','SE1','<',4,0,'S1',2]],
 expected_events:['SE1','SE2'],outcomes:Array.from({length:6},()=>[0,0,null,0,null])};
const compact=trace.render([sampleLocation],{pwsid:'TEST'},'es',{calculations:false});
assert.match(compact,/&lt; 4/);assert.match(compact,/Fecha/);
assert.doesNotMatch(compact,/Calculation inputs|Input to average|Source row|Missing required events/);
assert.match(trace.render([sampleLocation],{pwsid:'TEST'},'en'),/Missing required events/);
assert.match(records.renderSourceRecords(fixture,'lithium'),/Sample ID.*Event.*Source row/);
assert.match(records.renderSourceRecords(fixture,'lcr'),/Result ID \(SAR_ID\).*Source row/);
const flagged=[{ucmr_pws_name:'Alpha',any_system_above_mcl_comparison:1,_comparisonCoverage:{all:true}},
 {ucmr_pws_name:'Beta',any_system_above_mcl_comparison:0,_comparisonCoverage:{all:false}}];
assert.match(assistant.answerComparisonSystems('¿Cuántos sistemas superan la referencia?',flagged,'es'),/1 de 2.*Alpha.*1 tienen comparaciones/);
for(const [question,pattern] of [['¿Es segura el agua?',/no permiten decidir/],['¿Menos de significa cero?',/no significa que sea cero/],['¿Dónde se tomaron las muestras?',/no en los grifos/]])
 assert.match(assistant.answerBoundaryQuestion(question,flagged,'es'),pattern);
let upstreamCalls=0,upstreamPrompt='';
const workerContext=vm.createContext({console,fetch:async(_url,options)=>{
 upstreamCalls++;upstreamPrompt=JSON.parse(options.body).messages[0].content;
 return {ok:true,json:async()=>({choices:[{message:{content:'Verifique la certificación del modelo de filtro.'}}]})};
}});
vm.runInContext(read('cloudflare-worker.js').replace('export default {','const workerDefault = {')+`
globalThis.subject={sanitizeChatRequest,sanitizeSummaryRequest,createChatReply};`,workerContext);
(async()=>{
 const worker=workerContext.subject;
 const safety=worker.sanitizeChatRequest({language:'es',messages:[{content:'¿Es segura el agua?'}]});
 assert.equal(safety.language,'es');assert.match(await worker.createChatReply({},safety),/no permiten decidir/);
 assert.equal(upstreamCalls,0,'Boundary answers do not call AI');
 const payload=worker.sanitizeChatRequest({language:'es',messages:[{content:'¿Cómo elijo un filtro para PFAS?'}]});
 assert.match(await worker.createChatReply({},payload),/Fuente: orientación de la EPA sobre filtros y certificación NSF/);
 assert.match(upstreamPrompt,/Responde completamente en español/);
 assert.equal(upstreamCalls,1);
 assert.equal(worker.sanitizeChatRequest({language:'unknown',messages:[{content:'Hello'}]}).language,'en');
 assert.equal(worker.sanitizeSummaryRequest({language:'es',zip:'95032',compounds:[{compound:'PFOA',level:4}]}).language,'es');
 for(const view of ['pfas','lithium','lcr']) {
  const node=()=>({children:[],hidden:true,textContent:'',innerHTML:'',replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);}});
  const target=node();
  const methodsContext=vm.createContext({console,crypto:webcrypto,TextEncoder,Uint8Array,URLSearchParams,
   location:{search:'?system=NC0392010'+(view==='pfas'?'':'&view='+view)},
   document:{getElementById:()=>target,createElement:node},
   fetch:async url=>({ok:true,text:async()=>read(url.replace(/^\//,''))})});
  vm.runInContext(read('drinking-water-records.js'),methodsContext);
  vm.runInContext(read('pfas-sample-trace.js'),methodsContext);
  await vm.runInContext(read('pfas-methods-view.js'),methodsContext);
  assert.equal(target.hidden,false);
  assert.equal(target.children[0].textContent,'RALEIGH, CITY OF');
  const details=target.children.at(-1).innerHTML;
  if(view==='pfas')assert.match(details,/required UCMR monitoring set/);
  else assert.match(details,/Sample ID.*Source row/);
  assert.doesNotMatch(target.textContent,/could not be loaded/);
 }
 console.log('Homepage language checks passed: all 10,307 numeric results preserved in Spanish, visible warnings, compact source details, extra-chemical units and signs, exact assistant counts, and Spanish worker routing without external calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
