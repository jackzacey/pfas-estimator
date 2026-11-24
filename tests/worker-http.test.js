'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
let providerCalls=0;
const prompts=[];
const context=vm.createContext({Request,Response,Headers,TextEncoder,console,
 fetch:async(_url,options)=>{
  providerCalls++;prompts.push(JSON.parse(options.body).messages[0].content);
  return {ok:true,json:async()=>({choices:[{message:{content:'Consulte los registros y las fuentes oficiales de PFAS.'}}]})};
 }});
const source=fs.readFileSync(path.join(__dirname,'../cloudflare-worker.js'),'utf8');
vm.runInContext(source.replace('export default {','globalThis.worker = {'),context);
const env={GROQ_API_KEY:'test-only-placeholder',AI_RATE_LIMITER:{limit:async()=>({success:true})}};
const request=(body,origin='https://pfasestimator.org',method='POST')=>new Request('https://example.test/',{
 method,headers:{Origin:origin,'Content-Type':'application/json'},...(method==='POST'?{body:typeof body==='string'?body:JSON.stringify(body)}:{})});
const run=(body,settings=env)=>context.worker.fetch(request(body),settings,{});
(async()=>{
 let response=await context.worker.fetch(request(null,'https://pfasestimator.org','OPTIONS'),env,{});
 assert.equal(response.status,204);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://pfasestimator.org');
 response=await context.worker.fetch(request({},'https://other.example'),env,{});
 assert.equal(response.status,403);
 response=await run('{');assert.equal(response.status,400);
 response=await run('x'.repeat(30001));assert.equal(response.status,413);
 response=await run(null);assert.equal(response.status,400,'A non-object JSON body returns a clear client error');
 for(const invalid of [[],false,42,'"text"']){response=await run(invalid);assert.equal(response.status,400);}
 response=await run({action:'chat',language:'es',messages:[]});assert.equal(response.status,400);
 response=await run({action:'chat',language:'es',messages:[{role:'user',content:'¿Es segura el agua?'}]});
 assert.equal(response.status,200);assert.match((await response.json()).content,/no permiten decidir/);
 assert.equal(providerCalls,0,'Safety boundary uses a fixed response');
 response=await run({action:'chat',language:'es',messages:[{role:'user',content:'Explique PFAS en español.'}]});
 assert.equal(response.status,200);assert.match((await response.json()).content,/Fuente:/);
 assert.equal(providerCalls,1);assert.match(prompts[0],/Responde completamente en español/);
 response=await run({action:'chat',messages:[{content:'Explain PFAS.'}]},{...env,AI_RATE_LIMITER:{limit:async()=>({success:false})}});
 assert.equal(response.status,429);assert.equal(providerCalls,1);
 response=await run({action:'chat',messages:[{content:'Explain PFAS.'}]},{});assert.equal(response.status,503);
 console.log('Worker HTTP checks passed: allowed origins, preflight, invalid requests, Spanish replies, fixed boundary answers, throttling and missing configuration; no real provider calls.');
})().catch(error=>{console.error(error);process.exitCode=1;});
