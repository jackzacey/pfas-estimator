'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context=require('../chemical-context');
const records=require('../drinking-water-records');
for(const lang of ['en','zh','es','hi','ar','fr','bn','ru']){
 assert.equal(context.copy[lang].labels.length,6);
 for(const key of ['lead','copper','lithium','pfas','arsenic','nitrate']){
  assert.equal(context.copy[lang][key].length,4);
  const html=context.render(key,lang);
  for(const sentence of context.copy[lang][key])assert(html.includes(sentence.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')),'Every translated definition/research/meaning/next step is present');
  assert(html.includes('target="_blank" rel="noopener noreferrer"'));
  assert(html.includes('<details'));
  assert(!context.render(key,lang,{report:true}).includes('<details'),'Print context is expanded');
  assert(!context.render(key,lang,{available:false}).includes(context.copy[lang][key][2]),'No unavailable result is interpreted as an available measurement');
 }
}
assert.equal(context.render('not-a-chemical'), '');
const fixture={id:'TEST',name:'Example',state:'UT',lithium:[['2025-01-01',9,'<','F','P','S','SE1',2]],lead:[['2024-01-01','2024-06-30',0,'','S','R',2]],copper:[]};
assert.equal(records.lithiumSummary(fixture.lithium).value,9);
assert(records.renderSystem(fixture,'lithium','en').includes('data-chemical-context="lithium"'));
const lcr=records.renderSystem(fixture,'lcr','en');
assert(lcr.includes('data-chemical-context="lead"')&&lcr.includes('data-chemical-context="copper"'));
assert(lcr.includes('No result available here'));
for(const file of ['index.html','report/index.html']){
 const html=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
 assert(html.indexOf('/chemical-context.js')<html.indexOf('/drinking-water-records.js'));
 assert(html.includes('/chemical-context.css'));
}
console.log('Chemical meaning checks passed: 6 chemical groups × 8 languages, source links, missing-result handling, printable expanded content, and page dependency order.');
