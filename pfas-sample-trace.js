(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PFASSampleTrace = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const BASE = '/data/pfas-sample-trace';
  const RELEASE = 'pfas-sample-trace-2026-11-23-v1';
  const MANIFEST_SHA = '0655b63b76b12f61fdf24707d6bdff5fb3b07594c71aad0e35883367897fc4fe';
  const CHEMICALS = ['PFOA','PFOS','PFHxS','PFNA','HFPO-DA','PFBS'];
  const KEYS = ['pfoa','pfos','pfhxs','pfna','hfpo_da'];
  const cache = new Map();
  const t = (lang, en, zh) => lang === 'zh' ? zh : lang === 'es' && typeof PFASHomeLanguage !== 'undefined' ? PFASHomeLanguage.translate(en) : typeof SiteLanguages!=='undefined'?SiteLanguages.translate(en,lang):en;
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const n = v => Number(v).toLocaleString('en-US',{maximumSignificantDigits:10});
  function bucket(id) { let v=0; for(const c of id) v=(v*31+c.charCodeAt(0))%128; return v.toString(16).padStart(2,'0'); }
  async function hash(text) {
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  }
  async function load(file) {
    if(!cache.has(file)) {
      const task=(async()=>{
        const manifest=file==='manifest.json'?null:await load('manifest.json');
        const expected=manifest?manifest.files[file]:MANIFEST_SHA;
        if(!expected)throw new Error('Sample file not in manifest');
        const response=await fetch(`${BASE}/${file}`);
        if(!response.ok)throw new Error('Sample records unavailable');
        const raw=await response.text();
        if(await hash(raw)!==expected)throw new Error('Sample checksum mismatch');
        const payload=JSON.parse(raw);
        if(payload.release_id!==RELEASE)throw new Error('Sample release mismatch');
        return payload;
      })();
      cache.set(file,task);task.catch(()=>cache.delete(file));
    }
    return cache.get(file);
  }
  function verifySystem(locations, system) {
    if(!Array.isArray(locations)||locations.length!==system.sampling_location_count)throw new Error('Sample location coverage mismatch');
    for(const [i,k] of [...KEYS,'hi'].entries()) {
      const full=locations.filter(l=>l.outcomes[i][1]);
      const max=full.length?Math.max(...full.map(l=>l.outcomes[i][2])):null;
      if(max!==system[k+'_max_location_average'])throw new Error('Sample trace differs from displayed average');
    }
    return locations;
  }
  async function query(system) {
    const payload=await load(`${bucket(String(system.pwsid))}.json`);
    return verifySystem(payload.systems[String(system.pwsid)],system);
  }
  function chemistry(loc, i, system, lang) {
    const samples=loc.samples.filter(r=>r[0]===i);
    const outcome=i<5?loc.outcomes[i]:null;
    const full=outcome?Boolean(outcome[1]):loc.expected_events.every(e=>samples.some(r=>r[2]===e));
    const highest=full&&outcome&&system[KEYS[i]+'_max_location_average']===outcome[2];
    const included=samples.filter(r=>loc.expected_events.includes(r[2]));
    const dates=included.map(r=>r[1]).sort();
    let explanation;
    if(full) {
      const values=included.map(r=>n(r[5]));
      const mean=outcome?Number(outcome[4])*1000:included.reduce((sum,r)=>sum+r[5],0)/included.length;
      explanation=`<p>${t(lang,'Calculation inputs (ppt)','计算输入值（ppt）')}: (${values.join(' + ')}) ÷ ${included.length} = ${n(mean)} ppt ${t(lang,'before display rounding','（显示舍入前）')}.</p>`;
      if(outcome)explanation+=`<p>${t(lang,'EPA-compatible rounded location average','按EPA精度舍入的采样点平均值')}: ${n(outcome[2]*1000)} ppt.${highest?' '+t(lang,'This location shares the highest displayed average for this chemical in the system.','此采样点为该系统此物质显示的最高平均值之一。'):''}</p>`;
      else explanation+=`<p>${t(lang,'PFBS is included as a mixture-index component, not a separate benchmark card.','PFBS用于混合物指数，而非单独的基准卡。')}</p>`;
    } else {
      const missing=loc.expected_events.filter(e=>!samples.some(r=>r[2]===e));
      explanation=`<p>${t(lang,'No complete location average. Missing required events','无完整采样点平均值。缺少必需事件')}: ${missing.map(esc).join(', ')}. ${t(lang,'Missing samples are not assigned zero or included as a complete yearly average.','缺失样本不会按零计或纳入完整年度平均值。')}</p>`;
    }
    const rows=samples.map(r=>`<tr><td><bdi dir="ltr">${esc(r[1])}</bdi></td><td>${esc(r[2])}</td><td>${r[3]==='<'?'&lt; ':''}${n(r[4])}</td><td>${n(r[5])}${r[3]==='<'?' '+t(lang,'(calculation only)','（仅计算）'):''}</td><td>${esc(r[6])}</td><td>${r[7]}</td></tr>`).join('');
    return `<details class="pfas-trace-chemical"><summary>${CHEMICALS[i]} · ${full?t(lang,'complete set','完整样本组'):t(lang,'incomplete set','样本不完整')}${highest?' · '+t(lang,'displayed maximum','显示的最高值'):''}</summary>${dates.length?`<p>${t(lang,'Required-set collection dates','必需样本组采集日期')}: ${esc(dates[0])} – ${esc(dates.at(-1))}.</p>`:''}${explanation}${samples.length?`<div class="water-record-table" role="region" tabindex="0" aria-label="${CHEMICALS[i]} source samples"><table><thead><tr>${[t(lang,'Date','日期'),t(lang,'Event','事件'),t(lang,'Reported result (ppt)','报告结果（ppt）'),t(lang,'Input to average (ppt)','平均值输入（ppt）'),t(lang,'Sample ID','样本编号'),t(lang,'Source row','源文件行号')].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`:`<p>${t(lang,'No source samples for this chemical at this location.','此采样点无此物质的原始样本。')}</p>`}</details>`;
  }
  function render(locations, system, lang, options = {}) {
    if (options.calculations === false) {
      const x=(en,zh,es)=>lang==='zh'?zh:lang==='es'?es:typeof SiteLanguages!=='undefined'?SiteLanguages.translate(en,lang):en;
      return `<p>${x('“<” means below the reporting limit, not zero. Dates are when samples were collected.','“<”表示低于报告限值，并非为零。日期是样本采集日期。','«<» significa por debajo del límite de reporte, no cero. Las fechas indican cuándo se tomaron las muestras.')}</p>
        ${locations.map(loc=>`<details class="pfas-trace-location"><summary>${esc(loc.name)} · ${esc(loc.facility)} / ${esc(loc.point)}</summary>
        <div class="water-record-table" role="region" tabindex="0" aria-label="${x('Individual PFAS samples','单次PFAS样本','Muestras individuales de PFAS')}"><table><thead><tr>${[x('Date','日期','Fecha'),x('Chemical','化学物质','Sustancia'),x('Result (ppt)','结果（ppt）','Resultado (ppt)')].map(h=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${loc.samples.map(r=>`<tr><td><bdi dir="ltr">${esc(r[1])}</bdi></td><td>${CHEMICALS[r[0]]}</td><td>${r[3]==='<'?'&lt; ':''}${n(r[4])}</td></tr>`).join('')}</tbody></table></div>
        <p class="compact-caption">${x('PFBS contributes to the mixture index; it has no separate summary card.','PFBS参与混合物指数计算，无单独汇总卡。','PFBS contribuye al índice de mezcla; no tiene una tarjeta de resumen independiente.')}</p></details>`).join('')}
        <p><a href="/methodology/?system=${encodeURIComponent(system.pwsid)}#sample-trace">${x('See sample IDs, source rows and average calculations','查看样本编号、来源行与平均值计算','Ver números de muestra, filas de origen y cálculos')} →</a></p>`;
    }
    return `<p>${t(lang,'Each average uses one required UCMR monitoring set at one location—not all samples pooled across 2023–2025, and not a separate average for each calendar year. A set can cross a calendar-year boundary. Groundwater requires SE1 and SE2; surface water, mixed sources, and groundwater under direct surface-water influence require SE1–SE4.','每项平均值使用一个采样点的一组必需UCMR监测事件，而非合并2023–2025年所有样本，也非按日历年分别计算。一组事件可能跨日历年。地下水需要SE1和SE2；地表水、混合水源及受地表水直接影响的地下水需要SE1–SE4。')}</p>
      <p>${t(lang,'“<” retains the reported limit, not a measured zero. Only that sample’s averaging input is zero. Missing events remain missing. All concentrations below are in parts per trillion (ppt); original µg/L values are multiplied by 1,000. The mixture index is unitless.','“<”保留报告限值，并非测得为零。仅该样本的计算输入为零。缺失事件保持缺失。以下浓度单位均为万亿分之一（ppt）；原始µg/L值乘以1,000。混合物指数无单位。')}</p>
      ${locations.map(loc=>`<details class="pfas-trace-location"><summary>${esc(loc.name)} · ${esc(loc.facility)} / ${esc(loc.point)}</summary><p>${esc(loc.point_name)} · ${t(lang,'Source type','水源类型')}: ${esc(loc.water)} · ${t(lang,'Required events','必需事件')}: ${loc.expected_events.map(esc).join(', ')}.</p>${CHEMICALS.map((_,i)=>chemistry(loc,i,system,lang)).join('')}
      <p>${loc.outcomes[5][1]?t(lang,`Mixture index: (PFHxS average ÷ 10) + (PFNA average ÷ 10) + (HFPO-DA average ÷ 10) + (PFBS average ÷ 2,000), with component averages in ppt. Unrounded index here: ${loc.outcomes[5][4]}. Components are from this same location; maxima from different locations are not combined.`,`混合物指数：（PFHxS平均值÷10）+（PFNA平均值÷10）+（HFPO-DA平均值÷10）+（PFBS平均值÷2,000），组分平均值单位为ppt。本采样点未舍入指数：${loc.outcomes[5][4]}。组分来自同一采样点，不合并不同点的最高值。`):t(lang,'No complete mixture index: one or more component sampling sets are missing.','混合物指数不完整：缺少一个或多个组分的完整样本组。')}</p></details>`).join('')}
      <p class="compact-caption">UCMR5_All.txt · ${t(lang,'Source row numbers include the header as row 1. Calculations reproduce the pinned final-release averages; these checks do not constitute an independent review or compliance determination.','源文件表头为第1行。计算复现固定最终版本的平均值；这些检查不构成独立评审或合规判定。')}</p><p><a href="/data/pfas-sample-trace/manifest.json">${t(lang,'Sample-trace validation and file fingerprints','样本追溯验证及文件指纹')}</a></p>`;
  }
  return {bucket, verifySystem, query, render, chemistry};
});
