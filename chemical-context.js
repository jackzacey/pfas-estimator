/* Shared, source-linked chemical explanations. No measurement or risk calculations. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ChemicalContext=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const copy={
  "en": {
    "labels": [
      "What is it?",
      "What does this mean for me?",
      "Exposure research and next steps",
      "What research says",
      "What you can do",
      "Sources"
    ],
    "lead": [
      "Lead is a toxic metal that can enter drinking water as pipes, solder, and fixtures wear away.",
      "Lead exposure can harm children’s brain development and learning. In adults, it can affect blood pressure and kidneys. Children and pregnancy deserve particular attention.",
      "This is a summary from selected taps, not a test of your home. Lead can vary between homes because plumbing differs. A low system result does not rule out lead at your tap.",
      "Ask your provider about lead service lines and testing your tap. Use cold water for drinking and cooking; boiling does not remove lead. If choosing a filter, verify the exact model’s lead-reduction certification."
    ],
    "copper": [
      "Copper is a metal and an essential nutrient. It can enter drinking water from natural deposits and the corrosion of copper plumbing.",
      "Too much copper can cause nausea, vomiting, diarrhea, and stomach pain. Prolonged high exposure can harm the liver or kidneys. These effects depend on dose and duration.",
      "The reported percentile summarizes selected taps. It is not your home’s concentration or a measure of how much copper you take in. Plumbing can cause levels to differ between homes.",
      "Ask your provider about recent tap monitoring and whether home testing is appropriate. Follow local advice about flushing water that has stood in pipes. Boiling does not remove dissolved metals."
    ],
    "lithium": [
      "Lithium is a naturally occurring metal found in rocks, soils, and some groundwater. It is also used in medicines and industrial products.",
      "Research on long-term exposure at drinking-water levels is limited. Much of the evidence for thyroid and kidney effects comes from higher medication doses; it cannot directly predict risk from this water sample.",
      "This is an individual historical sample, not your personal dose or a yearly average. The 10 µg/L screening reference helps flag results for further review; it is not a safe/unsafe cutoff.",
      "Ask your provider for newer lithium results and local public-health guidance. Bring the dated report to a health professional if you have exposure questions. Do not change prescribed medicine based on a water-system result."
    ],
    "pfas": [
      "PFAS means per- and polyfluoroalkyl substances: a large family of manufactured chemicals used in products that resist water, oil, and heat. Many persist in the environment, and some build up in the body.",
      "Research links exposure to some PFAS with changes in immune response, cholesterol, development, and certain cancers. PFOA and PFOS are better studied than many other PFAS. Effects differ by chemical, exposure level, and duration; a water-system number cannot predict illness.",
      "These historical samples describe a water system, not your tap or personal exposure. A result below the reporting limit is not proof of zero PFAS. A below-benchmark average does not establish safety, and missing comparisons leave uncertainty.",
      "Confirm your provider and ask for recent PFAS results and any treatment changes. If considering a filter, check the exact model’s certified PFAS-reduction claim. You can bring the dated provider report to a health professional to discuss exposure questions."
    ],
    "arsenic": [
      "Arsenic is a naturally occurring element that can enter water from rocks and soil, mining, or industrial activity. These records measure total arsenic, not its separate chemical forms.",
      "Long-term exposure to inorganic arsenic in drinking water can cause skin changes and increase cancer risk, including bladder, lung, and skin cancer. Risk depends on concentration and years of exposure; one historical sample cannot predict illness.",
      "These are historical provider samples, not your tap or personal dose. Total arsenic does not identify how much is inorganic. A below-limit result does not establish zero arsenic or guarantee safety.",
      "Ask your provider for current arsenic results and treatment information. If current testing shows a problem, follow public-health advice on an alternative water supply or a treatment system certified for arsenic reduction. Boiling does not remove arsenic."
    ],
    "nitrate": [
      "Nitrate is a nitrogen compound that can reach water through fertilizer, manure, wastewater, or natural processes. Results here are measured as nitrogen, not as the mass of the entire nitrate ion.",
      "High nitrate exposure can interfere with oxygen transport in infants under six months, especially when contaminated water is used for formula. Some observational studies link long-term drinking-water nitrate exposure with colorectal cancer; findings remain uncertain and do not establish an individual risk from these samples.",
      "These are historical provider samples, not current water advice or a personal exposure estimate. Nitrate and combined nitrate/nitrite are different measurements; only nitrate is shown here.",
      "Ask for recent nitrate results, especially before preparing infant formula. Follow current utility or health-department advice if nitrate is elevated; use an appropriate alternative water supply when advised. Boiling does not remove nitrate and can concentrate it."
    ]
  },
  "zh": {
    "labels": [
      "这是什么？",
      "这对我意味着什么？",
      "暴露研究与下一步",
      "研究发现",
      "您可以做什么",
      "资料来源"
    ],
    "lead": [
      "铅是一种有毒金属。含铅水管、焊料和龙头等部件腐蚀时，铅可能进入饮用水。",
      "铅暴露可能损害儿童的大脑发育和学习能力，也可能影响成人血压和肾脏。儿童及孕期应特别关注。",
      "这是部分水龙头样本的汇总，并非您家的检测结果。各家管道不同，铅含量可能不同。系统报告值低，不代表您家水龙头没有铅。",
      "请向供水机构询问含铅入户管线和家庭水质检测。饮用和做饭用冷水；煮沸不能去除铅。选滤水器时，请核实具体型号的除铅认证。"
    ],
    "copper": [
      "铜是一种金属，也是人体必需的营养元素。天然矿物和铜管腐蚀都可能使铜进入饮用水。",
      "摄入过多铜可能引起恶心、呕吐、腹泻和腹痛。长期高水平暴露可能损害肝脏或肾脏；影响与剂量和持续时间有关。",
      "报告的百分位数汇总部分水龙头的结果，并不是您家的铜浓度或您的摄入量。家庭管道可能使各家浓度不同。",
      "请向供水机构询问最新水龙头监测及是否适合进行家庭检测。管内水停留较久后，请按当地建议放水。煮沸不能去除溶解的金属。"
    ],
    "lithium": [
      "锂是岩石、土壤和部分地下水中天然存在的金属，也用于药物和工业产品。",
      "有关长期接触饮用水中较低浓度锂的研究有限。甲状腺和肾脏影响的证据多来自较高药物剂量，不能直接用来预测这一水样的风险。",
      "这是历史单次样本，并非您的个人摄入量或年度平均值。10 µg/L筛查参考值用于提示进一步评估，不是安全与不安全的分界线。",
      "请向供水机构查询更新的锂检测结果及当地公共卫生建议。如对暴露有疑问，可携带标有日期的报告咨询医疗专业人员。不要根据供水系统结果更改处方药物。"
    ],
    "pfas": [
      "PFAS指全氟和多氟烷基物质，是一大类用于防水、防油和耐热产品的人造化学物质。许多PFAS在环境中长期存在，有些会在体内积累。",
      "研究将某些PFAS暴露与免疫反应、胆固醇、发育方面的变化以及某些癌症联系起来。PFOA和PFOS比许多其他PFAS研究得更多。影响因物质、暴露水平和时间而异，供水系统的数值不能预测疾病。",
      "这些历史样本描述供水系统，并非您家水龙头或个人暴露。低于报告限值不证明PFAS为零。平均值低于基准不代表安全，缺失比较仍有不确定性。",
      "请确认供水机构，查询最新PFAS结果及处理措施变化。若考虑滤水器，请核实具体型号获认证的PFAS去除声明。可携带标有日期的供水报告向医疗专业人员咨询暴露问题。"
    ],
    "arsenic": [
      "砷是天然存在的元素，可从岩石、土壤、采矿或工业活动进入水中。此处记录为总砷，不区分化学形态。",
      "长期饮用含无机砷的水可造成皮肤变化，并增加膀胱癌、肺癌和皮肤癌风险。风险取决于浓度及暴露年限；单次历史样本无法预测疾病。",
      "这些是供水系统历史样本，不是您家水龙头检测或个人剂量。总砷不能确定无机砷含量。低于限值不代表零含量或安全保证。",
      "请向供水机构索取最新砷检测和处理信息。如当前检测有问题，请遵循公共卫生部门关于替代水源或经认证除砷设备的建议。煮沸不能去除砷。"
    ],
    "nitrate": [
      "硝酸盐是含氮化合物，可通过化肥、粪肥、废水或自然过程进入水中。此处按氮计量，而非整个硝酸根的质量。",
      "高硝酸盐暴露可影响六个月以下婴儿的氧输送，尤其是用受污染的水冲配奶粉时。部分观察研究发现长期饮水硝酸盐暴露与结直肠癌有关，但结论仍有不确定性，不能据此估计个人风险。",
      "这些是供水机构历史样本，不是当前饮水建议或个人暴露估计。硝酸盐与硝酸盐加亚硝酸盐是不同指标；此处仅显示硝酸盐。",
      "请索取最新硝酸盐检测，尤其在冲配婴儿奶粉前。如当前结果升高，请遵循供水机构或卫生部门建议，必要时使用适当替代水源。煮沸不能去除硝酸盐，反而可能浓缩。"
    ]
  },
  "es": {
    "labels": [
      "¿Qué es?",
      "¿Qué significa para mí?",
      "Investigación sobre exposición y próximos pasos",
      "Qué dice la investigación",
      "Qué puede hacer",
      "Fuentes"
    ],
    "lead": [
      "El plomo es un metal tóxico que puede pasar al agua cuando se corroen tuberías, soldaduras y accesorios.",
      "La exposición al plomo puede perjudicar el desarrollo cerebral y el aprendizaje infantil. En adultos puede afectar la presión arterial y los riñones. La infancia y el embarazo requieren especial atención.",
      "Es un resumen de grifos seleccionados, no una prueba de su hogar. Las tuberías hacen que el plomo varíe entre viviendas. Un resultado bajo del sistema no descarta plomo en su grifo.",
      "Pregunte al proveedor por las líneas de servicio con plomo y las pruebas de su grifo. Use agua fría para beber y cocinar; hervirla no elimina el plomo. Verifique la certificación de reducción de plomo del modelo exacto de filtro."
    ],
    "copper": [
      "El cobre es un metal y un nutriente esencial. Puede llegar al agua desde depósitos naturales y la corrosión de las tuberías de cobre.",
      "Un exceso puede causar náuseas, vómitos, diarrea y dolor abdominal. Una exposición alta y prolongada puede dañar el hígado o los riñones. Los efectos dependen de la dosis y duración.",
      "El percentil resume grifos seleccionados. No es la concentración de su vivienda ni su ingesta de cobre. Las tuberías pueden producir diferencias entre hogares.",
      "Pregunte por pruebas recientes en grifos y si conviene analizar su agua. Siga las indicaciones locales para dejar correr el agua estancada en tuberías. Hervirla no elimina los metales disueltos."
    ],
    "lithium": [
      "El litio es un metal natural presente en rocas, suelos y algunas aguas subterráneas. También se usa en medicamentos y productos industriales.",
      "La investigación sobre exposición prolongada a niveles del agua potable es limitada. Gran parte de la evidencia sobre tiroides y riñones procede de dosis medicinales más altas y no predice directamente el riesgo de esta muestra.",
      "Es una muestra histórica individual, no su dosis personal ni un promedio anual. La referencia de 10 µg/L orienta una revisión adicional; no separa agua segura de insegura.",
      "Solicite resultados más recientes y orientación de salud pública local. Lleve el informe fechado a un profesional sanitario si tiene dudas. No cambie medicamentos recetados por un resultado del sistema de agua."
    ],
    "pfas": [
      "PFAS significa sustancias perfluoroalquiladas y polifluoroalquiladas: una gran familia de químicos fabricados para productos resistentes al agua, aceite y calor. Muchos persisten en el ambiente y algunos se acumulan en el cuerpo.",
      "La investigación relaciona la exposición a ciertos PFAS con cambios inmunitarios, colesterol, desarrollo y algunos cánceres. PFOA y PFOS están mejor estudiados que muchos otros PFAS. Los efectos dependen de la sustancia, nivel y duración; un número del sistema no predice enfermedad.",
      "Estas muestras históricas describen un sistema, no su grifo ni su exposición personal. Estar por debajo del límite de reporte no prueba ausencia de PFAS. Un promedio bajo la referencia no establece seguridad, y las comparaciones faltantes dejan incertidumbre.",
      "Confirme su proveedor y pida resultados recientes y cambios en el tratamiento. Si considera un filtro, verifique la certificación de reducción de PFAS del modelo exacto. Puede llevar el informe fechado a un profesional sanitario para hablar de sus dudas."
    ],
    "arsenic": [
      "El arsénico es un elemento natural que puede llegar al agua desde rocas, suelos, minería o actividades industriales. Estos registros miden arsénico total, sin distinguir sus formas químicas.",
      "La exposición prolongada al arsénico inorgánico en agua puede causar cambios en la piel y aumentar el riesgo de cáncer de vejiga, pulmón y piel. El riesgo depende de concentración y duración; una muestra histórica no predice enfermedad.",
      "Son muestras históricas del proveedor, no de su grifo ni de su dosis personal. El arsénico total no identifica la fracción inorgánica. Un resultado inferior al límite no demuestra ausencia ni garantiza seguridad.",
      "Pida resultados actuales e información del tratamiento. Si las pruebas actuales indican un problema, siga las recomendaciones sanitarias sobre otra fuente de agua o un tratamiento certificado para reducir arsénico. Hervir no elimina el arsénico."
    ],
    "nitrate": [
      "El nitrato es un compuesto de nitrógeno que llega al agua por fertilizantes, estiércol, aguas residuales o procesos naturales. Los resultados se expresan como nitrógeno, no como el ion nitrato completo.",
      "Una exposición alta puede afectar el transporte de oxígeno en menores de seis meses, especialmente con fórmula preparada con agua contaminada. Algunos estudios observacionales relacionan la exposición prolongada con cáncer colorrectal; persisten incertidumbres y estas muestras no establecen un riesgo individual.",
      "Son muestras históricas, no recomendaciones actuales ni una estimación de exposición personal. Nitrato y nitrato/nitrito combinado son medidas distintas; aquí solo se muestra nitrato.",
      "Pida pruebas recientes, especialmente antes de preparar fórmula infantil. Siga las indicaciones actuales del proveedor o de salud pública si hay niveles elevados; use otra fuente adecuada cuando se recomiende. Hervir no elimina nitrato y puede concentrarlo."
    ]
  },
  "fr": {
    "labels": [
      "De quoi s’agit-il ?",
      "Qu’est-ce que cela signifie pour moi ?",
      "Recherche sur l’exposition et prochaines étapes",
      "Ce que dit la recherche",
      "Ce que vous pouvez faire",
      "Sources"
    ],
    "lead": [
      "Le plomb est un métal toxique pouvant passer dans l’eau lorsque les canalisations, soudures et raccords se corrodent.",
      "L’exposition au plomb peut nuire au développement cérébral et à l’apprentissage des enfants. Chez l’adulte, elle peut affecter la tension artérielle et les reins. Enfants et grossesse demandent une attention particulière.",
      "Ce résumé concerne certains robinets, pas votre logement. Les canalisations peuvent créer des différences entre habitations. Un résultat faible du réseau n’exclut pas du plomb à votre robinet.",
      "Demandez au fournisseur des renseignements sur les branchements en plomb et les analyses à domicile. Utilisez l’eau froide pour boire et cuisiner ; faire bouillir ne retire pas le plomb. Vérifiez la certification antiplomb du modèle exact de filtre."
    ],
    "copper": [
      "Le cuivre est un métal et un nutriment essentiel. Il peut provenir de dépôts naturels ou de la corrosion des canalisations en cuivre.",
      "Un excès peut provoquer nausées, vomissements, diarrhée et douleurs abdominales. Une forte exposition prolongée peut endommager le foie ou les reins. Les effets dépendent de la dose et de la durée.",
      "Le percentile résume certains robinets. Ce n’est ni la concentration chez vous ni votre apport en cuivre. La plomberie peut entraîner des différences entre logements.",
      "Demandez les analyses récentes et si une analyse à domicile serait adaptée. Suivez les conseils locaux pour purger l’eau restée dans les canalisations. Faire bouillir ne retire pas les métaux dissous."
    ],
    "lithium": [
      "Le lithium est un métal naturel présent dans les roches, les sols et certaines eaux souterraines. Il sert aussi dans des médicaments et produits industriels.",
      "Les recherches sur une exposition durable aux niveaux de l’eau potable sont limitées. Les données sur les effets thyroïdiens et rénaux viennent surtout de doses médicamenteuses plus élevées ; elles ne prédisent pas directement le risque de cet échantillon.",
      "Il s’agit d’un échantillon historique individuel, pas de votre dose ni d’une moyenne annuelle. Le repère de 10 µg/L aide à orienter un examen ; ce n’est pas une frontière entre sûr et dangereux.",
      "Demandez des résultats plus récents et les conseils sanitaires locaux. Présentez le rapport daté à un professionnel de santé en cas de questions. Ne modifiez pas un traitement prescrit à partir d’un résultat du réseau."
    ],
    "pfas": [
      "PFAS désigne les substances perfluoroalkylées et polyfluoroalkylées : une grande famille de produits chimiques fabriqués pour résister à l’eau, aux huiles et à la chaleur. Beaucoup persistent dans l’environnement et certains s’accumulent dans l’organisme.",
      "La recherche associe l’exposition à certains PFAS à des effets sur l’immunité, le cholestérol, le développement et certains cancers. Le PFOA et le PFOS sont mieux étudiés que beaucoup d’autres PFAS. Les effets dépendent du composé, du niveau et de la durée ; un résultat du réseau ne prédit pas une maladie.",
      "Ces anciens échantillons décrivent un réseau, pas votre robinet ni votre exposition. Un résultat sous la limite de déclaration ne prouve pas une absence de PFAS. Une moyenne sous le repère ne garantit pas la sécurité ; les comparaisons manquantes laissent une incertitude.",
      "Confirmez le fournisseur et demandez des résultats récents et les changements de traitement. Pour un filtre, vérifiez la réduction des PFAS certifiée du modèle exact. Vous pouvez présenter le rapport daté à un professionnel de santé pour discuter de vos questions."
    ],
    "arsenic": [
      "L’arsenic est un élément naturel provenant des roches, sols, mines ou activités industrielles. Ces données mesurent l’arsenic total sans distinguer ses formes chimiques.",
      "Une exposition prolongée à l’arsenic inorganique dans l’eau peut modifier la peau et augmenter le risque de cancers de la vessie, du poumon et de la peau. Le risque dépend de la concentration et de la durée ; un ancien échantillon ne prédit pas une maladie.",
      "Ces échantillons historiques du fournisseur ne représentent ni votre robinet ni votre dose personnelle. L’arsenic total ne précise pas la fraction inorganique. Un résultat sous la limite ne garantit ni absence ni sécurité.",
      "Demandez des résultats récents et des informations sur le traitement. En cas de problème actuel, suivez les conseils sanitaires pour une autre eau ou un dispositif certifié pour réduire l’arsenic. Faire bouillir ne l’élimine pas."
    ],
    "nitrate": [
      "Le nitrate est un composé azoté provenant des engrais, déjections, eaux usées ou processus naturels. Les valeurs sont exprimées en azote, pas en masse totale de l’ion nitrate.",
      "Une forte exposition peut perturber le transport d’oxygène chez les moins de six mois, notamment avec du lait préparé avec une eau contaminée. Certaines études observationnelles associent l’exposition prolongée au cancer colorectal ; les incertitudes persistent et ces échantillons ne déterminent pas un risque individuel.",
      "Ce sont des échantillons historiques, sans conseil actuel ni estimation d’exposition personnelle. Nitrate et nitrate/nitrite combinés sont distincts ; seul le nitrate est affiché.",
      "Demandez des analyses récentes, surtout avant de préparer du lait infantile. Si les niveaux actuels sont élevés, suivez les conseils du fournisseur ou des autorités sanitaires concernant une autre eau adaptée. L’ébullition n’élimine pas le nitrate et peut le concentrer."
    ]
  },
  "hi": {
    "labels": [
      "यह क्या है?",
      "मेरे लिए इसका क्या मतलब है?",
      "संपर्क पर शोध और अगले कदम",
      "शोध क्या कहता है",
      "आप क्या कर सकते हैं",
      "स्रोत"
    ],
    "lead": [
      "सीसा एक विषैली धातु है। सीसे वाले पाइप, सोल्डर और नलों में जंग लगने पर यह पीने के पानी में आ सकता है।",
      "सीसे का संपर्क बच्चों के मस्तिष्क विकास और सीखने की क्षमता को नुकसान पहुँचा सकता है। वयस्कों में यह रक्तचाप और गुर्दों को प्रभावित कर सकता है। बच्चों और गर्भावस्था में विशेष ध्यान ज़रूरी है।",
      "यह चुने हुए नलों का सार है, आपके घर की जाँच नहीं। अलग पाइपों के कारण घरों में स्तर अलग हो सकते हैं। प्रणाली का कम परिणाम आपके नल में सीसा न होने का प्रमाण नहीं है।",
      "प्रदाता से सीसे वाली सेवा पाइपों और अपने नल की जाँच के बारे में पूछें। पीने और पकाने के लिए ठंडा पानी लें; उबालने से सीसा नहीं निकलता। फ़िल्टर के ठीक उसी मॉडल का सीसा घटाने का प्रमाणन जाँचें।"
    ],
    "copper": [
      "ताँबा एक धातु और आवश्यक पोषक तत्व है। प्राकृतिक खनिजों और ताँबे के पाइपों के क्षरण से यह पानी में आ सकता है।",
      "बहुत अधिक ताँबा मतली, उल्टी, दस्त और पेट दर्द पैदा कर सकता है। लंबे समय तक अधिक संपर्क जिगर या गुर्दों को नुकसान पहुँचा सकता है। प्रभाव मात्रा और अवधि पर निर्भर हैं।",
      "रिपोर्ट किया प्रतिशतक चुने हुए नलों का सार है। यह आपके घर की सांद्रता या आपके सेवन की मात्रा नहीं है। घर की पाइपलाइन से स्तर अलग हो सकते हैं।",
      "हाल की नल-जाँच और घर में जाँच की उपयुक्तता के बारे में प्रदाता से पूछें। पाइपों में रुके पानी को बहाने के लिए स्थानीय सलाह मानें। उबालने से घुली धातुएँ नहीं निकलतीं।"
    ],
    "lithium": [
      "लिथियम चट्टानों, मिट्टी और कुछ भूजल में प्राकृतिक रूप से मिलने वाली धातु है। इसका उपयोग दवाओं और औद्योगिक उत्पादों में भी होता है।",
      "पीने के पानी के स्तरों पर लंबे संपर्क का शोध सीमित है। थायरॉइड और गुर्दों पर प्रभाव के अधिकतर प्रमाण दवाओं की ऊँची खुराक से हैं; उनसे इस नमूने का जोखिम सीधे नहीं बताया जा सकता।",
      "यह एक पुराना व्यक्तिगत नमूना है, आपकी निजी खुराक या वार्षिक औसत नहीं। 10 µg/L संदर्भ आगे समीक्षा में मदद करता है; यह सुरक्षित और असुरक्षित की सीमा नहीं है।",
      "प्रदाता से नई लिथियम जाँच और स्थानीय सार्वजनिक स्वास्थ्य सलाह माँगें। संपर्क के प्रश्न हों तो तारीख वाला रिपोर्ट स्वास्थ्य पेशेवर को दिखाएँ। पानी की प्रणाली के परिणाम के आधार पर लिखी हुई दवा न बदलें।"
    ],
    "pfas": [
      "PFAS का मतलब पर- और पॉलीफ्लुओरोऐल्किल पदार्थ है: पानी, तेल और गर्मी का प्रतिरोध करने वाले उत्पादों में प्रयुक्त मानव-निर्मित रसायनों का बड़ा समूह। कई पर्यावरण में लंबे समय तक रहते हैं और कुछ शरीर में जमा होते हैं।",
      "शोध कुछ PFAS के संपर्क को प्रतिरक्षा, कोलेस्ट्रॉल, विकास और कुछ कैंसर से जोड़ता है। PFOA और PFOS का अध्ययन कई अन्य PFAS से अधिक हुआ है। प्रभाव रसायन, संपर्क की मात्रा और अवधि पर निर्भर हैं; प्रणाली का आँकड़ा बीमारी की भविष्यवाणी नहीं करता।",
      "ये पुराने नमूने जल प्रणाली का वर्णन करते हैं, आपके नल या निजी संपर्क का नहीं। रिपोर्टिंग सीमा से नीचे होना PFAS शून्य होने का प्रमाण नहीं। संदर्भ से कम औसत सुरक्षा साबित नहीं करता; अनुपलब्ध तुलनाओं में अनिश्चितता बनी रहती है।",
      "प्रदाता की पुष्टि करें और हाल के PFAS परिणाम व उपचार में बदलाव पूछें। फ़िल्टर लें तो ठीक उसी मॉडल का PFAS घटाने का प्रमाणित दावा जाँचें। संपर्क संबंधी प्रश्नों के लिए तारीख वाला रिपोर्ट स्वास्थ्य पेशेवर को दिखा सकते हैं।"
    ],
    "arsenic": [
      "आर्सेनिक एक प्राकृतिक तत्व है जो चट्टानों, मिट्टी, खनन या उद्योग से पानी में आ सकता है। ये रिकॉर्ड कुल आर्सेनिक मापते हैं, अलग रासायनिक रूप नहीं।",
      "पानी में अकार्बनिक आर्सेनिक का लंबे समय तक संपर्क त्वचा में बदलाव और मूत्राशय, फेफड़े तथा त्वचा के कैंसर का जोखिम बढ़ा सकता है। जोखिम मात्रा और अवधि पर निर्भर है; एक पुराना नमूना बीमारी की भविष्यवाणी नहीं करता।",
      "ये प्रदाता के पुराने नमूने हैं, आपके नल या व्यक्तिगत खुराक के नहीं। कुल आर्सेनिक से अकार्बनिक भाग पता नहीं चलता। सीमा से नीचे का परिणाम शून्य या सुरक्षा की गारंटी नहीं है।",
      "नए परीक्षण और उपचार की जानकारी माँगें। वर्तमान समस्या होने पर वैकल्पिक पानी या आर्सेनिक घटाने के प्रमाणित उपकरण के बारे में स्वास्थ्य विभाग की सलाह मानें। उबालने से आर्सेनिक नहीं हटता।"
    ],
    "nitrate": [
      "नाइट्रेट नाइट्रोजन का यौगिक है जो खाद, मल, अपशिष्ट जल या प्राकृतिक प्रक्रियाओं से पानी में आता है। परिणाम नाइट्रोजन के रूप में हैं, पूरे नाइट्रेट आयन के भार में नहीं।",
      "अधिक संपर्क छह महीने से छोटे बच्चों में ऑक्सीजन के परिवहन को प्रभावित कर सकता है, खासकर दूषित पानी से फॉर्मूला बनाने पर। कुछ अवलोकन अध्ययन लंबे संपर्क को कोलोरेक्टल कैंसर से जोड़ते हैं; अनिश्चितता बनी हुई है और इन नमूनों से व्यक्तिगत जोखिम तय नहीं होता।",
      "ये ऐतिहासिक नमूने हैं, वर्तमान जल सलाह या व्यक्तिगत संपर्क का अनुमान नहीं। नाइट्रेट और संयुक्त नाइट्रेट/नाइट्राइट अलग हैं; यहाँ केवल नाइट्रेट है।",
      "विशेषकर शिशु फॉर्मूला बनाने से पहले नए परीक्षण माँगें। वर्तमान स्तर बढ़े हों तो प्रदाता या स्वास्थ्य विभाग की सलाह के अनुसार उपयुक्त वैकल्पिक पानी लें। उबालने से नाइट्रेट नहीं हटता और सांद्रता बढ़ सकती है।"
    ]
  },
  "ar": {
    "labels": [
      "ما هذه المادة؟",
      "ماذا يعني ذلك بالنسبة لي؟",
      "أبحاث التعرض والخطوات التالية",
      "ما تقوله الأبحاث",
      "ما يمكنك فعله",
      "المصادر"
    ],
    "lead": [
      "الرصاص معدن سام قد يصل إلى مياه الشرب عند تآكل الأنابيب ومواد اللحام والتجهيزات المحتوية عليه.",
      "قد يضر التعرض للرصاص بنمو دماغ الأطفال وتعلمهم. وقد يؤثر في ضغط الدم والكلى لدى البالغين. تستدعي الطفولة والحمل اهتمامًا خاصًا.",
      "هذا ملخص لصنابير مختارة، وليس فحصًا لمنزلك. تختلف مستويات الرصاص باختلاف السباكة. انخفاض نتيجة النظام لا يستبعد وجود الرصاص في صنبورك.",
      "اسأل المزود عن خطوط الخدمة المحتوية على الرصاص وفحص صنبورك. استخدم الماء البارد للشرب والطهي؛ الغلي لا يزيل الرصاص. تحقق من شهادة خفض الرصاص لطراز المرشح المحدد."
    ],
    "copper": [
      "النحاس معدن وعنصر غذائي أساسي. قد يصل إلى الماء من الرواسب الطبيعية وتآكل الأنابيب النحاسية.",
      "قد تسبب زيادة النحاس الغثيان والقيء والإسهال وألم البطن. وقد يضر التعرض المرتفع المطول بالكبد أو الكلى. تعتمد الآثار على الجرعة والمدة.",
      "يلخص المئين المبلغ عنه صنابير مختارة. وهو لا يمثل تركيز منزلك أو كمية النحاس التي تتناولها. قد تسبب السباكة اختلاف المستويات بين المنازل.",
      "اسأل المزود عن الفحوص الحديثة ومدى ملاءمة فحص منزلك. اتبع الإرشادات المحلية لتصريف الماء الراكد في الأنابيب. الغلي لا يزيل المعادن الذائبة."
    ],
    "lithium": [
      "الليثيوم معدن طبيعي يوجد في الصخور والتربة وبعض المياه الجوفية. ويستخدم أيضًا في الأدوية والمنتجات الصناعية.",
      "الأبحاث عن التعرض الطويل بمستويات مياه الشرب محدودة. تأتي معظم أدلة آثار الغدة الدرقية والكلى من جرعات دوائية أعلى؛ ولا تتنبأ مباشرة بخطر هذه العينة.",
      "هذه عينة تاريخية منفردة، وليست جرعتك الشخصية أو متوسطًا سنويًا. يساعد مرجع 10 µg/L على توجيه المراجعة؛ وليس حدًا يفصل الآمن عن غير الآمن.",
      "اطلب نتائج أحدث وإرشادات الصحة العامة المحلية. اعرض التقرير المؤرخ على مختص صحي إذا كانت لديك أسئلة عن التعرض. لا تغير دواءً موصوفًا بناءً على نتيجة نظام المياه."
    ],
    "pfas": [
      "PFAS هي المواد البيرفلورو ألكيلية والبولي فلورو ألكيلية: عائلة كبيرة من مواد مصنّعة تُستخدم في منتجات مقاومة للماء والزيوت والحرارة. يستمر كثير منها في البيئة وقد يتراكم بعضها في الجسم.",
      "تربط الأبحاث التعرض لبعض PFAS بتغيرات في المناعة والكوليسترول والنمو وبعض السرطانات. دُرس PFOA وPFOS أكثر من كثير من الأنواع الأخرى. تختلف الآثار حسب المادة والمستوى والمدة؛ ولا تتنبأ نتيجة نظام المياه بمرض فردي.",
      "تصف هذه العينات التاريخية نظام المياه، لا صنبورك أو تعرضك الشخصي. النتيجة دون حد الإبلاغ لا تثبت انعدام PFAS. والمتوسط دون المرجع لا يثبت الأمان؛ وتبقى المقارنات المفقودة مصدرًا لعدم اليقين.",
      "أكد مزود المياه واطلب نتائج حديثة وأي تغييرات في المعالجة. عند اختيار مرشح، تحقق من ادعاء خفض PFAS المعتمد للطراز المحدد. يمكنك عرض التقرير المؤرخ على مختص صحي لمناقشة أسئلة التعرض."
    ],
    "arsenic": [
      "الزرنيخ عنصر طبيعي قد يصل إلى الماء من الصخور والتربة والتعدين والصناعة. تقيس هذه السجلات الزرنيخ الكلي ولا تميز أشكاله الكيميائية.",
      "قد يسبب التعرض الطويل للزرنيخ غير العضوي في الماء تغيرات جلدية ويزيد خطر سرطان المثانة والرئة والجلد. يعتمد الخطر على التركيز والمدة؛ ولا تتنبأ عينة تاريخية بمرض.",
      "هذه عينات تاريخية للمزود وليست لصنبورك أو جرعتك الشخصية. لا يحدد الزرنيخ الكلي الجزء غير العضوي. النتيجة دون الحد لا تعني انعدام الزرنيخ أو ضمان السلامة.",
      "اطلب نتائج حديثة ومعلومات المعالجة. إذا أظهرت الفحوص الحالية مشكلة، اتبع إرشادات الصحة بشأن مصدر ماء بديل أو جهاز معتمد لخفض الزرنيخ. الغلي لا يزيل الزرنيخ."
    ],
    "nitrate": [
      "النترات مركب نيتروجيني يصل إلى الماء من الأسمدة والروث والصرف أو العمليات الطبيعية. النتائج محسوبة كنيتروجين وليست كتلة أيون النترات كاملاً.",
      "قد يعيق التعرض المرتفع نقل الأكسجين لدى الرضع دون ستة أشهر، خاصة عند تحضير الحليب بماء ملوث. تربط بعض الدراسات الرصدية التعرض الطويل بسرطان القولون والمستقيم؛ لكن عدم اليقين قائم ولا تحدد هذه العينات خطراً فردياً.",
      "هذه عينات تاريخية وليست نصائح حالية للماء أو تقديراً للتعرض الشخصي. النترات ومجموع النترات والنتريت قياسان مختلفان؛ المعروض هنا النترات فقط.",
      "اطلب نتائج حديثة، خصوصاً قبل تحضير حليب الرضع. عند ارتفاع المستويات الحالية، اتبع نصائح المزود أو الصحة بشأن ماء بديل مناسب. الغلي لا يزيل النترات وقد يزيد تركيزها."
    ]
  },
  "bn": {
    "labels": [
      "এটি কী?",
      "আমার জন্য এর অর্থ কী?",
      "সংস্পর্শ নিয়ে গবেষণা ও পরবর্তী পদক্ষেপ",
      "গবেষণা কী বলে",
      "আপনি কী করতে পারেন",
      "সূত্র"
    ],
    "lead": [
      "সীসা একটি বিষাক্ত ধাতু। সীসাযুক্ত পাইপ, ঝালাই ও কলের যন্ত্রাংশ ক্ষয় হলে তা পানীয় জলে আসতে পারে।",
      "সীসার সংস্পর্শ শিশুদের মস্তিষ্কের বিকাশ ও শেখার ক্ষমতার ক্ষতি করতে পারে। প্রাপ্তবয়স্কদের রক্তচাপ ও কিডনিতে প্রভাব ফেলতে পারে। শিশু ও গর্ভাবস্থায় বিশেষ মনোযোগ দরকার।",
      "এটি কিছু নির্বাচিত কলের সারাংশ, আপনার বাড়ির পরীক্ষা নয়। পাইপ আলাদা হওয়ায় বাড়িভেদে মাত্রা বদলায়। ব্যবস্থার কম ফল আপনার কলে সীসা নেই এমন প্রমাণ নয়।",
      "প্রদানকারীর কাছে সীসাযুক্ত সার্ভিস পাইপ ও নিজের কল পরীক্ষা সম্পর্কে জিজ্ঞাসা করুন। পান ও রান্নায় ঠান্ডা জল ব্যবহার করুন; ফোটালে সীসা দূর হয় না। ফিল্টারের নির্দিষ্ট মডেলের সীসা কমানোর সনদ যাচাই করুন।"
    ],
    "copper": [
      "তামা একটি ধাতু ও অপরিহার্য পুষ্টি উপাদান। প্রাকৃতিক খনিজ ও তামার পাইপের ক্ষয় থেকে এটি জলে আসতে পারে।",
      "অতিরিক্ত তামা বমিভাব, বমি, ডায়রিয়া ও পেটব্যথা ঘটাতে পারে। দীর্ঘদিন বেশি সংস্পর্শে যকৃৎ বা কিডনির ক্ষতি হতে পারে। প্রভাব মাত্রা ও সময়ের ওপর নির্ভর করে।",
      "প্রতিবেদিত পার্সেন্টাইল কিছু নির্বাচিত কলের সারাংশ। এটি আপনার বাড়ির ঘনত্ব বা আপনার গ্রহণের পরিমাণ নয়। বাড়ির পাইপের কারণে মাত্রা আলাদা হতে পারে।",
      "সাম্প্রতিক কলের পরীক্ষা ও বাড়িতে পরীক্ষা উপযুক্ত কি না জিজ্ঞাসা করুন। পাইপে জমে থাকা জল ছাড়ার ক্ষেত্রে স্থানীয় পরামর্শ মানুন। ফোটালে দ্রবীভূত ধাতু দূর হয় না।"
    ],
    "lithium": [
      "লিথিয়াম পাথর, মাটি ও কিছু ভূগর্ভস্থ জলে প্রাকৃতিকভাবে থাকা ধাতু। ওষুধ ও শিল্পপণ্যেও এটি ব্যবহৃত হয়।",
      "পানীয় জলের মাত্রায় দীর্ঘদিন সংস্পর্শের গবেষণা সীমিত। থাইরয়েড ও কিডনির প্রভাবের বেশির ভাগ প্রমাণ ওষুধের বেশি মাত্রা থেকে আসে; তা দিয়ে এই নমুনার ঝুঁকি সরাসরি বলা যায় না।",
      "এটি একটি ঐতিহাসিক পৃথক নমুনা, আপনার ব্যক্তিগত মাত্রা বা বার্ষিক গড় নয়। 10 µg/L নির্দেশক পরবর্তী মূল্যায়নে সাহায্য করে; এটি নিরাপদ ও অনিরাপদের সীমা নয়।",
      "নতুন লিথিয়াম পরীক্ষার ফল ও স্থানীয় জনস্বাস্থ্য পরামর্শ চান। প্রশ্ন থাকলে তারিখসহ রিপোর্ট স্বাস্থ্য পেশাজীবীকে দেখান। জলব্যবস্থার ফলের ভিত্তিতে নির্ধারিত ওষুধ বদলাবেন না।"
    ],
    "pfas": [
      "PFAS অর্থ পার- ও পলিফ্লুরোঅ্যালকাইল পদার্থ: জল, তেল ও তাপ প্রতিরোধী পণ্যে ব্যবহৃত মানবসৃষ্ট রাসায়নিকের বড় পরিবার। অনেকগুলি পরিবেশে দীর্ঘদিন থাকে এবং কিছু শরীরে জমে।",
      "গবেষণায় কিছু PFAS-এর সংস্পর্শের সঙ্গে রোগপ্রতিরোধ, কোলেস্টেরল, বিকাশের পরিবর্তন এবং কিছু ক্যানসারের যোগ পাওয়া গেছে। PFOA ও PFOS অনেক অন্য PFAS-এর চেয়ে বেশি গবেষিত। প্রভাব পদার্থ, মাত্রা ও সময়ভেদে বদলায়; ব্যবস্থার সংখ্যা দিয়ে ব্যক্তির রোগ বলা যায় না।",
      "এই ঐতিহাসিক নমুনা জলব্যবস্থা সম্পর্কে, আপনার কল বা ব্যক্তিগত সংস্পর্শ সম্পর্কে নয়। রিপোর্টিং সীমার নিচে মানে PFAS শূন্য প্রমাণ নয়। নির্দেশকের নিচে গড় নিরাপত্তা প্রমাণ করে না; অনুপস্থিত তুলনায় অনিশ্চয়তা থাকে।",
      "প্রদানকারী নিশ্চিত করে নতুন PFAS ফল ও শোধনের পরিবর্তন জিজ্ঞাসা করুন। ফিল্টার নিলে নির্দিষ্ট মডেলের সনদপ্রাপ্ত PFAS কমানোর দাবি যাচাই করুন। সংস্পর্শের প্রশ্ন নিয়ে তারিখসহ রিপোর্ট স্বাস্থ্য পেশাজীবীকে দেখাতে পারেন।"
    ],
    "arsenic": [
      "আর্সেনিক একটি প্রাকৃতিক মৌল, যা শিলা, মাটি, খনি বা শিল্প থেকে পানিতে আসতে পারে। এখানে মোট আর্সেনিক মাপা হয়েছে, আলাদা রাসায়নিক রূপ নয়।",
      "পানিতে অজৈব আর্সেনিকের দীর্ঘ সংস্পর্শ ত্বকের পরিবর্তন এবং মূত্রাশয়, ফুসফুস ও ত্বকের ক্যানসারের ঝুঁকি বাড়াতে পারে। ঝুঁকি ঘনত্ব ও সময়ের ওপর নির্ভরশীল; একটি পুরোনো নমুনা রোগের পূর্বাভাস নয়।",
      "এগুলো সরবরাহকারীর পুরোনো নমুনা, আপনার কল বা ব্যক্তিগত মাত্রার নয়। মোট আর্সেনিক থেকে অজৈব অংশ জানা যায় না। সীমার নিচে মান শূন্য বা নিরাপত্তার নিশ্চয়তা নয়।",
      "সাম্প্রতিক পরীক্ষা ও শোধনের তথ্য চান। বর্তমান সমস্যা থাকলে বিকল্প পানি বা আর্সেনিক কমানোর প্রত্যয়িত ব্যবস্থা সম্পর্কে স্বাস্থ্য নির্দেশনা মানুন। ফোটালে আর্সেনিক দূর হয় না।"
    ],
    "nitrate": [
      "নাইট্রেট একটি নাইট্রোজেন যৌগ, যা সার, গোবর, বর্জ্যপানি বা প্রাকৃতিক প্রক্রিয়ায় পানিতে আসে। মান নাইট্রোজেন হিসেবে প্রকাশিত, পুরো নাইট্রেট আয়নের ভর হিসেবে নয়।",
      "উচ্চ সংস্পর্শ ছয় মাসের কম শিশুর অক্সিজেন পরিবহন ব্যাহত করতে পারে, বিশেষত দূষিত পানি দিয়ে ফর্মুলা বানালে। কিছু পর্যবেক্ষণমূলক গবেষণা দীর্ঘ সংস্পর্শের সঙ্গে কোলোরেক্টাল ক্যানসারের সম্পর্ক পেয়েছে; অনিশ্চয়তা আছে এবং এসব নমুনা ব্যক্তিগত ঝুঁকি নির্ধারণ করে না।",
      "এগুলো ঐতিহাসিক নমুনা, বর্তমান পানির পরামর্শ বা ব্যক্তিগত সংস্পর্শের অনুমান নয়। নাইট্রেট ও নাইট্রেট/নাইট্রাইটের যোগফল আলাদা; এখানে শুধু নাইট্রেট দেখানো হয়েছে।",
      "বিশেষত শিশুর ফর্মুলা তৈরির আগে সাম্প্রতিক পরীক্ষা চান। বর্তমান মান বেশি হলে সরবরাহকারী বা স্বাস্থ্য বিভাগের পরামর্শে উপযুক্ত বিকল্প পানি ব্যবহার করুন। ফোটালে নাইট্রেট দূর হয় না, ঘনত্ব বাড়তে পারে।"
    ]
  },
  "ru": {
    "labels": [
      "Что это?",
      "Что это значит для меня?",
      "Исследования воздействия и дальнейшие шаги",
      "Что говорят исследования",
      "Что можно сделать",
      "Источники"
    ],
    "lead": [
      "Свинец — токсичный металл, который может попадать в питьевую воду при коррозии труб, припоя и сантехнических деталей.",
      "Воздействие свинца может нарушать развитие мозга и обучение детей. У взрослых оно может влиять на давление и почки. Детство и беременность требуют особого внимания.",
      "Это сводка по выбранным кранам, а не анализ воды у вас дома. Из-за разной сантехники уровни отличаются. Низкий показатель системы не исключает свинец в вашем кране.",
      "Узнайте у поставщика о свинцовых вводных трубах и анализе воды из вашего крана. Для питья и готовки используйте холодную воду; кипячение не удаляет свинец. Проверяйте сертификат удаления свинца для точной модели фильтра."
    ],
    "copper": [
      "Медь — металл и необходимый питательный элемент. Она может попадать в воду из природных отложений и при коррозии медных труб.",
      "Избыток меди может вызвать тошноту, рвоту, диарею и боль в животе. Длительное сильное воздействие может повредить печень или почки. Эффекты зависят от дозы и длительности.",
      "Процентиль обобщает выбранные краны. Это не концентрация у вас дома и не количество потребляемой вами меди. Сантехника может вызывать различия между домами.",
      "Узнайте о свежих анализах и целесообразности проверки вашей воды. Следуйте местным рекомендациям по сливу застоявшейся воды. Кипячение не удаляет растворённые металлы."
    ],
    "lithium": [
      "Литий — природный металл в горных породах, почве и некоторых подземных водах. Его также применяют в лекарствах и промышленных изделиях.",
      "Исследования длительного воздействия на уровнях питьевой воды ограничены. Большинство данных о щитовидной железе и почках получено при более высоких лекарственных дозах; они не предсказывают напрямую риск этой пробы.",
      "Это отдельная историческая проба, а не ваша личная доза или годовое среднее. Ориентир 10 µg/L помогает определить необходимость изучения; это не граница между безопасным и опасным.",
      "Попросите новые результаты и местные рекомендации здравоохранения. При вопросах покажите датированный отчёт медицинскому специалисту. Не меняйте назначенные лекарства по результату системы водоснабжения."
    ],
    "pfas": [
      "PFAS — пер- и полифторалкильные вещества: большая группа искусственных химикатов для изделий, устойчивых к воде, маслам и нагреву. Многие долго сохраняются в среде, а некоторые накапливаются в организме.",
      "Исследования связывают воздействие некоторых PFAS с изменениями иммунитета, холестерина, развития и некоторыми видами рака. PFOA и PFOS изучены лучше многих других PFAS. Эффекты зависят от вещества, уровня и длительности; число для системы не предсказывает заболевание.",
      "Исторические пробы описывают систему, а не ваш кран или личное воздействие. Результат ниже предела отчётности не доказывает отсутствие PFAS. Среднее ниже ориентира не гарантирует безопасность; пропущенные сравнения оставляют неопределённость.",
      "Уточните поставщика, запросите свежие результаты PFAS и сведения об изменениях очистки. Выбирая фильтр, проверяйте сертифицированное снижение PFAS для точной модели. Датированный отчёт можно обсудить с медицинским специалистом."
    ],
    "arsenic": [
      "Мышьяк — природный элемент, попадающий в воду из пород, почвы, горных разработок и промышленности. Здесь измерен общий мышьяк без разделения химических форм.",
      "Длительное воздействие неорганического мышьяка в воде может вызвать изменения кожи и повысить риск рака мочевого пузыря, лёгких и кожи. Риск зависит от концентрации и длительности; старая проба не предсказывает заболевание.",
      "Это исторические пробы поставщика, а не вашего крана или личной дозы. Общий мышьяк не показывает неорганическую долю. Результат ниже предела не доказывает отсутствие или безопасность.",
      "Запросите свежие анализы и сведения об очистке. При текущей проблеме следуйте санитарным рекомендациям об альтернативной воде или сертифицированном удалении мышьяка. Кипячение не удаляет мышьяк."
    ],
    "nitrate": [
      "Нитрат — соединение азота, поступающее из удобрений, навоза, сточных вод или природных процессов. Результаты выражены по азоту, а не по массе всего нитрат-иона.",
      "Высокое воздействие может нарушить перенос кислорода у детей младше шести месяцев, особенно при приготовлении смеси загрязнённой водой. Некоторые наблюдательные исследования связывают длительное воздействие с колоректальным раком; неопределённость сохраняется, и эти пробы не определяют личный риск.",
      "Это исторические пробы, а не текущая рекомендация или оценка личного воздействия. Нитрат и сумма нитрата с нитритом различаются; здесь показан только нитрат.",
      "Запросите свежие анализы, особенно перед приготовлением детской смеси. При повышенных текущих уровнях следуйте советам поставщика и органов здравоохранения об альтернативной воде. Кипячение не удаляет нитрат и может повысить концентрацию."
    ]
  }
};
const sources={arsenic:[['WHO','https://www.who.int/news-room/fact-sheets/detail/arsenic'],['National Cancer Institute','https://www.cancer.gov/about-cancer/causes-prevention/risk/substances/arsenic']],nitrate:[['EPA','https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations'],['Schullehner et al., 2018','https://pubmed.ncbi.nlm.nih.gov/29435982/'],['Erichsen et al., 2025','https://pubmed.ncbi.nlm.nih.gov/40628182/']],pfas:[['EPA','https://www.epa.gov/pfas/our-current-understanding-human-health-and-environmental-risks-pfas'],['ATSDR','https://www.atsdr.cdc.gov/pfas/about/index.html']],lead:[['EPA','https://www.epa.gov/ground-water-and-drinking-water/basic-information-about-lead-drinking-water'],['CDC','https://www.cdc.gov/lead-prevention/prevention/drinking-water.html']],copper:[['ATSDR','https://www.atsdr.cdc.gov/toxprofiles/tp132-c1.pdf'],['Health Canada','https://www.canada.ca/en/health-canada/services/publications/healthy-living/water-talk-copper.html']],lithium:[['EPA','https://www.epa.gov/system/files/documents/2023-11/ucmr5-technical-fact-sheet-lithium-in-drinking-water.pdf']]};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(key,lang='en',{report=false,available=true}={}){
 if(!sources[key])return '';
 const text=copy[lang]||copy.en,labels=text.labels,values=text[key];
 const body=`<h5>${esc(labels[3])}</h5><p>${esc(values[1])}</p><h5>${esc(labels[4])}</h5><p>${esc(values[3])}</p><p class="chemical-sources">${esc(labels[5])}: ${sources[key].map(([name,url])=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${name} ↗</a>`).join(' · ')}</p>`;
 return `<section class="chemical-context" data-chemical-context="${key}"><h4>${esc(labels[0])}</h4><p>${esc(values[0])}</p>${available?`<h4>${esc(labels[1])}</h4><p>${esc(values[2])}</p>`:''}${report?body:`<details class="compound-results-details"><summary>${esc(labels[2])}</summary><div class="chemical-context-detail">${body}</div></details>`}</section>`;
}
return {copy,sources,render};
});
