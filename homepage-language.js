/* Spanish UI copy. Numbers, provider names, source IDs and chemical symbols stay unchanged. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.PFASHomeLanguage=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy={
    skipLookup:'Ir a la búsqueda',zipLabel:'Código postal de Estados Unidos',askLabel:'Haga una pregunta sobre PFAS',
    printTitle:'Resultados de PFAS del sistema de agua',printSource:'Muestras de la EPA UCMR 5 (2023–2025)',
    printNote:'Resultados históricos del sistema público de agua. Confirme el proveedor en su factura. Por debajo del límite de reporte no significa cero.',
    printFooter:'Datos finales de UCMR 5 de la EPA, publicados en agosto de 2026. Estos resultados no determinan el cumplimiento actual, las concentraciones en el grifo, la exposición personal ni el riesgo para la salud. Métodos: pfasestimator.org/methodology/',
    navLookup:'Buscar proveedor',navMap:'Mapa',navStates:'Explorar por estado',navMethods:'Métodos y limitaciones',
    releaseBadge:'Resultados de agua potable',currentLanguageLabel:'Idioma actual:',
    heroTitle:'Encuentre PFAS y otras sustancias químicas en su agua',heroSubtitle:'Busque por código postal o proveedor para consultar resultados históricos de agua potable.',
    featuresSummary:'Menciones y recursos',justinCredit:'Justin Ting apoyó la difusión y promoción de PFAS Estimator.',
    featureTribal:'Tribal Climate Health incluye PFAS Estimator en su directorio de recursos. Busque la entrada «PFAS Estimator».',
    featureEwg:'El perfil de Jack Zhang en EWG+HS presenta su trabajo en PFAS Estimator.',
    featureNewsletter:'PFAS Project Lab presentó la herramienta en su boletín de octubre de 2026. Busque «PFAS Estimator Tool».',
    featurePha:'Planetary Health Alliance incluye PFAS Estimator en sus recursos sobre contaminación química.',
    featuresPermalink:'Enlace a esta sección',featureNewTab:' (se abre en otra pestaña)',
    truthNote:'<strong>Confirme su proveedor.</strong> Compare el nombre con su factura de agua. Los pozos privados no están incluidos. <a href="https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state" target="_blank" rel="noopener noreferrer">Orientación para pozos privados →</a>',
    printButton:'Imprimir o guardar estos resultados',chatTitle:'Preguntas sobre PFAS',chatSubtitle:'Ayuda opcional con inteligencia artificial',
    expandChat:'Mostrar la conversación completa',collapseChat:'Contraer la conversación',
    suggestConcern:'¿Qué significan estos resultados?',suggestUtility:'¿Cómo confirmo mi proveedor?',suggestFilter:'¿Dónde se tomaron las muestras?',suggestHealth:'¿Dónde encuentro resultados recientes?',
    askButton:'Preguntar',chatDisclaimer:'La inteligencia artificial puede equivocarse. Verifique sus respuestas con fuentes oficiales. No comparta información personal o médica.',chatLearnMore:'Cómo funciona',
    quickExplanation:'Explicación breve',closeExplanation:'Cerrar',faqMore:'Métodos y limitaciones →',faqCcrLink:'Buscar el informe de calidad del agua →',faqCurrentLink:'Consultar los registros de la EPA →',
    faqResultTitle:'Qué pueden decirle estos resultados',faqResultBody:'Son resultados históricos de su sistema de agua, no una prueba del grifo de su casa. Confirme su proveedor y consulte sus resultados más recientes.',
    faqUtilityTitle:'Cómo confirmar su proveedor',faqUtilityBody:'Compare el nombre completo con su factura de agua. Un código postal puede estar asociado con varios proveedores. Si no coincide, consulte a su empresa de agua o municipio.',
    faqSamplingTitle:'Dónde se tomaron las muestras',faqSamplingBody:'Las muestras de PFAS se tomaron donde el agua tratada entra al sistema de distribución, no en los grifos de las viviendas.',
    faqCurrentTitle:'Dónde encontrar información reciente',faqCurrentBody:'Estos datos de PFAS proceden de la publicación final de UCMR 5 de agosto de 2026. Su proveedor o agencia estatal puede tener pruebas más recientes. Pida el informe anual de calidad del agua y resultados recientes de PFAS.',
    searchCounter:'búsquedas por código postal',loadingRelease:'Cargando datos…',releaseUnavailable:'Datos no disponibles',dataUnavailable:'Datos no disponibles',loadingData:'Cargando…',preparing:'Preparando los registros de agua potable.',findSystems:'Buscar resultados',
    verifiedRelease:'Datos históricos de la EPA',monitoredSystems:'sistemas de agua',zipAssociations:'asociaciones postales',resultsThrough:'Datos finales de agosto de 2026',
    loadFailure:'No se pudieron cargar los datos. Inténtelo de nuevo o consulte los registros de la EPA.',
    invalidZipTitle:'Introduzca un código postal de 5 dígitos',invalidZipContext:'El código postal debe contener exactamente cinco números.',
    noAssociationTitle:zip=>`No encontramos un proveedor para el código postal ${zip}`,
    noAssociationContext:'Puede faltar la asociación postal aunque existan pruebas. No significa que el agua esté libre de PFAS.',
    noAssociationBody:'Busque arriba por el nombre o número de sistema, o pida resultados recientes a su proveedor.',
    openDataFinder:'Consultar los registros de la EPA →',
    associatedTitle:(count,zip)=>`${count} posible${count===1?'':'s'} proveedor${count===1?'':'es'} para el código postal ${zip}`,
    associatedContext:(_count,total)=>total===1?'Confirme que el nombre coincide con su factura de agua.':'Elija el proveedor que aparece en su factura. Los resultados de otro sistema pueden no corresponderle.',
    notReported:'No informado',notAvailable:'No disponible',unnamed:'Sistema de agua sin nombre',noCompleteAverage:'Faltan muestras necesarias',
    completeUnavailable:'No hay suficientes muestras para calcular el promedio',atLeastOne:'Por encima de una referencia de estudio',
    meets:'Por encima de la referencia',detectedDoesNotMeet:'Detectado, por debajo de la referencia',belowReportingLevel:'Por debajo del límite de reporte',doesNotMeet:'Por debajo de la referencia',
    welcome:'Pregunte sobre PFAS, los resultados o dónde encontrar pruebas recientes.',
    contextReadyAbove:'Los resultados aparecen arriba. Puedo explicar los términos o ayudarle a encontrar información reciente.',
    contextReadyBelow:'Los resultados aparecen arriba. Puedo explicar un valor o qué significa un resultado faltante.',
    contextReadyNone:'No encontramos un proveedor por código postal. Pruebe la búsqueda por nombre o consulte su factura.',
    thinking:'Revisando su pregunta…',rateError:'El asistente está ocupado. Inténtelo de nuevo en un minuto; la búsqueda sigue disponible.',
    timeoutError:'El asistente tardó demasiado. Inténtelo de nuevo; los resultados siguen disponibles.',
    unavailableError:'El asistente no está disponible temporalmente. Los resultados no han cambiado.',genericError:'No se pudo responder. Los resultados de la búsqueda no han cambiado.'
  };
  const pairs=[
    ['Skip to ZIP lookup','Ir a la búsqueda'],['ZIP Lookup','Buscar proveedor'],['Map','Mapa'],['Explore by State','Explorar por estado'],['How It Works','Métodos y limitaciones'],
    ['Results','Resultados'],['Lithium','Litio'],['Lead & copper','Plomo y cobre'],['Lead','Plomo'],['Copper','Cobre'],
    ['Map and state summaries show PFAS.','El mapa y los resúmenes por estado muestran PFAS.'],
    ['Find a provider by name or system ID','Buscar por nombre o número de sistema'],['Provider name or system ID (at least 3 characters)','Nombre o número de sistema (al menos 3 caracteres)'],['Search providers','Buscar proveedor'],
    ['Enter at least 3 characters.','Introduzca al menos 3 caracteres.'],['Searching…','Buscando…'],
    ['Up to 20 matches shown. Confirm the provider name before selecting.','Se muestran hasta 20 coincidencias. Confirme el nombre antes de elegir.'],
    ['No matching records in this snapshot. Check with your provider.','No hay registros coincidentes en esta versión. Consulte a su proveedor.'],['Provider search could not load. Please retry.','No se pudo cargar la búsqueda. Inténtelo de nuevo.'],
    ['Search above using the provider name or system ID on your bill. Monitoring records can exist even when the ZIP association is missing.','Busque arriba por el nombre o número de sistema de su factura. Puede haber pruebas aunque falte la asociación postal.'],
    ['Selected directly by water system ID, without a ZIP match. Confirm the provider on your water bill. These historical results do not establish current household tap-water quality.','Seleccionado por número de sistema, sin asociación postal. Confirme el proveedor en su factura. Estos registros no muestran la calidad actual del agua de su hogar.'],
    ['Selected by system ID without a ZIP match. Confirm your provider.','Seleccionado por número de sistema, sin asociación postal. Confirme su proveedor.'],
    ['Reported ZIP associations may be incomplete and do not confirm household service. Match the provider to your water bill.','Las asociaciones postales pueden estar incompletas. Confirme el proveedor en su factura.'],
    ['Provider matches need confirmation','Es necesario confirmar los proveedores'],['Water system not found in this release','Sistema no encontrado en esta versión'],
    ['Provider associations needing confirmation','Asociaciones de proveedores que requieren confirmación'],
    ['The source file also lists these providers, but their connection to this ZIP needs review. This does not mean they have no testing data. Confirm your provider or search EPA records using the system ID.','La fuente también enumera estos proveedores, pero su asociación postal requiere revisión. No significa que no tengan pruebas. Confirme su proveedor o consulte la EPA por número de sistema.'],
    ['Possible upstream wholesale suppliers','Posibles proveedores mayoristas'],
    ["These suppliers sell water to local utilities. This does not confirm who supplies or bills your home. Their results are not included in this ZIP's summary. Confirm the utility on your water bill.",'Estos proveedores venden agua a empresas locales. No confirma quién abastece o factura su hogar. Sus resultados no se incluyen en el resumen postal. Confirme el proveedor en su factura.'],
    ["This district serves some customers directly and sells water to other utilities. A service-area overlap does not confirm that it supplies your home directly. Match the provider on your water bill; upstream-supplier results do not replace your local utility's results.",'Este distrito abastece directamente a algunos clientes y vende agua a otras empresas. La coincidencia geográfica no confirma que abastezca su hogar. Compare el nombre con su factura; los resultados mayoristas no sustituyen los de su proveedor local.'],
    ['Only unresolved provider links were found for this ZIP. They cannot establish local water quality or whether testing occurred.','Solo se encontraron asociaciones sin confirmar. No permiten determinar la calidad del agua ni si se han realizado pruebas.'],
    ['Use a private well? This lookup does not include your well water.','¿Usa un pozo privado? Su agua no está incluida aquí.'],["Find your state's well-testing guidance →",'Orientación estatal para pruebas de pozos →'],
    ['Explore the water-system map →','Explorar el mapa de sistemas de agua →'],
    ['Loading monitoring records…','Cargando registros…'],['These records could not be loaded','No se pudieron cargar los registros'],
    ['A download failure does not mean no testing. Please retry or check the original EPA records.','Una descarga fallida no significa que no haya pruebas. Inténtelo de nuevo o consulte los registros de la EPA.'],
    ['PFAS were found','Se detectaron PFAS'],['Testing data are incomplete','Los datos de pruebas están incompletos'],['No detections in complete samples','Sin detecciones en las muestras completas'],
    ['At least one available yearly average is above a federal comparison level.','Al menos un promedio disponible supera una referencia de estudio.'],
    ['No available yearly average is above the federal comparison levels.','Ningún promedio disponible supera las referencias del estudio.'],
    ['Not enough samples for a yearly comparison.','No hay suficientes muestras para calcular un promedio.'],
    ['The five PFAS shown were not detected in complete samples; this does not mean zero.','Los cinco PFAS mostrados no se detectaron en las muestras completas; no significa que su concentración sea cero.'],
    ["Some locations had PFAS detections but insufficient samples for that chemical's yearly average. Review both the complete annual averages and individual samples.",'Se detectaron PFAS en algunos puntos con muestras incompletas. Consulte también los resultados individuales.'],
    ['Some comparisons are missing or unverified. Missing comparisons cannot be treated as below benchmark.','Faltan algunas comparaciones o no están verificadas. No deben interpretarse como resultados por debajo de la referencia.'],
    ['Above federal comparison level','Por encima de la referencia'],['Mixture index (unitless)','Índice de mezcla (sin unidades)'],
    ['Newest sample is over a year old.','La muestra más reciente tiene más de un año.'],["Historical tests, not today's water.",'Pruebas históricas, no del agua de hoy.'],
    ['Check newer official results →','Consultar resultados oficiales recientes →'],['Methods and limitations','Métodos y limitaciones'],['Data sources and limitations','Fuentes y limitaciones'],
    ['Terms and symbols','Términos y símbolos'],['Samples and test dates','Muestras y fechas de pruebas'],['Provider details and official links','Información del proveedor y enlaces oficiales'],
    ['Individual samples and average calculations','Muestras individuales y cálculos'],['Individual samples','Muestras individuales'],
    ['Open to load detects, nondetects, dates, and the inputs behind each location average.','Abra para ver las muestras y fechas de cada punto de monitoreo.'],
    ['Loading and verifying source samples…','Cargando y verificando muestras…'],['Sample records could not be loaded or verified. Close and reopen to retry. This does not mean no testing.','No se pudieron cargar o verificar las muestras. Cierre y vuelva a abrir para reintentar. No significa que no se hayan realizado pruebas.'],
    ['Download the original EPA records','Descargar los registros originales de la EPA'],['EPA lithium fact sheet','Ficha de la EPA sobre litio'],['EPA explanation','Explicación de la EPA'],
    ['Highest reported individual sample','Muestra individual más alta reportada'],['All reported samples below reporting limits','Todas las muestras por debajo de los límites de reporte'],
    ['Sampled','Fechas de pruebas'],['Highest sample date(s)','Fecha de la muestra más alta'],['Date','Fecha'],['Facility / point','Instalación / punto'],['Sample / event','Muestra / evento'],['Source row','Fila de origen'],
    ['What this lithium result means','Qué significa este resultado de litio'],['Recent monitoring records','Registros de monitoreo'],['Latest reported 90th-percentile result','Resultado reportado del percentil 90'],['Period ending','Fin del período'],
    ['Monitoring period','Período de monitoreo'],['90th percentile (µg/L)','Percentil 90 (µg/L)'],['Reported sign','Símbolo reportado'],['Sample / result ID','Número de muestra / resultado'],['Unspecified','No especificado'],
    ['Multiple reported values — see records','Varios valores reportados: consulte los registros'],['No usable dated percentile record in this snapshot. This does not establish that testing never occurred.','No hay un resultado con fecha disponible aquí. No significa que nunca se haya realizado una prueba.'],
    ['These results are over a year old. Ask your provider for newer information.','Estos resultados tienen más de un año. Pida información reciente a su proveedor.'],['Check with your provider for newer results.','Pida resultados recientes a su proveedor.'],
    ['The reported date is in the future; verify it with the provider.','La fecha reportada es futura; verifíquela con su proveedor.'],
    ['Not listed as active in this snapshot. Historical records only.','No figura como activo en esta versión. Solo se muestran registros históricos.'],
    ['Listed as a wholesale supplier; confirm your retail provider.','Figura como proveedor mayorista; confirme el proveedor de su hogar.'],
    ['Non-community system; may serve a workplace, school, or other facility rather than homes.','Sistema no comunitario: puede abastecer un lugar de trabajo, escuela u otra instalación en vez de viviendas.'],
    ['A reported zero does not establish zero lead or copper at your faucet.','Un cero reportado no significa que el grifo de su hogar no contenga plomo o cobre.'],
    ['The source does not specify an analytical sign for this result. Read it as reported, not as a confirmed detection or proof of absence.','La fuente no especifica el símbolo analítico. Es un valor reportado, no prueba de detección ni de ausencia.'],
    ['About PFAS Estimator','Acerca de PFAS Estimator'],['Read the methods and limitations →','Métodos y limitaciones →'],['View archived data and code →','Datos y código archivados →'],['Contact Jack','Contactar a Jack'],['Archived data and code','Datos y código archivados'],['Official federal monitoring data','Datos oficiales de monitoreo'],['Independent research and education tool','Herramienta independiente de investigación y educación'],
    ['complete set','muestras completas'],['incomplete set','muestras incompletas'],['displayed maximum','máximo mostrado'],['Source type','Tipo de fuente'],['Required events','Eventos requeridos'],['Required-set collection dates','Fechas de las muestras'],['Event','Evento'],['Reported result (ppt)','Resultado reportado (ppt)'],['Input to average (ppt)','Valor para el cálculo (ppt)'],['Sample ID','Número de muestra'],['(calculation only)','(solo para el cálculo)'],
    ['Sample-trace validation and file fingerprints','Validación y huellas digitales de los archivos']
  ];
  const phrases=new Map(pairs);
  function translate(value){
    const raw=String(value??''); const trimmed=raw.trim();
    if(phrases.has(trimmed))return raw.replace(trimmed,phrases.get(trimmed));
    let m;
    if((m=trimmed.match(/^Below ([\d.,]+) ppt$/)))return `Menos de ${m[1]} ppt`;
    if(trimmed==='0.000 (calculated)')return '0.000 (calculado)';
    if((m=trimmed.match(/^(\d+) possible water systems? for ZIP (\d{5})$/)))return `${m[1]} posible${m[1]==='1'?'':'s'} proveedor${m[1]==='1'?'':'es'} para el código postal ${m[2]}`;
    if((m=trimmed.match(/^Individual lithium samples \((\d+)\)$/)))return `Muestras de litio (${m[1]})`;
    return raw;
  }
  function html(markup){return String(markup).replace(/>([^<>]+)</g,(_all,words)=>`>${translate(words)}<`);}
  function dom(scope){
    if(!scope?.ownerDocument?.createTreeWalker)return;
    const walker=scope.ownerDocument.createTreeWalker(scope,4);let node;
    while((node=walker.nextNode())) {
      if(node.parentElement?.closest('script,style,option,.ai-msg,[data-preserve-language]'))continue;
      node.textContent=translate(node.textContent);
    }
  }
  return {copy,translate,html,dom};
});
