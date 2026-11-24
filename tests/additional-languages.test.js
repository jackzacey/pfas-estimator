'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const languages=require('../site-languages');
const menu=require('../language-menu');
const packs=require('../language-packs');
const root=path.join(__dirname,'..');
assert.deepEqual(languages.supported,menu.languages.map(l=>l[0]),'Menu and locale support agree');
assert.equal(menu.languages.length,8);
assert.equal(languages.normalizeDigits('০১০১০৬০০১'),'010106001');
for(const lang of ['fr','bn','ru']){
 assert.equal(languages.initialLanguage('?lang='+lang),lang);
 assert.match(languages.locale(lang),new RegExp('^'+lang));
 const missing=languages.missing(lang).filter(s=>!(lang==='fr'?['Lithium','Conversation','Date','PFAS','rural']:['PFAS']).includes(s));
 assert.deepEqual(missing,[],lang+' has no untranslated entries in the registered lookup/report catalog');
 for(const text of ['Below 4 ppt','Below 9 µg/L','2 possible water systems for ZIP 95032','This sample is above the 10 µg/L screening reference.']){
  const translated=languages.translate(text,lang);assert.notEqual(translated,text);assert.deepEqual(translated.match(/[0-9]+/g).sort(),text.match(/[0-9]+/g).sort(),'Values remain unchanged across native sentence order');
 }
 assert(languages.translate('Test dates: 2025-01-01',lang).includes('2025-01-01'));
 for(const values of Object.values(packs.copy))assert.equal(values.length,3);
 for(const values of Object.values(packs.phrases))assert.equal(values.length,3);
}
assert.equal(languages.translate('Below 9 µg/L','bn'),'9 µg/L-এর নিচে');
assert.equal(languages.translate('Below 9 µg/L','hi'),'9 µg/L से नीचे','Existing Hindi nondetect wording is preserved');
for(const file of ['index.html','report/index.html']){
 const html=fs.readFileSync(path.join(root,file),'utf8');
 assert(html.indexOf('/language-packs.js')<html.indexOf('/site-languages.js'),'Language packs load before the shared translator');
 assert.equal((html.match(/src="\/language-packs.js/g)||[]).length,1);
}
console.log('Additional language checks passed: French, Bengali and Russian catalog coverage, eight matching menu options, unchanged values, Bengali digit input, nondetect units and source ordering.');
