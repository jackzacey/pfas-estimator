'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const raw = read('analysis/exports/ucmr5_jan2026_v0_2/website_lookup_compact.json');
const reviews = read('config/zip-association-reviews.json');
const source = fs.readFileSync(path.join(root, 'scientific-site-v2.js'), 'utf8');
const boundary = '  $("lookupButton").addEventListener("click", checkZip);';
const ctx = vm.createContext({});
vm.runInContext(source.slice(0, source.indexOf(boundary)) + '\n globalThis.apply = applyZipReviews; globalThis.reviewNote = renderAssociationReview; globalThis.setReview = (value, zip, lang) => { release = value; lastLookupZip = zip; currentLang = lang; };\n})();', ctx);
const before = JSON.stringify(raw);
const clean = ctx.apply(raw, reviews);
assert.ok(clean.pending_associations['01801'].includes('OK1010604'));
assert.ok(!clean.pending_associations['00802']);
assert.ok(!clean.pending_associations['03901']);
assert.ok(clean.pending_associations['42223'].includes('TN0000820'));
assert.throws(() => ctx.apply(raw, {...reviews, pending_associations: {'95032': ['FAKE']}}), /Invalid pending/);
assert.equal(JSON.stringify(raw), before, 'Raw release must remain untouched');
assert.equal(clean.systems, raw.systems, 'Measurements must remain untouched');
assert.deepEqual(Array.from(clean.zip_to_pwsids['95032']), ['CA4310011']);
assert.ok(clean.zip_to_pwsids['96743'].includes('HI0000151'), 'Keep Hawaii associations pending verification');
const exclusions = new Set(reviews.reviews.flatMap(r => r.excluded_zips.map(z => `${z}:${r.pwsid}`)));
let removed = 0;
for (const [zip, ids] of Object.entries(raw.zip_to_pwsids)) {
  const expected = ids.filter(id => !exclusions.has(`${zip}:${id}`));
  assert.deepEqual(Array.from(clean.zip_to_pwsids[zip] || []), expected, `Unexpected change at ${zip}`);
  removed += ids.length - expected.length;
}
assert.equal(removed, 73);
assert.ok(clean.zip_to_pwsids['42223'].includes('TN0000820'), 'Retain actual border-system candidate');
assert.equal(clean.zip_to_pwsids['00000'], undefined);
assert.equal(JSON.stringify(ctx.apply(clean, reviews)), JSON.stringify(clean), 'Review overlay is idempotent');
assert.throws(() => ctx.apply(raw, {...reviews, release_id: 'wrong'}), /does not match/);
// A synthetic cross-state system is retained unless individually reviewed.
const example = {...raw, zip_to_pwsids: {'95032': ['HI0000151'], '12345': ['CROSS_STATE']}};
const result = ctx.apply(example, {...reviews, pending_associations: {}});
assert.equal(result.zip_to_pwsids['95032'], undefined, 'Remove empty keys, not create false results');
assert.deepEqual(Array.from(result.zip_to_pwsids['12345']), ['CROSS_STATE']);
assert.ok(source.includes('!zipReviewsResponse.ok'), 'Fail closed if correction file cannot load');
console.log('ZIP association reviews: passed; exactly 73 reviewed links excluded, all other links and measurements preserved.');

ctx.setReview(clean, '42223', 'en');
assert.match(ctx.reviewNote({pwsid: 'TN0000820'}), /needs checking/);
ctx.setReview(clean, '42223', 'zh');
assert.match(ctx.reviewNote({pwsid: 'TN0000820'}), /尚待核实/);
ctx.setReview(clean, '95032', 'en');
assert.equal(ctx.reviewNote({pwsid: 'CA4310011'}), '');

assert.throws(() => ctx.apply(raw, {...reviews, pending_associations: undefined}), /Missing pending/);
