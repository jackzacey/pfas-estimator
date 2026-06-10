const SCIENCE = {
  "PFOA": {
    full: "Perfluorooctanoic acid",
    thyroid: "PFOA is a 'forever chemical' once used in nonstick cookware and waterproof materials. It enters drinking water through industrial waste and runoff. PFOA interferes with thyroid function by reducing iodine uptake in the thyroid gland — iodine is essential for producing hormones T3 and T4. During pregnancy, this matters because the fetus depends entirely on the mother's thyroid hormones for early brain development, particularly in the first trimester.",
    health_effects: "PFOA is classified Group 1 carcinogenic to humans by IARC (2024), with strongest evidence for testicular and kidney cancer. Other well-established effects include elevated cholesterol (LDL), elevated liver enzymes (ALT odds approximately 17% higher in exposed individuals), reduced vaccine antibody response in children, and lower birth weight. During pregnancy, associations with pre-eclampsia and thyroid disruption have been reported. Most effects at general population levels are subclinical — detectable in studies but not as individual symptoms.",
    clinical_threshold: "EPA limit: 4 ppt (0.004 µg/L). Health effects have been observed in human studies at serum levels as low as 1.1–5.2 ng/mL. The U.S. general population median serum level is 1.42 ng/mL (declining since production phaseout).",
    actionable: "Use an NSF/ANSI 58-certified water filter (reverse osmosis or activated carbon block) — these are specifically tested to remove PFAS. If pregnant or planning pregnancy, discuss with your OB-GYN. A clinician can order a serum PFAS panel through commercial labs. Monitor cholesterol and liver enzymes (ALT) at routine checkups if you have long-term exposure.",
    evidence_note: null,
    epa_limit: 0.004,
    refs: [
      { label: "IARC Monographs Vol. 135 — PFOA Group 1 classification (Lancet Oncol. 2024)", url: "https://pubmed.ncbi.nlm.nih.gov/38065580/" },
      { label: "PFOA and liver enzyme (ALT) elevation — meta-analysis (PMC9517074)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC9517074/" },
      { label: "PFOA/PFOS and reduced vaccine antibody response in children — Grandjean et al. (JAMA 2012)", url: "https://pubmed.ncbi.nlm.nih.gov/22274686/" },
      { label: "EPA PFOA Human Health Toxicity Assessment (2024)", url: "https://www.epa.gov/system/files/documents/2024-05/final-human-health-toxicity-assessment-pfoa.pdf" }
    ]
  },
  "PFOS": {
    full: "Perfluorooctane sulfonic acid",
    thyroid: "PFOS was widely used in nonstick cookware, stain-resistant fabrics, and firefighting foam. It interferes with thyroid hormone transport by binding to thyroxine-binding globulin (TBG), the protein that carries thyroid hormones through the bloodstream. When this transport is disrupted, less hormone may reach developing fetal tissue.",
    health_effects: "PFOS is classified IARC Group 2B (possibly carcinogenic), with associations for liver cancer, testicular cancer, and breast cancer reported in human studies. The most consistently replicated finding is elevated total and HDL cholesterol. Immune suppression — specifically reduced vaccine antibody response in children — is the critical endpoint used by EPA for regulatory limits. Decreased birth weight in offspring of exposed mothers is well-supported. PFOS has a biological half-life of approximately 5.4 years, meaning it accumulates and persists in the body for years.",
    clinical_threshold: "EPA limit: 4 ppt (0.004 µg/L). EPA Reference Dose based on birth weight and immune endpoints. PFOS accumulates extensively in liver and serum.",
    actionable: "Use an NSF/ANSI 58-certified filter (reverse osmosis is most effective). If children are in the household, discuss reduced vaccine response risk with your pediatrician. If pregnant, consult your OB-GYN about serum PFAS testing. Routine cholesterol monitoring at annual checkups is appropriate for long-term exposure.",
    evidence_note: null,
    epa_limit: 0.004,
    refs: [
      { label: "IARC Monographs Vol. 135 — PFOS Group 2B classification (Lancet Oncol. 2024)", url: "https://pubmed.ncbi.nlm.nih.gov/38065580/" },
      { label: "PFOS biological half-life 5.4 years — Olsen et al. (Environ Health Perspect. 2007)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1964923/" },
      { label: "PFOS/PFOA and reduced vaccine antibody response in children — Grandjean et al. (JAMA 2012)", url: "https://pubmed.ncbi.nlm.nih.gov/22274686/" },
      { label: "PFAS binding to TBG and thyroid hormone disruption — meta-analysis (Toxics 2025)", url: "https://www.mdpi.com/2305-6304/13/3/214" }
    ]
  },
  "PFNA": {
    full: "Perfluorononanoic acid",
    thyroid: "PFNA is a 9-carbon PFAS compound structurally similar to PFOA. It may affect thyroid hormone levels by interfering with transport proteins and hormone metabolism, though the mechanism is less studied than PFOA or PFOS.",
    health_effects: "The most consistent human findings are elevated total and LDL cholesterol and elevated ALT (a liver injury marker). EPA's draft toxicity assessment identifies decreased birth weight as a critical developmental endpoint. Animal studies strongly support liver toxicity. PFNA has also been associated with elevated TSH and altered thyroid function in some studies. It is detected in over 99% of the U.S. population at background levels.",
    clinical_threshold: "EPA limit: 10 ppt (0.010 µg/L) as part of the hazard index group. No individual serum reference level established yet — EPA's full IRIS assessment has not been publicly released as of 2025.",
    actionable: "NSF/ANSI 58-certified reverse osmosis filter is recommended. Monitor cholesterol and liver enzymes (ALT) at routine checkups. If pregnant, discuss thyroid monitoring with your provider. PFNA is regulated as part of a combined hazard index with four other compounds — your total PFAS exposure picture matters.",
    evidence_note: "EPA's complete toxicity assessment for PFNA had not been publicly released as of early 2025. Evidence is mounting but the regulatory science is still being finalized.",
    epa_limit: 0.010,
    refs: [
      { label: "EPA PFNA hazard index regulation — PFAS National Primary Drinking Water Rule (2024)", url: "https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas" },
      { label: "PFNA and thyroid hormone disruption in pregnancy — systematic review (Environ Int. 2016)", url: "https://www.sciencedirect.com/science/article/pii/S0160412016306195" }
    ]
  },
  "PFHxS": {
    full: "Perfluorohexane sulfonic acid",
    thyroid: "PFHxS has an exceptionally long biological half-life (estimated 5 to 8.5 years depending on the study population) and is particularly noted for thyroid disruption. EPA's toxicity review concluded PFHxS is likely to cause thyroid and developmental immune effects in humans. It disrupts thyroid hormone levels — including elevated TSH and altered T4 — with some of the strongest evidence among shorter-chain PFAS.",
    health_effects: "Thyroid disruption and immune suppression are the two best-established hazards. Reduced vaccine antibody response in children is the most consistently replicated finding. Thyroid hormone disruption during fetal development is a particular concern — PFHxS crosses the placenta. Some studies associate PFHxS with memory or cognitive effects, though evidence is preliminary. Its extremely long half-life means body burden accumulates over decades.",
    clinical_threshold: "EPA limit: 10 ppt (0.010 µg/L) as part of the hazard index group. Due to its long half-life, past exposures continue to contribute to current body burden long after the source is removed.",
    actionable: "NSF/ANSI 58-certified filter. Thyroid function testing (TSH, free T4) is reasonable to discuss with your doctor if exposure has been long-term. For children or pregnant women, the thyroid and immune concerns are most relevant — raise with your provider. Reducing exposure as early as possible is beneficial given the long half-life.",
    evidence_note: null,
    epa_limit: 0.010,
    refs: [
      { label: "PFHxS half-life 8.5 years (95% CI 6.4–10.6) — Olsen et al. (Environ Health Perspect. 2007)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1964923/" },
      { label: "PFHxS half-life 5.3 years in drinking-water-exposed population — Li et al. (2018)", url: "https://pubmed.ncbi.nlm.nih.gov/29133598/" },
      { label: "PFHxS and thyroid hormone disruption in pregnancy — systematic review (Environ Int. 2016)", url: "https://www.sciencedirect.com/science/article/pii/S0160412016306195" },
      { label: "PFHxS thyroid disruption and neurodevelopment in offspring — animal study (PMC7021709)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7021709/" }
    ]
  },
  "PFHpA": {
    full: "Perfluoroheptanoic acid",
    thyroid: "PFHpA sits between short-chain and long-chain PFAS structurally. Emerging data raise concerns around thyroid disruption, liver disease, and metabolic effects, though the evidence base is significantly less developed than for PFOA or PFOS.",
    health_effects: "PFHpA has no individual EPA MCL, no ATSDR minimum risk level, no IARC classification, and no completed EPA IRIS assessment — it is among the least formally evaluated commonly detected PFAS. Emerging research associates it with liver effects, potential thyroid disruption, and some cancer signals. Several states (Connecticut, Vermont, Colorado, Massachusetts) have included it in grouped PFAS standards.",
    clinical_threshold: "No individual federal limit. Regulated by some states as part of grouped PFAS totals. The absence of a regulatory limit does not mean it has been found safe — it reflects a data gap rather than a safety determination.",
    actionable: "NSF/ANSI 58-certified filter will remove PFHpA along with regulated PFAS. Given the data gap, erring toward precaution — especially during pregnancy — is reasonable. Discuss with your provider if you have known long-term exposure.",
    evidence_note: "PFHpA is in a major regulatory data gap. 'No limit' means it has not been fully evaluated yet, not that it is safe. This is useful information in itself — it is a compound regulators are actively investigating.",
    epa_limit: null,
    refs: [
      { label: "EPA UCMR 5 — PFHpA monitoring data and compound list", url: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule" }
    ]
  },
  "PFDA": {
    full: "Perfluorodecanoic acid",
    thyroid: "PFDA is a 10-carbon PFAS with an EPA IRIS assessment completed in July 2024. Some studies associate it with elevated maternal TSH, suggesting potential thyroid axis disruption during pregnancy, though the thyroid evidence is less established than for PFHxS.",
    health_effects: "EPA's IRIS review concludes PFDA likely causes developmental immune effects — specifically decreased antibody response to childhood vaccines. Liver toxicity (elevated ALT, lipid changes) is also identified. Immune suppression affecting children's vaccine responses is the primary regulatory concern. PFDA is regulated as part of the EPA hazard index group of five PFAS.",
    clinical_threshold: "No individual EPA MCL. Regulated as part of the hazard index group (PFNA + PFHxS + PFDA + HFPO-DA + PFBS combined at or below 1). EPA IRIS assessment (July 2024) is the most current authoritative source.",
    actionable: "NSF/ANSI 58-certified filter. For households with young children, the immune suppression finding — reduced vaccine effectiveness — is the most clinically relevant concern to discuss with a pediatrician. Liver enzyme monitoring (ALT) is appropriate with long-term exposure.",
    evidence_note: null,
    epa_limit: null,
    refs: [
      { label: "EPA IRIS Toxicological Review of PFDA (July 2024)", url: "https://www.epa.gov/iris/toxicological-review-perfluorodecanoic-acid-pfda" }
    ]
  },
  "PFBA": {
    full: "Perfluorobutanoic acid",
    thyroid: "PFBA is a 4-carbon short-chain PFAS with a dramatically shorter biological half-life than longer-chain compounds (approximately 3 to 4 days), meaning it clears the body much faster. However, EPA's 2022 IRIS assessment identifies genuine thyroid, liver, and developmental hazards despite its shorter persistence.",
    health_effects: "EPA IRIS review (December 2022) identifies thyroid effects, liver toxicity, and developmental toxicity as primary hazards. Because it clears quickly, exposure tends to reflect ongoing contamination rather than historical accumulation. It is an environmental degradation product of other PFAS and fluorotelomer compounds, so its presence may indicate broader PFAS contamination.",
    clinical_threshold: "No federal MCL. EPA IRIS assessment completed December 2022. Its short half-life means blood levels drop quickly after exposure stops — but ongoing exposure from water maintains body burden.",
    actionable: "NSF/ANSI 58-certified filter. Because PFBA clears quickly, stopping exposure through filtration is particularly effective. Its presence in water may indicate co-contamination with other regulated PFAS worth monitoring.",
    evidence_note: "PFBA's short half-life is often misread as 'safer.' EPA's own assessment found real hazards — shorter persistence affects how it accumulates, not whether it causes harm at exposure.",
    epa_limit: null,
    refs: [
      { label: "EPA IRIS Toxicological Review of PFBA (December 2022)", url: "https://www.epa.gov/iris/toxicological-review-perfluorobutanoic-acid-pfba" }
    ]
  },
  "PFPeA": {
    full: "Perfluoropentanoic acid",
    thyroid: "PFPeA is a 5-carbon PFAS at the intersection of short-chain and mid-chain compounds. Thyroid disruption is a theoretical concern based on structural similarity to other PFAS, but direct human evidence is extremely limited.",
    health_effects: "PFPeA has no completed EPA IRIS assessment, no federal MCL, no ATSDR minimum risk level, and very limited human epidemiological data — making it among the most data-sparse commonly detected PFAS. One study found a positive association with leukemia in males, but this is preliminary. Emerging toxicological signals are raising scientific concern despite the absence of regulatory action.",
    clinical_threshold: "No federal limit or established serum reference level. Canada includes PFPeA in its 25-PFAS objective. The data gap is substantial.",
    actionable: "NSF/ANSI 58-certified filter. Given the near-complete absence of clinical data, precautionary exposure reduction is the main practical action. Its detection may indicate co-contamination with better-studied PFAS that have more established health profiles.",
    evidence_note: "PFPeA is in an extreme regulatory data vacuum. Very little human research exists. This is one of the compounds where 'we don't know' is the honest clinical answer — not reassurance.",
    epa_limit: null,
    refs: [
      { label: "EPA UCMR 5 — PFPeA monitoring data and compound list", url: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule" }
    ]
  },
  "PFBS": {
    full: "Perfluorobutane sulfonic acid",
    thyroid: "PFBS was introduced as a replacement for PFOS with the assumption that its shorter chain length made it safer. Emerging evidence challenges this — thyroid disruption is one of its primary confirmed hazards in animal studies, and human thyroid associations are being reported. It inhibits the sodium-iodide symporter (NIS), directly impairing the thyroid's ability to take up iodine.",
    health_effects: "EPA's 2021 Human Health Toxicity Assessment identifies thyroid, developmental, and kidney effects as primary animal-confirmed hazards. Human epidemiological data are limited but growing. Associations with thyroid hormone disruption, developmental effects, and renal function impairment have been reported. It is regulated as part of the EPA hazard index group. Like PFBA, its shorter half-life means it clears faster but ongoing water exposure maintains body burden.",
    clinical_threshold: "No individual MCL. Regulated as part of the hazard index group. EPA toxicity assessment (April 2021) is the primary regulatory reference.",
    actionable: "NSF/ANSI 58-certified filter. The thyroid disruption mechanism (NIS inhibition) is directly relevant during pregnancy and in children — discuss with your provider if either applies. Kidney function monitoring is worth discussing with long-term high exposure.",
    evidence_note: "PFBS was marketed as a 'safe' PFOS replacement. EPA's own assessment found thyroid, developmental, and kidney hazards. The 'safer alternative' framing does not mean tested and found safe.",
    epa_limit: null,
    refs: [
      { label: "EPA Human Health Toxicity Assessment for PFBS (April 2021)", url: "https://www.epa.gov/system/files/documents/2021-03/pfbs-toxicity-assessment_0.pdf" },
      { label: "PFAS NIS inhibition and thyroid disruption mechanism — meta-analysis (Toxics 2025)", url: "https://www.mdpi.com/2305-6304/13/3/214" }
    ]
  },
  "6:2 FTS": {
    full: "6:2 Fluorotelomer sulfonate",
    thyroid: "6:2 FTS inhibits the human sodium-iodide symporter (NIS) — the same mechanism as PFBS — directly impairing iodine uptake into the thyroid. This is one of its most concerning newly identified effects. It crosses the placenta, confirmed in human cord blood studies, making fetal thyroid exposure possible.",
    health_effects: "6:2 FTS is the dominant PFAS in modern firefighting foam (AFFF) and is increasingly detected in water near military bases and airports. It has no EPA IRIS assessment, no federal MCL, and no ATSDR minimum risk level. Established concerns include potential immunotoxicity, disruption of pancreatic beta-cell function (reducing insulin production capacity in vitro), placental transfer to the fetus, and NIS inhibition affecting thyroid iodine uptake. It degrades in the environment into other PFAS compounds, including some that are regulated.",
    clinical_threshold: "No federal limit or serum reference level. Hawaii's 2025 risk evaluation included 6:2 FTS. Its non-bioaccumulative classification (by regulatory criteria) is based on it clearing faster than PFOS — not on it being found harmless.",
    actionable: "NSF/ANSI 58-certified filter. If you live near a military base, airport, or industrial site where AFFF foam has been used, 6:2 FTS detection is worth flagging to your provider. The thyroid (NIS inhibition) and pregnancy (placental transfer) concerns are most actionable clinically.",
    evidence_note: "6:2 FTS is in a regulatory data vacuum despite growing concern. Its 'safer alternative' designation from industry refers only to lower bioaccumulation — not safety. It can also break down into more persistent regulated PFAS compounds.",
    epa_limit: null,
    refs: [
      { label: "National Academies of Sciences — PFAS immunotoxicity review (2022)", url: "https://www.nationalacademies.org/our-work/guidance-on-pfas-exposure-and-health-effects" },
      { label: "PFAS NIS inhibition mechanism — thyroid iodine uptake (Toxics 2025)", url: "https://www.mdpi.com/2305-6304/13/3/214" }
    ]
  },
  "HFPO-DA": {
    full: "Hexafluoropropylene oxide dimer acid (GenX)",
    thyroid: "HFPO-DA (GenX) was developed as a direct replacement for PFOA after that compound was phased out. Like PFOA, it may interfere with thyroid hormone production by reducing iodine uptake, which is needed to produce T3 and T4. During pregnancy, this matters because the fetus depends entirely on the mother's thyroid hormones for early brain development, particularly in the first trimester.",
    health_effects: "HFPO-DA is one of only four PFAS that have caused tumors in chronic animal bioassays — specifically liver adenomas and carcinomas in a 2-year rat study. EPA has set an MCL of 10 ppt. It is detected primarily in urine rather than serum (unlike long-chain PFAS), reflecting a different metabolic pathway. Liver toxicity, kidney effects, immune disruption, and metabolic effects are identified concerns. It is structurally classified as a Perfluoroalkyl Ether Carboxylic Acid (PFECA) — a different class than PFOA despite similar function.",
    clinical_threshold: "EPA MCL: 10 ppt (0.010 µg/L). Among the newer PFAS with a federal limit. Animal carcinogenicity data are a significant concern at this level.",
    actionable: "NSF/ANSI 58-certified filter (reverse osmosis most effective). Detections near or above the EPA limit warrant discussion with your provider. Given its PFOA-replacement origin, its presence in water may suggest industrial proximity. Liver and kidney function monitoring is appropriate with documented long-term exposure.",
    evidence_note: null,
    epa_limit: 0.010,
    refs: [
      { label: "EPA PFAS National Primary Drinking Water Regulation — HFPO-DA MCL (April 2024)", url: "https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas" },
      { label: "EPA Human Health Toxicity Assessment for HFPO-DA (GenX)", url: "https://www.epa.gov/system/files/documents/2021-03/genx-toxicity-assessment_0.pdf" }
    ]
  },
  "Lithium": {
    full: "Lithium (naturally occurring)",
    thyroid: "Lithium accumulates in thyroid tissue and directly interferes with how the thyroid makes and releases hormones. Unlike PFAS, lithium is naturally occurring — it seeps into water from rock and soil, not industrial contamination. Research has found adverse thyroid effects during pregnancy at water concentrations above approximately 5 µg/L.",
    health_effects: "Lithium in drinking water is unusual because it has both potential benefits and real risks depending on the amount — and both can occur at levels found in some U.S. tap water. The most consistently documented concern is thyroid function, particularly during pregnancy. There is also emerging research linking higher lithium levels in water to increased risk of autism spectrum disorder and schizophrenia in children born to mothers exposed during pregnancy. At the same time, lower levels have been associated with reduced suicide rates and potentially lower dementia risk at a population level. Researchers are still working out exactly where the line is.",
    clinical_threshold: "No federal limit. EPA non-regulatory reference level: 10 µg/L. Elevated ASD odds in offspring begin at maternal exposures above approximately 7.36 µg/L — below the EPA's own reference level (Liew et al., JAMA Pediatrics 2023). Thyroid effects in pregnancy suggested above approximately 5 µg/L. EPA regulatory decision expected 2026.",
    actionable: "NSF/ANSI 58-certified reverse osmosis filter removes lithium. If you are pregnant, the ASD and schizophrenia risk signals are the most clinically actionable concern — discuss with your OB-GYN, particularly if you are in a western U.S. state where groundwater lithium is highest. Thyroid function monitoring is appropriate.",
    evidence_note: "Lithium is naturally occurring, not industrial — but 'natural' does not mean safe. Elevated ASD odds in offspring have been observed at concentrations below the EPA's own reference level. A federal regulatory decision is expected in 2026.",
    epa_limit: null,
    refs: [
      { label: "Lithium in drinking water and ASD risk in offspring — Liew et al. (JAMA Pediatrics 2023)", url: "https://pubmed.ncbi.nlm.nih.gov/37010840/" },
      { label: "EPA non-regulatory reference level for lithium in drinking water", url: "https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule" },
      { label: "Lithium drinking water and psychiatric outcomes — systematic review (APA 2024)", url: "https://www.healio.com/news/psychiatry/20240507/lithium-in-drinking-water-linked-to-negative-effects-on-human-health" }
    ]
  }
};
