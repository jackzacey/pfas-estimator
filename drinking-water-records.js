/* Dated supplemental records. PFAS averages and assistant remain separate. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.DrinkingWaterRecords = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const health = typeof ChemicalContext !== 'undefined' ? ChemicalContext : typeof module==='object' && module.exports && typeof require==='function' ? require('./chemical-context') : null;
  const BASE = '/data/drinking-water';
  const RELEASE = 'drinking-water-2026-11-23-v1';
  const MANIFEST_SHA = '0f57390b777e224b4c25cb8440f374f9f8443730ab489585bb258d82711d1c4e';
  const cache = new Map();
  const t = (lang, en, zh) => lang === 'zh' ? zh : lang === 'es' && typeof PFASHomeLanguage !== 'undefined' ? PFASHomeLanguage.translate(en) : typeof SiteLanguages!=='undefined'?SiteLanguages.translate(en,lang):en;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number = value => Number(value).toLocaleString('en-US', {maximumFractionDigits: 8});
  function bucket(id) {
    let value = 0;
    for (const c of id) value = (value * 31 + c.charCodeAt(0)) % 128;
    return value.toString(16).padStart(2, '0');
  }
  async function digest(text) {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(bytes), v => v.toString(16).padStart(2, '0')).join('');
  }
  async function load(file) {
    if (!cache.has(file)) {
      const task = (async () => {
        const manifest = file === 'manifest.json' ? null : await load('manifest.json');
        const expected = manifest ? manifest.files[file] : MANIFEST_SHA;
        // A prefix without source associations is an empty lookup, not a server error.
        if (manifest && !expected && /^zip\/\d{3}\.json$/.test(file)) return {release_id: RELEASE, zips: {}};
        if (!expected) throw new Error('Record file not in release');
        const response = await fetch(`${BASE}/${file}`);
        if (!response.ok) throw new Error('Record download failed');
        const raw = await response.text();
        if (await digest(raw) !== expected) throw new Error('Record checksum mismatch');
        const result = JSON.parse(raw);
        if (result.release_id !== RELEASE) throw new Error('Record release mismatch');
        return result;
      })();
      cache.set(file, task);
      task.catch(() => cache.delete(file));
    }
    return cache.get(file);
  }
  async function query({zip, id, mode}) {
    let ids = id ? [id] : [];
    if (zip) {
      const index = await load(`zip/${zip.slice(0, 3)}.json`);
      ids = index.zips[zip]?.[mode === 'lithium' ? 'lithium' : 'lcr'] || [];
    }
    const shards = new Map(await Promise.all([...new Set(ids.map(bucket))].map(async key => [key, await load(`systems/${key}.json`)])));
    const systems = ids.map(p => shards.get(bucket(p)).systems[p]).filter(Boolean)
      .filter(s => mode === 'lithium' ? s.lithium.length : s.lead.length || s.copper.length)
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    return {systems, manifest: await load('manifest.json')};
  }
  async function search(value, mode, field = "all") {
    const q = value.trim().toLowerCase();
    if (q.length < 3) return [];
    const directory = await load('directory.json');
    const matches = directory.systems.filter(r => r[mode === 'lithium' ? 3 : 4] && (r[1].toLowerCase().includes(q) || field !== 'name' && r[0].toLowerCase().includes(q)));
    const rank = row => row[0].toLowerCase() === q ? 0 : row[1].toLowerCase() === q ? 1 : row[1].toLowerCase().startsWith(q) ? 2 : 3;
    return matches.sort((a,b) => rank(a) - rank(b) || a[1].length - b[1].length || a[1].localeCompare(b[1])).slice(0, 20);
  }
  function lithiumSummary(rows) {
    const detects = rows.filter(r => r[2] === '=');
    if (detects.length) return {value: Math.max(...detects.map(r => r[1])), detected: true};
    const limits = [...new Set(rows.map(r => r[1]))];
    return {value: limits.length === 1 ? limits[0] : null, detected: false};
  }
  function latestRecords(rows) {
    if (!rows.length) return [];
    const latest = rows.reduce((d, r) => r[1] > d ? r[1] : d, '');
    return rows.filter(r => r[1] === latest);
  }
  function table(headings, rows) {
    return `<div class="water-record-table" tabindex="0" role="region" aria-label="${esc(headings[0])}"><table><thead><tr>${headings.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(v => `<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  function age(date, lang, now = new Date()) {
    const end = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(end)) return '';
    if (end > now.getTime()) return t(lang, 'The reported date is in the future; verify it with the provider.', '报告日期在未来；请向供水机构核实。');
    if (now.getTime() - end > 366 * 86400000) return t(lang, 'These results are over a year old. Ask your provider for newer information.', '这些结果已超过一年。请向供水机构查询更新资料。');
    return t(lang, 'Check with your provider for newer results.', '请向供水机构查询更新结果。');
  }
  function sourceLinks(mode, lang) {
    const url = mode === 'lithium' ? 'https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule' : 'https://echo.epa.gov/tools/data-downloads#drinkingwater';
    return `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${t(lang, 'Download the original EPA records', '下载EPA原始记录')} ↗</a> · <a href="/methodology/#additional-chemicals">${t(lang, 'Methods and limitations', '方法与局限')}</a></p>`;
  }
  const x = (lang,en,zh,es) => lang==='zh'?zh:lang==='es'?es:typeof SiteLanguages!=='undefined'?SiteLanguages.translate(en,lang):en;
  function renderLithium(system, lang) {
    const rows=system.lithium, summary=lithiumSummary(rows);
    const dates=rows.map(r=>r[0]).sort();
    const value=summary.value===null?'—':`${summary.detected?'':'< '}${number(summary.value)} µg/L`;
    const label=summary.detected?x(lang,'Highest individual sample','最高单次样本','Muestra individual más alta'):x(lang,'All samples below reporting limits','所有样本均低于报告限值','Todas las muestras por debajo del límite de reporte');
    const comparison=summary.detected?x(lang,`This sample is ${summary.value>10?'above':summary.value===10?'equal to':'below'} the 10 µg/L screening reference.`,`此样本${summary.value>10?'高于':summary.value===10?'等于':'低于'}10 µg/L筛查参考值。`,`Esta muestra está ${summary.value>10?'por encima de':summary.value===10?'al nivel de':'por debajo de'} la referencia orientativa de 10 µg/L.`):x(lang,'Screening reference: 10 µg/L.','筛查参考值：10 µg/L。','Referencia orientativa: 10 µg/L.');
    return `<p class="compact-dates">${x(lang,'Test dates','检测日期','Fechas de pruebas')}: <bdi dir="ltr">${esc(dates[0])} – ${esc(dates.at(-1))}</bdi>.</p>
      <div class="water-record-value"><span>${label}</span><strong dir="auto">${esc(value)}</strong></div>
      <p class="compact-caption">${x(lang,'µg/L = micrograms per liter (about parts per billion). “<” means below the reporting limit, not zero.','µg/L为微克/升（约十亿分之一）。“<”表示低于报告限值，并非为零。','µg/L = microgramos por litro (aproximadamente partes por mil millones). «<» significa por debajo del límite de reporte, no cero.')}</p>
      <p>${comparison} ${x(lang,'This is not an enforceable drinking-water limit.','这不是可强制执行的饮用水限值。','Esta referencia no es un límite de agua potable exigible por ley.')}</p>
      <details class="compound-results-details"><summary>${x(lang,'Samples and test dates','样本与检测日期','Muestras y fechas de pruebas')} (${rows.length})</summary>${table([x(lang,'Date','日期','Fecha'),x(lang,'Result (µg/L)','结果（µg/L）','Resultado (µg/L)'),x(lang,'Location','采样点','Punto')],rows.map(r=>[r[0],`${r[2]==='<'?'< ':''}${number(r[1])}`,`${r[3]} / ${r[4]}`]))}</details>${health ? health.render('lithium',lang) : ''}`;
  }
  function renderLcrChemical(system,key,lang) {
    const name=key==='lead'?x(lang,'Lead','铅','Plomo'):x(lang,'Copper','铜','Cobre');
    const rows=system[key];
    if(!rows.length)return `<section class="water-record-chemical"><h4>${name}</h4><p>${x(lang,'No result available here. Ask your provider for its latest tests.','此处无可用结果。请向供水机构查询最新检测。','No hay un resultado disponible aquí. Pida las pruebas más recientes a su proveedor.')}</p>${health ? health.render(key,lang,{available:false}) : ''}</section>`;
    const latest=latestRecords(rows);
    const values=[...new Set(latest.map(r=>`${r[3]==='<'?'< ':''}${number(r[2])}`))];
    const display=values.length===1?`${values[0]} µg/L`:x(lang,'Multiple reported values — see records','存在多个报告值—请查看记录','Varios valores reportados: consulte los registros');
    return `<section class="water-record-chemical"><h4>${name}</h4><div class="water-record-value"><span>${x(lang,'Reported 90th percentile','报告的第90百分位','Percentil 90 reportado')}</span><strong dir="auto">${esc(display)}</strong></div>
      <p class="compact-dates">${x(lang,'Period ending','监测期结束日期','Fin del período')}: <bdi dir="ltr">${esc(latest[0][1])}</bdi>.</p>
      ${latest.some(r=>r[3]==='')?`<p class="compact-caption">${x(lang,'Reported value; the source does not specify a detection symbol.','此为报告值；原始资料未注明检出符号。','Valor reportado; la fuente no especifica un símbolo de detección.')}</p>`:''}
      ${latest.some(r=>r[2]===0)?`<p class="compact-caption">${x(lang,'A reported zero does not mean zero lead or copper at your faucet.','报告值为零不代表您家水龙头的铅或铜含量为零。','Un cero reportado no significa que su grifo no contenga plomo o cobre.')}</p>`:''}
      <details class="compound-results-details"><summary>${x(lang,'Test records','检测记录','Registros de pruebas')}</summary><p>${x(lang,'Up to five recent monitoring periods are shown. Differing reported values are kept separate.','显示最近最多五个监测期。不同报告值分别保留。','Se muestran hasta cinco períodos recientes. Los valores diferentes se mantienen separados.')}</p>
      ${table([x(lang,'Monitoring period','监测期','Período de monitoreo'),x(lang,'90th percentile (µg/L)','第90百分位（µg/L）','Percentil 90 (µg/L)'),x(lang,'Reported symbol','报告符号','Símbolo reportado')],rows.map(r=>[`${r[0]||'—'} – ${r[1]}`,`${r[3]==='<'?'< ':''}${number(r[2])}`,r[3]||x(lang,'Not supplied','未提供','No indicado')]))}</details>${health ? health.render(key,lang) : ''}</section>`;
  }
  function renderSystem(system,mode,lang) {
    const historic=system.active&&system.active!=='A';
    const role=system.wholesale==='Y'?x(lang,'Wholesale supplier — confirm your household provider.','批发供水机构—请确认家庭供水机构。','Proveedor mayorista: confirme el proveedor de su hogar.'):'';
    const facility=system.type&&system.type!=='CWS'?x(lang,'May serve a school or workplace rather than homes.','可能为学校或工作场所供水，而非住宅。','Puede abastecer una escuela o lugar de trabajo en vez de viviendas.'):'';
    return `<article class="detail-box system-summary-card water-system-card compact-system water-record-card"><header class="system-summary-head"><div><span class="system-state-label">${esc(system.state||'US')}</span><h3 dir="auto" data-preserve-language>${esc(system.name)}</h3></div></header>
      ${historic?`<p class="compact-warning">${x(lang,'Not listed as active. Historical records only.','未列为活跃系统，仅为历史记录。','No figura como activo. Solo registros históricos.')}</p>`:''}
      ${role||facility?`<p class="compact-warning">${esc([role,facility].filter(Boolean).join(' '))}</p>`:''}
      ${mode==='lithium'?renderLithium(system,lang):renderLcrChemical(system,'lead',lang)+renderLcrChemical(system,'copper',lang)}
      <p class="compact-limit">${x(lang,'Historical system records, not a test of your home’s water. Ask your provider for recent results.','历史系统记录，并非您家的水质检测。请向供水机构查询最新结果。','Registros históricos del sistema, no una prueba del agua de su hogar. Pida resultados recientes a su proveedor.')}</p>
      <p class="compact-next"><a href="https://www.epa.gov/ccr" target="_blank" rel="noopener noreferrer">${x(lang,'Find your provider’s water-quality report','查找供水机构的水质报告','Buscar el informe de calidad del agua de su proveedor')} →</a></p>
      <details class="compound-results-details"><summary>${x(lang,'Terms and symbols','术语与符号','Términos y símbolos')}</summary><p>${x(lang,'µg/L means micrograms per liter, about parts per billion. “<” means below the reporting limit, not zero. “Not supplied” means the source did not specify a symbol; it is not proof of detection or absence.','µg/L为微克/升，约十亿分之一。“<”表示低于报告限值，并非为零。“未提供”指原始资料未注明符号，不能证明检出或不存在。','µg/L significa microgramos por litro, aproximadamente partes por mil millones. «<» significa por debajo del límite de reporte, no cero. «No indicado» significa que falta el símbolo; no prueba detección ni ausencia.')}</p><p>PWSID: ${esc(system.id)}</p></details>
      <a class="clinic-report-link home-method-link" href="/report/?system=${encodeURIComponent(system.id)}&amp;lang=${lang}" target="_blank" rel="noopener">${x(lang,"Create clinic report","生成就诊报告","Crear informe para consulta")} ↗</a>
      <a class="home-method-link" href="/methodology/?system=${encodeURIComponent(system.id)}&amp;view=${mode}#additional-chemicals">${x(lang,'Methods, calculations & limitations','方法、计算与局限','Métodos, cálculos y limitaciones (en inglés)')} →</a></article>`;
  }
  function render({systems,manifest},mode,lang) {
    const note=mode==='lithium'?x(lang,'Lithium · EPA samples collected in 2023–2025. Individual results, not yearly averages.','锂 · EPA于2023–2025年采集的样本。单次结果，并非年度平均值。','Litio · Muestras de la EPA tomadas en 2023–2025. Resultados individuales, no promedios anuales.'):x(lang,'Lead & copper · Dates below show the actual monitoring period, not the database update.','铅和铜 · 下方日期为实际监测期，并非数据库更新日期。','Plomo y cobre · Las fechas corresponden al período de pruebas, no a la actualización de la base de datos.');
    const definition=mode==='lcr'?`<p class="compact-caption">${x(lang,'The 90th percentile describes the upper end of results from selected taps. It is not a system-wide average or your home’s result.','第90百分位描述所选水龙头样本结果的较高端，并非系统平均值或您家的检测结果。','El percentil 90 describe la parte alta de los resultados de grifos seleccionados. No es un promedio del sistema ni el resultado de su hogar.')}</p>`:'';
    return `<p class="compact-caption">${note}</p>${definition}${systems.length?systems.map(s=>renderSystem(s,mode,lang)).join(''):`<p>${x(lang,'No matching records were found. This does not mean no testing or no contamination. Search by provider name or ask the utility for recent results. Private wells are not included.','未找到匹配记录，并不表示没有检测或没有污染。请按供水机构名称搜索，或向其查询最新结果。不包括私人水井。','No se encontraron registros coincidentes. No significa que no haya pruebas o contaminación. Busque por proveedor o pídale resultados recientes. Los pozos privados no están incluidos.')}</p>${sourceLinks(mode,lang)}`}`;
  }
  function renderSourceRecords(system,mode) {
    if(mode==='lithium')return `<p>Original source: UCMR5_All.txt. Values are reported in µg/L; “&lt;” retains the reporting limit. No annual averaging is applied.</p>${table(['Date','Reported result (µg/L)','Facility / point','Sample ID','Event','Source row'],system.lithium.map(r=>[r[0],`${r[2]==='<'?'< ':''}${number(r[1])}`,`${r[3]} / ${r[4]}`,r[5],r[6],r[7]]))}`;
    return `<p>Original source: SDWA_LCR_SAMPLES.csv. Original mg/L × 1,000 = displayed µg/L. These are reported 90th percentiles; the website does not recalculate them. Source row numbers include the header as row 1.</p>${['lead','copper'].map(key=>`<h4>${key==='lead'?'Lead':'Copper'}</h4>${system[key].length?table(['Monitoring period','Reported 90th percentile (µg/L)','Reported symbol','Sample ID','Result ID (SAR_ID)','Source row'],system[key].map(r=>[`${r[0]||'—'} – ${r[1]}`,`${r[3]==='<'?'< ':''}${number(r[2])}`,r[3]||'Not supplied',r[4],r[5],r[6]])):'<p>No usable dated result in this snapshot.</p>'}`).join('')}`;
  }
  return {bucket, query, search, render, renderSystem, renderSourceRecords, lithiumSummary, latestRecords};
});
