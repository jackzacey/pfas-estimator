(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PFASSystemMapModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const CHEMICALS = Object.freeze({
    pfoa: {name:'Perfluorooctanoic acid (PFOA)', short:'PFOA', reportingLimit:4},
    pfos: {name:'Perfluorooctanesulfonic acid (PFOS)', short:'PFOS', reportingLimit:4},
    pfhxs: {name:'Perfluorohexanesulfonic acid (PFHxS)', short:'PFHxS', reportingLimit:3},
    pfna: {name:'Perfluorononanoic acid (PFNA)', short:'PFNA', reportingLimit:4},
    hfpo_da: {name:'Hexafluoropropylene oxide dimer acid (HFPO-DA)', short:'HFPO-DA', reportingLimit:5}
  });
  const COLORS = Object.freeze({above:'#b96555', below:'#5594b4', incomplete:'#9ba8ae', nondetect:'#ffffff'});
  const concentrationColors = ['#c1dce8','#83b8cf','#4e94b6','#28678e'];
  function summary(system) {
    if (Number(system.any_system_above_mcl_comparison) === 1) return {key:'above',color:COLORS.above,label:'Above a study comparison level'};
    if (system._comparisonCoverage?.all === true) return {key:'below',color:COLORS.below,label:'No comparison level exceeded; complete comparison data'};
    return {key:'incomplete',color:COLORS.incomplete,label:'Incomplete comparison data; no exceedance identified in available results'};
  }
  function chemical(system, key) {
    const config = CHEMICALS[key];
    if (!config) throw new Error('Unknown map chemical');
    const raw = system[key + '_max_location_average'];
    const hasAverage = Number(system[key + '_system_full_set']) === 1 && typeof raw === 'number' && Number.isFinite(raw) && raw >= 0;
    const all = system._comparisonCoverage?.outcomes?.[key]?.unavailable === 0;
    const ppt = hasAverage ? raw * 1000 : null;
    const valueLabel = !hasAverage ? 'Not enough samples for a yearly average'
      : ppt === 0 ? `Below ${config.reportingLimit} parts per trillion (reporting limit)`
      : `${ppt.toLocaleString('en-US', {maximumFractionDigits:2})} parts per trillion`;
    if (!all || !hasAverage) return {key:'incomplete',color:COLORS.incomplete,label:'Incomplete comparison data',valueLabel,ppt,all:false};
    if (ppt === 0) return {key:'nondetect',color:COLORS.nondetect,label:'Below the reporting limit',valueLabel,ppt:null,all:true};
    const bin = ppt < 4 ? 0 : ppt < 10 ? 1 : ppt < 20 ? 2 : 3;
    return {key:'detected',color:concentrationColors[bin],label:valueLabel,valueLabel,ppt,all:true};
  }
  function resultUrl(id) { return '/?system=' + encodeURIComponent(id) + '#result'; }
  function hydrate(payload) { return payload.systems.map(r => Object.fromEntries(payload.columns.map((k,i) => [k,r[i]]))); }
  return {CHEMICALS,COLORS,concentrationColors,summary,chemical,resultUrl,hydrate};
});
