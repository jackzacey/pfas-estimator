(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PFASLookupEvidence = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const keys = ['pfoa','pfos','pfhxs','pfna','hfpo_da','hi'];
  function coverage(system, rows) {
    if (!Array.isArray(rows) || !rows.length) return {known:false, all:false, outcomes:{}};
    const outcomes = Object.fromEntries(keys.map((key,i) => {
      const complete = rows.filter(r => r[5][i][0] === 1 && r[5][i][1] === 1).length;
      return [key, {complete, total:rows.length, unavailable:rows.length-complete}];
    }));
    return {known:true, all:keys.every(k => outcomes[k].unavailable === 0), outcomes};
  }
  function incompleteDetections(rows) {
    return (rows || []).flatMap(r => (r[7] || []).map(d => ({
      chemicalIndex:d[0], valuePpt:d[1], date:d[2], sampleId:d[3],
      event:d[4], sourceLine:d[5], facilityId:r[0], pointId:r[1], facilityName:r[2]
    })));
  }
  function validate(payload, release, expectedHash) {
    if (payload.release_id !== release.release_id || payload.lookup_sha256 !== expectedHash ||
        JSON.stringify(payload.outcomes) !== JSON.stringify(keys)) throw new Error('Evidence release mismatch');
    for (const values of release.systems) {
      const s = Object.fromEntries(release.columns.map((k,i)=>[k,values[i]]));
      const rows = payload.systems[String(s.pwsid)];
      if (!Array.isArray(rows) || rows.length !== s.sampling_location_count) throw new Error('Evidence location coverage mismatch');
      for (const r of rows) {
        if (!Array.isArray(r[7])) throw new Error('Missing sample detection context');
        for (const d of r[7]) {
          if (!Array.isArray(d) || d.length !== 6 || !Number.isInteger(d[0]) || d[0] < 0 || d[0] > 4 ||
              !Number.isFinite(d[1]) || d[1] <= 0 || typeof d[2] !== 'string' ||
              !/^\d{4}-\d{2}-\d{2}$/.test(d[2]) || !Number.isFinite(Date.parse(d[2])) ||
              new Date(d[2]).toISOString().slice(0,10) !== d[2] || typeof d[3] !== 'string' || !d[3] ||
              !['SE1','SE2','SE3','SE4'].includes(d[4]) || !Number.isInteger(d[5]) || d[5] < 2 ||
              r[5]?.[d[0]]?.[0] !== 1 || r[5]?.[d[0]]?.[1] !== 0) throw new Error('Invalid incomplete sample detection');
        }
        if (!Array.isArray(r[5]) || r[5].length !== 6 || r[5].some(o => ![0,1].includes(o[0]) || ![0,1].includes(o[1]) || (o[2] !== null && (!Number.isFinite(o[2]) || o[2] < 0)))) throw new Error('Invalid evidence outcome');
      }
      keys.forEach((k,i)=>{
        const vals=rows.map(r=>r[5][i][2]).filter(v=>v!==null);
        const maximum=vals.length ? Math.max(...vals) : null;
        if(maximum !== s[k+'_max_location_average'] || Number(rows.some(r=>r[5][i][1]===1)) !== s[k+'_system_full_set']) throw new Error('Evidence does not reproduce published outcome');
      });
    }
    return payload;
  }
  return {keys,coverage,incompleteDetections,validate};
});
