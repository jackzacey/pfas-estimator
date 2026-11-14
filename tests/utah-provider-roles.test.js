'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const release='analysis/exports/ucmr5_final_aug2026_v1/';
const raw=read(release+'website_lookup_compact.json'),reviews=JSON.parse(read(release+'zip-association-reviews.json'));
const nodes=new Map(),el=()=>({textContent:'',innerHTML:'',hidden:false,className:'',classList:{add(){},remove(){},contains(){return false;}},setAttribute(){},replaceChildren(){},appendChild(){}});
const ctx=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,document:{getElementById(id){if(!nodes.has(id))nodes.set(id,el());return nodes.get(id);},createElement:el},requestAnimationFrame(){},window:{location:{pathname:'/'}},history:{replaceState(){}},console});
vm.runInContext(read('lookup-evidence.js'),ctx);
const source=read('scientific-site-v2.js'),boundary='  $("lookupButton").addEventListener("click", checkZip);';
vm.runInContext(source.slice(0,source.indexOf(boundary))+`
globalThis.testSubject={readReviewedLookup,applyZipReviews,partitionZipSystems,renderWholesaleAssociations,
setup(data,meta,periods,evidence,links){release=data;metadata=meta;providerLinks=links.systems;evidenceById=new Map(Object.entries(evidence.systems));systemsById=new Map(hydrateRows(data).map(s=>{s._comparisonCoverage=PFASLookupEvidence.coverage(s,evidenceById.get(s.pwsid));return[s.pwsid,s]}));monitoringById=new Map(hydrateMonitoringRows(periods).map(s=>[s.pwsid,s]));},
zip(z,lang='en'){currentLang=lang;renderLookup(z,false);return {ids:currentSystems.map(s=>s.pwsid),context:currentContext,html:$('resultBody').innerHTML};},
direct(id){renderSelectedSystem(id);return {ids:currentSystems.map(s=>s.pwsid),context:currentContext};}
};})();`,ctx);
(async()=>{
 const payload=await ctx.testSubject.readReviewedLookup({text:async()=>raw},reviews),frozen=JSON.parse(raw);
 assert.equal(JSON.stringify(payload.systems),JSON.stringify(frozen.systems),'All measurement rows preserved');
 assert.equal(JSON.stringify(payload.zip_to_pwsids['84010']),JSON.stringify(frozen.zip_to_pwsids['84010']),'Reported source link retained');
 ctx.testSubject.setup(payload,JSON.parse(read(release+'website_metadata.json')),JSON.parse(read(release+'website_monitoring_periods.json')),JSON.parse(read(release+'lookup-evidence.json')),JSON.parse(read('config/provider-links.json')));
 const cases=[['84102',['UTAH18026'],'UTAH18027','pending'],['84010',['UTAH06009','UTAH06015'],'UTAH18026','pending'],['84088',['UTAH18020'],'UTAH18027','wholesale'],['84065',['UTAH18004','UTAH18025'],'UTAH18027','wholesale']];
 for(const [zip,ids,excluded,mode] of cases){
  const v=ctx.testSubject.zip(zip);assert.deepEqual(Array.from(v.ids).sort(),ids.sort(),zip);
  assert.doesNotMatch(v.context,new RegExp('\\(PWSID '+excluded+','),'Excluded system must have no concentration record in AI context');
  assert.match(v.html,new RegExp('/\\?system='+excluded),'Explicit system record remains accessible');
  assert.match(v.html,mode==='pending'?/Provider associations needing confirmation/:/Possible upstream wholesale suppliers/);
  const zh=ctx.testSubject.zip(zip,'zh');assert.match(zh.html,mode==='pending'?/需要确认的供水机构关联/:/可能的上游批发供水机构/);
 }
 const mixed=ctx.testSubject.zip('84119');assert.ok(Array.from(mixed.ids).includes('UTAH18027'));assert.match(mixed.html,/serves some customers directly and sells water/);assert.match(mixed.context,/both retail and wholesale roles/);
 assert.match(ctx.testSubject.zip('84119','zh').html,/既直接向部分用户供水/);
 for(const id of ['UTAH18027','UTAH18026']){const v=ctx.testSubject.direct(id);assert.deepEqual(Array.from(v.ids),[id]);assert.match(v.context,/selected this water system directly/);}
 const affected=new Set(cases.map(c=>c[0]));
 const sample=['84088','84005','84065','84401','84003','84655','84040','84780','84050','84029','84520','84010','84119','84035','84129','84074','84004','84073','84647','84111','84002','84315','84321','84405','84627','84322','84664','84112','84335','84102'];
 for(const z of sample.filter(z=>!affected.has(z))){assert.deepEqual(Array.from(ctx.testSubject.zip(z).ids).sort(),[...frozen.zip_to_pwsids[z]].sort(),'Other candidate list unchanged: '+z);}
 const invalid={...reviews,association_roles:{'84088':{'FAKE':{role:'wholesale',sources:['https://example.org']}}}};
 assert.throws(()=>ctx.testSubject.applyZipReviews(frozen,invalid),/Invalid provider role/);
 console.log('Utah provider roles passed: five affected associations, bilingual presentation, AI isolation, direct system access, untouched ZIPs and measurement preservation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
