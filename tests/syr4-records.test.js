'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{webcrypto}=require('node:crypto');
const root=path.join(__dirname,'..');
function env(corrupt=''){
 const c=vm.createContext({console,crypto:webcrypto,TextEncoder,Uint8Array,fetch:async url=>{let raw=fs.readFileSync(path.join(root,url),'utf8');if(corrupt&&url.includes(corrupt))raw+=' ';return {ok:true,text:async()=>raw};}});
 for(const file of ['chemical-context.js','syr4-records.js','drinking-water-records.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);
 return c;
}
(async()=>{
 const c=env(),a=c.SYR4Records;
 for(const mode of ['arsenic','nitrate']){
  const result=await c.DrinkingWaterRecords.query({zip:'84101',mode});assert(result.systems.length,'84101 association works');
  const s=result.systems.find(s=>s.id==='UTAH18026');assert(s);
  const exact=await a.query({id:s.id,mode});assert.equal(JSON.stringify(exact.systems[0]),JSON.stringify(s));
  assert((await a.search('SALT LAKE',mode)).length);
  for(const lang of ['en','zh','es','hi','ar','fr','bn','ru']){
   const html=a.renderSystem(s,mode,lang);assert(html.includes(`data-chemical-context="${mode}"`));assert(!/undefined|NaN/.test(html));assert(html.includes('2012–2019'));assert(html.includes('2019')||html.includes('2018'));assert(a.section(s,mode,lang,true).includes(c.ChemicalContext.copy[lang][mode][1]));
  }
 }
 const s={id:'TEST',name:'<script>',state:'CA',type:'C',arsenic:[['2019-01-01',null,'<','F','P','R','S',2,'EP','','','','',''],['2019-02-01',3,'=','F','P','R2','S2',3,'EP','','3','UG/L','','']]};
 assert.equal(a.summary(s.arsenic).max,3);assert.equal(a.summary(s.arsenic).unknown,1);assert(a.renderSystem(s,'arsenic').includes('&lt;script&gt;'));
 s.arsenic[1][2]='<';assert.equal(a.summary(s.arsenic).max,null,'Nondetect bound is not treated as a measured maximum');
 assert.equal((await a.query({id:'NO_SUCH_SYSTEM',mode:'nitrate'})).systems.length,0);
 await assert.rejects(()=>env('systems/').SYR4Records.query({id:'UTAH18026',mode:'arsenic'}),/checksum/);
 console.log('SYR4 checks passed: ZIP/direct/name lookup, eight-language education, bounds, missing limits, escaping, and checksum failures.');
})().catch(e=>{console.error(e);process.exit(1);});
