'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
function environment(corrupt=''){
  const calls=[];
  const context=vm.createContext({console,crypto:webcrypto,TextEncoder,Uint8Array,URLSearchParams,
    fetch:async url=>{calls.push(url);const file=path.join(root,url);let raw=fs.readFileSync(file,'utf8');if(corrupt&&url.includes(corrupt))raw+=' ';return {ok:true,text:async()=>raw};}});
  for(const name of ['vendor/qrcodegen.js','drinking-water-records.js','pfas-sample-trace.js'])vm.runInContext(read(name),context);
  context.module={exports:{}};
  vm.runInContext(read('clinic-report.js'),context);
  return {api:context.module.exports,context,calls};
}
(async()=>{
  const {api,context,calls}=environment();
  assert.equal(api.validId('010106001'),true);
  assert.equal(api.validId('<script>'),false);
  assert.throws(()=>api.providerUrl('<script>'));
  const url=api.providerUrl('010106001','es','lcr');
  assert.equal(new URL(url).searchParams.get('system'),'010106001');
  assert.equal(new URL(url).searchParams.get('lang'),'es');
  assert.equal(new URL(url).searchParams.get('view'),'lcr');
  assert.equal(new URL(url).origin,'https://pfasestimator.org');
  const data=await api.load('CA4310011');
  assert(data.pfas&&data.lithium&&data.lcr,'Loads available families by the same exact provider ID');
  assert.equal(data.failed.some(Boolean),false);
  for(const lang of ['en','zh','es']){
    const html=api.render(data,lang,new Date('2026-11-24T12:00:00Z'));
    assert.match(html,/SAN JOSE WATER/);
    assert.match(html,/CA4310011/);
    assert.match(html,/µg\/L/);
    assert.match(html,/viewBox="0 0 /);
    assert.doesNotMatch(html,/undefined|NaN|Invalid Date/);
    assert(html.includes(`lang=${lang}`));
    const values=[...html.matchAll(/<strong(?: dir="auto")?>([^<]+)<\/strong>/g)].map(m=>m[1].replace(/[^0-9.,]/g,''));
    if(lang==='en')context.expectedValues=values;
    else assert.deepEqual(values,context.expectedValues,'All report values preserved across languages');
  }
  assert(calls.every(url=>url.startsWith('/')),'Report sends no results to external services');
  const synthetic={id:'TEST',name:'<script>alert(1)</script>',state:'UT',failed:[false,false,false],snapshot:'2026Q3',
    lithium:{lithium:[['2025-01-01',9,'<']]},lcr:{lead:[['2024-01-01','2024-06-30',0,'','id','sar',2]],copper:[]}};
  let html=api.render(synthetic,'en');
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
  assert.match(html,/Below 9 µg\/L/);assert.doesNotMatch(html,/Highest individual sample/);
  assert.match(html,/No matching usable records/);
  assert.match(html,/does not specify a detection symbol/);
  assert.match(html,/reported zero does not mean zero/);
  const multiple=api.lcrSection({...synthetic,lcr:{lead:[['2020-01-01','2020-06-30',90,'='],['2025-01-01','2025-06-30',2,'='],['2025-01-01','2025-06-30',3,'<']],copper:[]}},'en');
  assert.match(multiple,/2 µg\/L; &lt; 3 µg\/L/);assert.doesNotMatch(multiple,/90 µg\/L/);
  const system={pfoa_system_full_set:0,pfoa_max_location_average:null};
  const locations=[{samples:[[0,'2024-01-01','SE1','=',70],[5,'2024-01-01','SE1','=',100]],outcomes:Array.from({length:6},()=>[1,0,null])}];
  const incomplete=api.pfasSection({pfas:{system,locations}},'en');
  assert.match(incomplete,/No complete average/);assert.match(incomplete,/detection up to 70 ppt/);
  assert.doesNotMatch(incomplete,/detection up to 100 ppt/,'PFBS sample is not a mixture-index concentration');
  const bad=environment('website_lookup_compact.json');
  await assert.rejects(bad.api.pfasRecord('CA4310011'),/checksum/);
  const partial=await bad.api.load('CA4310011');
  assert.equal(partial.failed[0],true);assert.match(bad.api.render(partial),/could not be loaded or verified/);
  const absent=await api.load('ZZ9999999');assert.equal(absent.name,'');assert.throws(()=>api.render(absent));
  assert.match(api.intro('es'),/Crear informe para consulta/);
  assert.match(read('scientific-site-v2.js'),/clinic-report-link.*system=\$\{encodeURIComponent\(system.pwsid\)\}/);
  assert.match(read('drinking-water-records.js'),/clinic-report-link.*system=\$\{encodeURIComponent\(system.id\)\}/);
  console.log('Clinic report passed: exact provider identity, three languages, existing verified records, nondetects, missing averages, incomplete detections, blank signs, conflicting periods, checksum failure, safe links and local QR generation.');
})().catch(error=>{console.error(error);process.exitCode=1;});
