/* A provider-specific, printable summary. No patient data or new risk score. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.PFASClinicReport=api;api.start();}
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const health=typeof ChemicalContext!=='undefined'?ChemicalContext:typeof module==='object'&&module.exports&&typeof require==='function'?require('./chemical-context'):null;
  const BASE='/analysis/exports/ucmr5_final_aug2026_v1/';
  const LOOKUP_SHA='d550e4671692540111f41da3f050ca866b9b4a7a5e8afac5f424ee36c29ef314';
  const KEYS=['pfoa','pfos','pfhxs','pfna','hfpo_da','hi'];
  const LABELS=['PFOA','PFOS','PFHxS','PFNA','HFPO-DA'];
  const LIMITS=[4,4,3,4,5];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const x=(lang,en,zh,es)=>lang==='zh'?zh:lang==='es'?es:typeof SiteLanguages!=='undefined'?SiteLanguages.translate(en,lang):en;
  const number=(v,digits=2)=>Number(v).toLocaleString('en-US',{maximumFractionDigits:digits});
  const language=v=>['en','zh','es','hi','ar','fr','bn','ru'].includes(v)?v:'en';
  const validId=v=>typeof v==='string'&&/^[A-Z0-9]{1,20}$/.test(v);
  function providerUrl(id,lang='en',view='pfas'){
    if(!validId(id))throw new Error('Invalid water-system ID');
    const params=new URLSearchParams({system:id,lang:language(lang)});
    if(['lithium','lcr','arsenic','nitrate'].includes(view))params.set('view',view);
    return 'https://pfasestimator.org/?'+params+'#result';
  }
  function table(headers,rows){return `<table class="report-table"><thead><tr>${headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(cell=>`<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}
  async function pfasRecord(id){
    const response=await fetch(BASE+'website_lookup_compact.json');
    if(!response.ok)throw new Error('PFAS records unavailable');
    const raw=await response.text();
    const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(raw));
    if(Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('')!==LOOKUP_SHA)throw new Error('PFAS checksum mismatch');
    const data=JSON.parse(raw);
    const row=data.systems.find(r=>r[0]===id);
    if(!row)return null;
    const system=Object.fromEntries(data.columns.map((k,i)=>[k,row[i]]));
    const locations=await PFASSampleTrace.query(system);
    return {system,locations};
  }
  async function load(id){
    if(!validId(id))throw new Error('Invalid water-system ID');
    const settled=await Promise.allSettled([pfasRecord(id),DrinkingWaterRecords.query({id,mode:'lithium'}),DrinkingWaterRecords.query({id,mode:'lcr'}),DrinkingWaterRecords.query({id,mode:'arsenic'}),DrinkingWaterRecords.query({id,mode:'nitrate'})]);
    const [pfas,li,lcr,arsenic,nitrate]=settled.map(r=>r.status==='fulfilled'?r.value:null);
    const supplemental=li?.systems[0]||lcr?.systems[0]||arsenic?.systems[0]||nitrate?.systems[0]||null;
    const system=pfas?.system;
    return {id,name:system?.ucmr_pws_name||supplemental?.name||'',state:system?.sdwis_state_code||supplemental?.state||'',pfas,
      arsenic:arsenic?.systems[0]||null,nitrate:nitrate?.systems[0]||null,lithium:li?.systems[0]||null,lcr:lcr?.systems[0]||null,metadata:supplemental||null,
      failed:settled.map(r=>r.status==='rejected'),snapshot:lcr?.manifest?.sdwis_snapshot||li?.manifest?.sdwis_snapshot||''};
  }
  function pfasSection(data,lang){
    const title='PFAS';
    if(!data.pfas)return emptySection(title,lang,data.failed[0]);
    const {system,locations}=data.pfas;
    const dates=locations.flatMap(l=>l.samples.map(s=>s[1])).sort();
    const rows=KEYS.map((key,i)=>{
      const full=Number(system[key+'_system_full_set'])===1;
      const value=system[key+'_max_location_average'];
      let display=!full||value===null?x(lang,'No complete average','无完整平均值','Sin promedio completo'):
        i===5?number(value,3)+(value===0?x(lang,' (calculated)','（计算值）',' (calculado)'):''):
        value===0?x(lang,`Below ${LIMITS[i]} ppt`,`低于 ${LIMITS[i]} ppt`,`Menos de ${LIMITS[i]} ppt`):number(value*1000)+' ppt';
      const incomplete=i<5?locations.flatMap(l=>l.samples.filter(s=>s[0]===i&&s[3]==='='&&l.outcomes[i][1]!==1)):[];
      const note=incomplete.length?`<small>${esc(x(lang,'Incomplete-set detection up to','不完整样本组的检出值最高为','Detección en muestras incompletas de hasta'))} ${number(Math.max(...incomplete.map(s=>s[4])))} ppt</small>`:'';
      return [esc(i===5?x(lang,'Mixture index','混合物指数','Índice de mezcla'):LABELS[i]),`<strong dir="auto">${esc(display)}</strong>${note}`];
    });
    return `<section class="report-section"><h3>${title}</h3><p>${esc(x(lang,'Per- and polyfluoroalkyl substances. Highest available location averages from a required monitoring set; chemicals may have different locations.','全氟和多氟烷基物质。各物质必需监测组的可用采样点平均值中的最高值；不同物质可能来自不同采样点。','Sustancias perfluoroalquiladas y polifluoroalquiladas. Promedios disponibles más altos de los puntos de muestreo; las sustancias pueden corresponder a puntos distintos.'))}</p>
      <p>${esc(x(lang,'Sample dates','采样日期','Fechas de muestras'))}: <bdi dir="ltr">${esc(dates[0]||'—')} – ${esc(dates.at(-1)||'—')}</bdi></p>
      ${table([x(lang,'Chemical / measure','物质／指标','Sustancia / medida'),x(lang,'Result','结果','Resultado')],rows)}
      <p>${esc(x(lang,'ppt = parts per trillion. “Below” means below a reporting limit, not zero. Missing averages do not mean no PFAS. The mixture index has no units and is not a personal health score.','ppt为万亿分之一。“低于”指低于报告限值，并非为零。平均值缺失不代表无PFAS。混合物指数无单位，也不是个人健康评分。','ppt = partes por billón (10¹²). «Menos de» indica un límite de reporte, no cero. La falta de un promedio no significa ausencia de PFAS. El índice de mezcla no tiene unidades y no es una puntuación de salud personal.'))}</p>${health ? health.render('pfas',lang,{report:true}) : ''}</section>`;
  }
  function emptySection(title,lang,failed){return `<section class="report-section"><h3>${esc(title)}</h3><p>${esc(failed?
    x(lang,'Records could not be loaded or verified. Reload to retry.','记录无法加载或核实，请重新加载。','No se pudieron cargar o verificar los registros. Vuelva a cargar la página.'):
    x(lang,'No matching usable records in this dataset. This does not mean no testing or no contamination.','本数据集中无匹配的可用记录，不代表没有检测或污染。','No hay registros utilizables coincidentes en este conjunto de datos. No significa que no haya pruebas o contaminación.'))}</p></section>`;}
  function lithiumSection(data,lang){
    const title=x(lang,'Lithium','锂','Litio');
    if(!data.lithium)return emptySection(title,lang,data.failed[1]);
    const rows=data.lithium.lithium,summary=DrinkingWaterRecords.lithiumSummary(rows),dates=rows.map(r=>r[0]).sort();
    const value=summary.value===null?x(lang,'Below varying reporting limits','低于不同报告限值','Por debajo de límites de reporte distintos'):
      summary.detected?number(summary.value,8)+' µg/L':lang==='zh'?'低于 '+number(summary.value,8)+' µg/L':lang==='es'?'Menos de '+number(summary.value,8)+' µg/L':typeof SiteLanguages!=='undefined'?SiteLanguages.translate('Below '+number(summary.value,8)+' µg/L',lang):'Below '+number(summary.value,8)+' µg/L';
    return `<section class="report-section"><h3>${title}</h3>${table([x(lang,'Measure','指标','Medida'),x(lang,'Result','结果','Resultado'),x(lang,'Sample dates','采样日期','Fechas de muestras')],[[
      esc(summary.detected?x(lang,'Highest individual sample','最高单次样本','Muestra individual más alta'):x(lang,'All samples below reporting limits','所有样本低于报告限值','Todas las muestras por debajo del límite de reporte')),
      `<strong dir="auto">${esc(value)}</strong>`,`<bdi dir="ltr">${esc(dates[0]+' – '+dates.at(-1))}</bdi>`]])}
      <p>${esc(x(lang,'Individual samples, not yearly averages. µg/L = micrograms per liter (about parts per billion).','单次样本，并非年度平均值。µg/L为微克/升（约十亿分之一）。','Muestras individuales, no promedios anuales. µg/L = microgramos por litro (aproximadamente partes por mil millones).'))}</p>${health ? health.render('lithium',lang,{report:true}) : ''}</section>`;
  }
  function lcrSection(data,lang){
    const title=x(lang,'Lead & copper','铅和铜','Plomo y cobre');
    if(!data.lcr)return emptySection(title,lang,data.failed[2]);
    const rows=['lead','copper'].map(key=>{
      const name=key==='lead'?x(lang,'Lead','铅','Plomo'):x(lang,'Copper','铜','Cobre');
      const latest=DrinkingWaterRecords.latestRecords(data.lcr[key]);
      if(!latest.length)return [name,esc(x(lang,'Not available','不可用','No disponible')),'—'];
      const unique=[...new Set(latest.map(r=>(r[3]==='<'?'< ':'')+number(r[2],8)))];
      const value=unique.length===1?unique[0]+' µg/L':unique.map(v=>v+' µg/L').join('; ');
      const note=latest.some(r=>!r[3])?x(lang,'Source does not specify a detection symbol.','原始资料未注明检出符号。','La fuente no especifica un símbolo de detección.'):'';
      const zero=latest.some(r=>r[2]===0)?x(lang,'A reported zero does not mean zero at your faucet.','报告值为零不代表您家水龙头的值为零。','Un cero reportado no significa cero en su grifo.'):'';
      return [name,`<strong dir="auto">${esc(value)}</strong>${note||zero?`<small>${esc([note,zero].filter(Boolean).join(' '))}</small>`:''}`,`<bdi dir="ltr">${esc(latest.map(r=>(r[0]||'—')+' – '+r[1]).filter((v,i,a)=>a.indexOf(v)===i).join('; '))}</bdi>`];
    });
    return `<section class="report-section"><h3>${title}</h3><p>${esc(x(lang,'Latest reported 90th percentiles: the upper end of results from selected taps, not a system average or your home’s result. Dates may differ by chemical.','最新报告的第90百分位：所选水龙头样本结果的较高端，并非系统平均值或您家的结果。不同物质的日期可能不同。','Últimos percentiles 90 reportados: la parte alta de resultados de grifos seleccionados, no un promedio del sistema ni el resultado de su hogar. Las fechas pueden variar según la sustancia.'))}</p>
      ${table([x(lang,'Chemical','物质','Sustancia'),x(lang,'Reported result','报告结果','Resultado reportado'),x(lang,'Monitoring period','监测期','Período de pruebas')],rows)}
      <p>${esc(x(lang,'Values in µg/L. “<” means below the reporting limit, not zero. Ask the provider for newer records.','单位为µg/L。“<”表示低于报告限值，并非为零。请向供水机构查询更新记录。','Valores en µg/L. «<» significa por debajo del límite de reporte, no cero. Pida registros más recientes al proveedor.'))}</p>${health ? ['lead','copper'].map(key=>health.render(key,lang,{report:true,available:!!data.lcr[key]?.length})).join('') : ''}</section>`;
  }
  function qrSvg(url){
    const qr=qrcodegen.QrCode.encodeText(url,qrcodegen.QrCode.Ecc.MEDIUM),border=4,size=qr.size+border*2;
    let path='';for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))path+=`M${x+border},${y+border}h1v1h-1z `;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img" aria-label="QR" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;
  }
  function render(data,lang='en',now=new Date()){
    if(!data.name)throw new Error('No provider records');
    lang=language(lang);
    const url=providerUrl(data.id,lang,data.pfas?'pfas':data.lithium?'lithium':data.lcr?'lcr':data.arsenic?'arsenic':'nitrate');
    const metadata=data.metadata;
    const warnings=[metadata?.active&&metadata.active!=='A'?x(lang,'Not listed as active; historical records only.','未列为活跃系统，仅为历史记录。','No figura como activo; solo registros históricos.'):null,
      metadata?.wholesale==='Y'?x(lang,'Wholesale supplier: confirm your household provider.','批发供水机构：请确认家庭供水机构。','Proveedor mayorista: confirme el proveedor de su hogar.'):null,
      metadata?.type&&metadata.type!=='CWS'?x(lang,'May serve a school or workplace rather than homes.','可能为学校或工作场所供水，而非住宅。','Puede abastecer una escuela o lugar de trabajo en vez de viviendas.'):null].filter(Boolean);
    const date=now.toLocaleDateString(typeof SiteLanguages!=='undefined'?SiteLanguages.locale(lang):lang==='zh'?'zh-CN':lang==='es'?'es-US':'en-US',{year:'numeric',month:'short',day:'numeric'});
    return `<header><p class="report-brand">PFAS Estimator · pfasestimator.org</p><h1>${x(lang,'Water-system report','供水系统报告','Informe del sistema de agua')}</h1><p class="report-purpose">${x(lang,'A summary to share at a clinic visit','可在就诊时分享的摘要','Un resumen para compartir en una consulta')}</p></header>
      <section class="report-provider"><h2 dir="auto" data-preserve-language>${esc(data.name)}</h2><p class="report-meta"><bdi dir="ltr">${esc(data.state)}</bdi> · ${x(lang,'Water system ID','供水系统编号','Número del sistema')}: <bdi dir="ltr">${esc(data.id)}</bdi> · ${x(lang,'Prepared','生成日期','Preparado')}: ${esc(date)}</p>
      <p class="report-caution">${x(lang,'Confirm this provider on your water bill. Historical system records do not establish current tap-water quality, personal exposure, health risk or regulatory compliance.','请核对水费账单上的供水机构。历史系统记录不能确定当前家庭自来水水质、个人暴露、健康风险或是否符合法规。','Confirme el proveedor en su factura de agua. Los registros históricos del sistema no determinan la calidad actual del agua de su hogar, la exposición personal, el riesgo para la salud ni el cumplimiento normativo.')}</p>
      ${warnings.length?`<p class="report-caution">${esc(warnings.join(' '))}</p>`:''}</section>
      ${pfasSection(data,lang)}${lithiumSection(data,lang)}${lcrSection(data,lang)}${typeof SYR4Records!=='undefined'?['arsenic','nitrate'].map((key,i)=>data[key]?`<section class="report-section">${SYR4Records.section(data[key],key,lang,true)}</section>`:data.failed[3+i]?`<section class="report-section"><h3>${key}</h3><p>Historical records could not load. Retry before sharing this report.</p></section>`:'').join(''):''}
      <footer class="report-foot"><div><h3>${x(lang,'Questions to take with you','可询问的问题','Preguntas para llevar')}</h3><ul><li>${x(lang,'Ask your provider: Are there newer results for this system?','询问供水机构：本系统是否有更新的结果？','Pregunte al proveedor: ¿Hay resultados más recientes de este sistema?')}</li><li>${x(lang,'Ask your clinician: What information about my water source would help our discussion?','询问临床医护人员：关于我的水源，哪些信息有助于我们的讨论？','Pregunte al profesional de salud: ¿Qué información sobre mi fuente de agua ayudaría en nuestra conversación?')}</li></ul>
      <p><a href="${esc(url)}">${x(lang,'Open provider results','打开供水机构结果','Abrir resultados del proveedor')}</a> · <a href="https://pfasestimator.org/methodology/?system=${encodeURIComponent(data.id)}#website">${x(lang,'Methods & sources','方法与来源','Métodos y fuentes (en inglés)')}</a></p>
      <span class="report-link-text">${esc(url)}</span></div><div class="report-qr">${qrSvg(url)}<p>${x(lang,'Scan for this provider’s results','扫码查看本供水机构的结果','Escanee para ver los resultados de este proveedor')}</p></div></footer>
      <p class="report-source">${data.arsenic||data.nitrate?'Arsenic/nitrate: EPA Six-Year Review 4, samples collected 2012–2019; latest available sampled year, not current measurements. ':''}${x(lang,'Sources: U.S. Environmental Protection Agency (EPA), UCMR 5 final August 2026 dataset; lead/copper records from the SDWIS','来源：美国环境保护署（EPA）的UCMR 5最终数据集（2026年8月）；铅和铜记录来自SDWIS','Fuentes: Agencia de Protección Ambiental de Estados Unidos (EPA), conjunto final UCMR 5 de agosto de 2026; registros de plomo/cobre de SDWIS')} ${esc(data.snapshot||'2026Q3')} ${x(lang,'snapshot. Sampling dates above are different from the database release date. This educational report is generated from existing records; it is not a laboratory or clinical test.','快照。上方采样日期与数据库发布日期不同。此教育报告由已有记录生成，并非实验室或临床检测。','(instantánea). Las fechas de muestreo difieren de la fecha de publicación. Este informe educativo se genera con registros existentes; no es una prueba de laboratorio ni clínica.')}</p>`;
  }
  function intro(lang){return `<div class="report-intro"><p class="report-brand">PFAS Estimator</p><h1>${x(lang,'Bring your water results to a clinic visit','就诊时带上供水检测结果','Lleve sus resultados de agua a una consulta')}</h1><p>${x(lang,'Create a printable summary for one public water provider, with available PFAS, lithium, lead and copper results, sampling dates, and a QR code back to the provider.','为一家公共供水机构生成可打印摘要，包含可用的PFAS、锂、铅和铜结果、采样日期，以及返回供水机构结果的二维码。','Cree un resumen imprimible de un proveedor público de agua, con los resultados disponibles de PFAS, litio, plomo y cobre, fechas de muestras y un código QR para volver a los resultados.')}</p><ol><li>${x(lang,'Search by ZIP code or provider name.','按邮政编码或供水机构名称搜索。','Busque por código postal o nombre del proveedor.')}</li><li>${x(lang,'Match the provider to your water bill.','核对水费账单上的供水机构。','Compare el proveedor con su factura de agua.')}</li><li>${x(lang,'Select “Create clinic report” under that provider, then print or save as PDF.','在该供水机构下选择“生成就诊报告”，然后打印或保存为PDF。','Seleccione «Crear informe para consulta» debajo del proveedor; luego imprima o guarde como PDF.')}</li></ol><a class="report-start" href="/?lang=${lang}">${x(lang,'Find your provider →','查找供水机构 →','Buscar su proveedor →')}</a><p class="report-caution">${x(lang,'Private wells are not included. No patient information is needed or collected for this report.','不包括私人水井。此报告无需也不收集患者信息。','No se incluyen pozos privados. Este informe no solicita ni recopila información de pacientes.')}</p></div>`;}
  async function start(){
    const params=new URLSearchParams(location.search),id=(params.get('system')||'').trim().toUpperCase();
    let lang=typeof SiteLanguages!=='undefined'?SiteLanguages.initialLanguage(location.search):language(params.get('lang')),generation=0,data=null,menu=null;
    const el=id=>document.getElementById(id);
    const updateLabels=()=>{
      document.documentElement.lang=lang==='zh'?'zh-Hans':lang;
      document.documentElement.dir=lang==='ar'?'rtl':'ltr';
      menu?.set(lang);
      el('reportBack').textContent=x(lang,'← Back to lookup','← 返回查询','← Volver a la búsqueda');
      el('reportBack').href=data?.name?providerUrl(id,lang,data.pfas?'pfas':data.lithium?'lithium':data.lcr?'lcr':data.arsenic?'arsenic':'nitrate'):'/?lang='+lang;
      el('reportPrint').textContent=x(lang,'Print / save PDF','打印／保存PDF','Imprimir / guardar PDF');
      document.title=x(lang,'Clinic report','就诊报告','Informe para consulta')+' | PFAS Estimator';
    };
    const show=()=>{
      updateLabels();
      if(!id){el('clinicReport').innerHTML=intro(lang);el('clinicReport').hidden=false;el('reportStatus').textContent='';el('reportPrint').hidden=true;return;}
      if(data?.name){
        el('clinicReport').innerHTML=render(data,lang);el('clinicReport').hidden=false;el('reportPrint').disabled=false;
        document.title=data.name+' — '+x(lang,'water-system report','供水系统报告','informe del sistema de agua');
        el('reportStatus').textContent=data.failed.some(Boolean)?x(lang,'Some records could not be verified; those sections are marked in the report.','部分记录无法核实，报告中已注明。','No se pudieron verificar algunos registros; esas secciones están indicadas en el informe.'):x(lang,'Use Print / save PDF, then select “Save as PDF” in your browser.','选择“打印／保存PDF”，然后在浏览器中选择“保存为PDF”。','Use Imprimir / guardar PDF y seleccione «Guardar como PDF» en su navegador.');
      }
    };
    if(typeof SiteLanguageMenu!=='undefined')menu=SiteLanguageMenu.mount(el('reportLanguageMenu'),lang,selected=>{lang=language(selected);if(typeof SiteLanguages!=='undefined')SiteLanguages.remember(lang);const p=new URLSearchParams(location.search);p.set('lang',lang);history.replaceState(null,'',location.pathname+'?'+p);if(data||!id)show();else updateLabels();});
    el('reportPrint').addEventListener('click',()=>{if(data?.name)window.print();});
    updateLabels();if(!id){show();return;}
    if(!validId(id)){el('reportStatus').textContent=x(lang,'The water-system ID is invalid. Return to lookup to select a provider.','供水系统编号无效。请返回查询选择供水机构。','El número del sistema no es válido. Vuelva a la búsqueda para elegir un proveedor.');return;}
    const token=++generation;
    el('reportStatus').textContent=x(lang,'Loading and verifying this provider’s records…','正在加载并核实供水机构记录…','Cargando y verificando los registros de este proveedor…');
    try{data=await load(id);if(token!==generation)return;if(!data.name)throw new Error('No provider records');show();}
    catch(error){el('reportStatus').textContent=x(lang,'A report could not be prepared. Confirm the system ID in the lookup, or reload to retry. Missing records do not establish water quality.','无法生成报告。请在查询中核对系统编号，或重新加载。记录缺失不能确定水质。','No se pudo preparar el informe. Confirme el número del sistema o vuelva a cargar la página. La falta de registros no determina la calidad del agua.');}
  }
  return {validId,providerUrl,pfasRecord,load,pfasSection,lithiumSection,lcrSection,render,qrSvg,intro,start};
});
