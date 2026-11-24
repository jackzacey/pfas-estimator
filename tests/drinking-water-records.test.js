'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {webcrypto, createHash} = require('node:crypto');
const root = path.join(__dirname, '..');
const api = require('../drinking-water-records');
const source = fs.readFileSync(path.join(root, 'drinking-water-records.js'), 'utf8');
const dataDir = path.join(root, 'data/drinking-water');
const manifestText = fs.readFileSync(path.join(dataDir, 'manifest.json'), 'utf8');
const manifest = JSON.parse(manifestText);
assert(source.includes(createHash('sha256').update(manifestText).digest('hex')), 'Browser pins the generated release manifest');
assert.deepEqual(api.lithiumSummary([['2025-01-01',9,'<']]), {value:9,detected:false});
assert.deepEqual(api.lithiumSummary([['2025-01-01',9,'<'],['2025-01-02',20,'=']]), {value:20,detected:true});
assert.equal(api.latestRecords([['','2020-01-01',100],['','2025-01-01',1]])[0][2],1,'Newest period wins, not highest historical concentration');
const synthetic = {id:'TEST',name:'<script>bad</script>',state:'CA',active:'A',type:'CWS',wholesale:'N',
 lithium:[['2025-01-01',9,'<','f','p','s','SE1',2]],lead:[['2024-01-01','2024-06-30',2,'','a','x',3],['2024-01-01','2024-06-30',3,'<','b','y',4]],copper:[],lead_periods:1,copper_periods:0};
let html=api.renderSystem(synthetic,'lithium','en');
assert.match(html,/&lt;script&gt;/);
assert.match(html,/All samples below reporting limits/);
assert.doesNotMatch(html,/>0 µg\/L/);
assert.match(html,/not an enforceable drinking-water limit/);
html=api.renderSystem(synthetic,'lcr','en');
assert.match(html,/Multiple reported values/);
assert.match(html,/Not supplied/);
assert.match(html,/&lt; 3/);
assert.match(html,/No result available here/);
assert.doesNotMatch(html,/safe water|meets the action level|no copper/i);
assert.match(api.renderSystem(synthetic,'lcr','zh'),/第90百分位/);
let shardSystems=0, lithiumRows=0, lead=0, copper=0;
for(const [name,sha] of Object.entries(manifest.files)) {
 const raw=fs.readFileSync(path.join(dataDir,name));
 assert.equal(createHash('sha256').update(raw).digest('hex'),sha,name);
 if(!name.startsWith('systems/')) continue;
 const payload=JSON.parse(raw);
 for(const [id,s] of Object.entries(payload.systems)) {
  shardSystems++;
  assert.equal(`systems/${api.bucket(id)}.json`,name);
  lithiumRows+=s.lithium.length;
  lead+=!!s.lead.length;copper+=!!s.copper.length;
  for(const key of ['lead','copper']) {
   assert(new Set(s[key].map(r=>r[0]+'|'+r[1])).size<=5);
   assert(s[key].every(r=>Number.isFinite(r[2])&&r[2]>=0));
  }
 }
}
assert.equal(shardSystems,manifest.audit.systems);
assert.equal(lithiumRows,manifest.audit.lithium_source_rows);
assert.equal(lead,manifest.audit.lead_systems);
assert.equal(copper,manifest.audit.copper_systems);
function browserApi(tamper=false) {
 const calls=[];
 const context=vm.createContext({crypto:webcrypto,TextEncoder,Uint8Array,console,fetch:async url=>{
  calls.push(url);const file=path.join(root,url);let raw=fs.readFileSync(file,'utf8');
  if(tamper&&url.endsWith('directory.json'))raw+=' ';
  return {ok:true,text:async()=>raw};
 }});
 vm.runInContext(source,context);
 return {api:context.DrinkingWaterRecords,calls};
}
(async()=>{
 const browser=browserApi();
 const li=await browser.api.query({zip:'95032',mode:'lithium'});
 assert(li.systems.some(s=>s.id==='CA4310011'));
 assert(!browser.calls.some(c=>c.endsWith('directory.json')),'Large directory is not loaded for ZIP lookup');
 const matches=await browser.api.search('RALEIGH','lcr');
 assert(matches.length,'Name fallback finds Raleigh independent of ZIP links');
 const direct=await browser.api.query({id:matches[0][0],mode:'lcr'});
 assert(direct.systems.length);
 assert.equal((await browser.api.query({zip:'00000',mode:'lcr'})).systems.length,0);
 const corrupt=browserApi(true);
 await assert.rejects(corrupt.api.search('raleigh','lcr'),/checksum/);
 console.log('Additional records passed: censored samples, latest periods, conflicting records, units, languages, all file hashes, lazy ZIP and name lookup, checksum failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
