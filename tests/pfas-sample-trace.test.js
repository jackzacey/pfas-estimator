'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash, webcrypto} = require('node:crypto');
const trace = require('../pfas-sample-trace');
const root = path.join(__dirname,'..');
const source = fs.readFileSync(path.join(root,'pfas-sample-trace.js'),'utf8');
const manifestText = fs.readFileSync(path.join(root,'data/pfas-sample-trace/manifest.json'),'utf8');
const manifest = JSON.parse(manifestText);
const release = JSON.parse(fs.readFileSync(path.join(root,'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json')));
const systems = new Map(release.systems.map(r=>[r[0],Object.fromEntries(release.columns.map((k,i)=>[k,r[i]]))]));
assert(source.includes(createHash('sha256').update(manifestText).digest('hex')));
let rows=0, locations=0, systemCount=0;
for(const [name, hash] of Object.entries(manifest.files)) {
 const raw=fs.readFileSync(path.join(root,'data/pfas-sample-trace',name),'utf8');
 assert.equal(createHash('sha256').update(raw).digest('hex'),hash);
 for(const [id,ls] of Object.entries(JSON.parse(raw).systems)) {
  assert.equal(trace.bucket(id)+'.json',name);
  trace.verifySystem(ls,systems.get(id));systemCount++;
  for(const l of ls) {
   locations++;rows+=l.samples.length;
   for(let i=0;i<5;i++) {
    const o=l.outcomes[i], ss=l.samples.filter(r=>r[0]===i&&l.expected_events.includes(r[2]));
    assert(ss.every(r=>r[3]!=='<'||r[5]===0));
    if(o[1]) {
     assert.equal(ss.length,l.expected_events.length);
     const mean=ss.reduce((s,r)=>s+r[5],0)/ss.length;
     assert(Math.abs(mean-Number(o[4])*1000)<1e-8);
    }
   }
  }
 }
}
assert.equal(rows,398134);assert.equal(locations,26704);assert.equal(systemCount,10307);
const fixture={facility:'a',point:'b',name:'<unsafe>',point_name:'Entry',water:'SW',expected_events:['SE1','SE2','SE3','SE4'],
 samples:[[0,'2023-11-01','SE1','=',8,8,'x',2],[0,'2024-02-01','SE2','<',4,0,'y',3],[0,'2024-05-01','SE3','<',4,0,'z',4],[0,'2024-08-01','SE4','<',4,0,'w',5]],
 outcomes:[[1,1,.002,0,'0.002'],...[1,2,3,4,5].map(()=>[0,0,null,0,null])]};
let html=trace.render([fixture],{pfoa_max_location_average:.002},'en');
assert.match(html,/8 \+ 0 \+ 0 \+ 0/);assert.match(html,/÷ 4 = 2 ppt/);
assert.match(html,/2023-11-01 – 2024-08-01/);assert.match(html,/displayed maximum/);
assert.match(html,/&lt;unsafe&gt;/);assert.match(html,/&lt; 4/);
assert.match(html,/Missing required events/);assert.match(html,/not a separate average for each calendar year/);
assert.match(trace.render([fixture],{},'zh'),/仅计算/);
assert.throws(()=>trace.verifySystem([fixture],{sampling_location_count:2}),/coverage/);
const app=fs.readFileSync(path.join(root,'scientific-site-v2.js'),'utf8');
const boundary='  $("lookupButton").addEventListener("click", checkZip);';
const ctx=vm.createContext({});
vm.runInContext(app.slice(0,app.indexOf(boundary))+`globalThis.subject={setup(d){systemsById=new Map(d.map(s=>[s.pwsid,s]));},searchPfasProviders};})();`,ctx);
ctx.subject.setup([...systems.values()]);
assert.equal(ctx.subject.searchPfasProviders('RALEIGH')[0][0],'NC0392010');
assert.equal(ctx.subject.searchPfasProviders('NC0392010')[0][0],'NC0392010');
assert.equal(ctx.subject.searchPfasProviders('xy').length,0);
assert.equal(release.zip_to_pwsids['27601'],undefined,'ZIP mismatch remains explicit, not guessed');
(async()=>{
 const context=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,fetch:async url=>({ok:true,text:async()=>fs.readFileSync(path.join(root,url),'utf8')})});
 vm.runInContext(source,context);
 const s=systems.get('NC0392010');
 const data=await context.PFASSampleTrace.query(s);
 assert(data.length===s.sampling_location_count);
 console.log('PFAS source trace passed: all systems/maxima and hashes, 398,134 samples, cross-year sets, zero substitution, missing events, bilingual rendering, lazy fetch and Raleigh name fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
