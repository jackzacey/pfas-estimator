const SCIENCE = {
  "PFOA": {
    full: "Perfluorooctanoic acid",
    thyroid: "PFOA is a 'forever chemical' once used in nonstick cookware and waterproof materials. It enters drinking water through industrial waste and runoff. PFOA interferes with thyroid function by reducing iodine uptake in the thyroid gland — iodine is essential for producing hormones T3 and T4. During pregnancy, this matters because the fetus depends entirely on the mother's thyroid hormones for early brain development, particularly in the first trimester.",
    health_effects: "PFOA is one of the most studied and concerning forever chemicals — it's now classified as a known human carcinogen, with the strongest links to kidney and testicular cancer. It can also raise your cholesterol, affect how well your liver functions, and reduce how effectively children's immune systems respond to vaccines. If you're pregnant, it may affect your thyroid and has been linked to lower birth weight. Most people won't notice any symptoms, but long-term exposure is what researchers are most concerned about.",
    clinical_threshold: "EPA limit: 4 ppt (0.004 µg/L). Health effects have been observed in human studies at serum levels as low as 1.1–5.2 ng/mL. The U.S. general population median serum level is 1.42 ng/mL (declining since production phaseout).",
    actionable: "Use an NSF/ANSI 58-certified water filter (reverse osmosis or activated carbon block) — these are specifically tested to remove PFAS. If pregnant or planning pregnancy, discuss with your OB-GYN. A clinician can order a serum PFAS panel through commercial labs. Monitor cholesterol and liver enzymes at routine checkups if you have long-term exposure.",
    evidence_note: null,
    epa_limit: 0.004
  },
  "PFOS": {
    full: "Perfluorooctane sulfonic acid",
    thyroid: "PFOS was widely used in nonstick cookware, stain-resistant fabrics, and firefighting foam. It interferes with thyroid hormone transport by binding to the protein that carries thyroid hormones through the bloodstream. When this transport is disrupted, less hormone may reach developing fetal tissue.",
    health_effects: "PFOS is a persistent chemical that stays in the body for years — its half-life is over 5 years, meaning once it's in your system it takes a long time to leave. The most consistently found health effect is elevated cholesterol. In children, it can reduce how well their immune systems respond to vaccines. If you were exposed during pregnancy, research links it to lower birth weight in babies. It's also possibly linked to liver and testicular cancer, though the evidence is still developing.",
    clinical_threshold: "EPA limit: 4 ppt (0.004 µg/L). EPA Reference Dose based on birth weight and immune endpoints. PFOS accumulates extensively in liver and serum — longer half-life than PFOA.",
    actionable: "Use an NSF/ANSI 58-certified filter (reverse osmosis is most effective). If children are in the household, discuss immune health with your pediatrician. If pregnant, consult your OB-GYN about PFAS testing. Routine cholesterol monitoring at annual checkups is appropriate for long-term exposure.",
    evidence_note: null,
    epa_limit: 0.004
  },
  "PFNA": {
    full: "Perfluorononanoic acid",
    thyroid: "PFNA is structurally similar to PFOA and may affect thyroid hormone levels by interfering with how hormones are transported and processed in the body, though the research is less developed than for PFOA or PFOS.",
    health_effects: "The most commonly found effects in studies are elevated cholesterol and signs of mild liver stress. There's also evidence it can affect thyroid function and has been linked to lower birth weight in babies. PFNA is found at low levels in nearly every American — it's one of the most widespread PFAS in the U.S. population. Researchers are still finalizing their full assessment of how harmful it is at typical drinking water levels.",
    clinical_threshold: "EPA limit: 10 ppt (0.010 µg/L) as part of the hazard index group. No individual serum reference level established yet — EPA's full assessment has not been publicly released as of 2025.",
    actionable: "NSF/ANSI 58-certified reverse osmosis filter is recommended. Monitor cholesterol and liver function at routine checkups. If pregnant, discuss thyroid monitoring with your provider. PFNA is regulated as part of a combined group of five PFAS compounds — your total PFAS picture matters.",
    evidence_note: "EPA's complete assessment for PFNA had not been publicly released as of early 2025. The science is still being finalized — this is a data gap, not a green light.",
    epa_limit: 0.010
  },
  "PFHxS": {
    full: "Perfluorohexane sulfonic acid",
    thyroid: "PFHxS stays in the body for an exceptionally long time — up to 8 years — and is one of the PFAS most strongly linked to thyroid disruption. It can affect thyroid hormone levels and crosses the placenta, which means a developing baby can be exposed during pregnancy.",
    health_effects: "The two biggest concerns with PFHxS are thyroid function and children's immune health. It's one of the PFAS most strongly associated with reduced vaccine effectiveness in kids, and it can affect the thyroid in ways that matter most during pregnancy and early childhood. Because it stays in the body for so long, even past exposure continues to affect you — reducing exposure now still matters, but the effects of long-term exposure can linger.",
    clinical_threshold: "EPA limit: 10 ppt (0.010 µg/L) as part of the hazard index group. Due to its ~8-year half-life, past exposures continue to contribute to current body burden long after the source is removed.",
    actionable: "NSF/ANSI 58-certified filter. Talk to your doctor about thyroid function testing if you've had long-term exposure. For children or pregnant women, the thyroid and immune concerns are most relevant — raise with your provider. The sooner you reduce exposure, the better, given how long it stays in the body.",
    evidence_note: null,
    epa_limit: 0.010
  },
  "PFHpA": {
    full: "Perfluoroheptanoic acid",
    thyroid: "PFHpA may affect thyroid function based on its chemical structure and early research, but direct evidence in humans is limited compared to better-studied compounds like PFOA.",
    health_effects: "PFHpA hasn't been studied as thoroughly as older PFAS chemicals, so there's genuine uncertainty about exactly how harmful it is. Early research points to possible effects on the liver, thyroid, and potentially cancer risk — but these findings are preliminary. The fact that it doesn't yet have a federal limit isn't reassurance — it reflects a gap in research, not a clean bill of health. Several states have already started regulating it as part of broader PFAS limits.",
    clinical_threshold: "No individual federal limit. Regulated by some states as part of grouped PFAS totals. No federal limit means it hasn't been fully evaluated yet — not that it's been found safe.",
    actionable: "An NSF/ANSI 58-certified filter will remove PFHpA along with regulated PFAS. Given the uncertainty, taking precautions — especially during pregnancy — is reasonable. Discuss with your provider if you've had known long-term exposure.",
    evidence_note: "No federal limit for PFHpA means it hasn't been fully evaluated yet — not that it's been found safe. This is an active area of research.",
    epa_limit: null
  },
  "PFDA": {
    full: "Perfluorodecanoic acid",
    thyroid: "Some studies associate PFDA with elevated thyroid-stimulating hormone in pregnant women, suggesting it may affect how the thyroid regulates itself during pregnancy, though the evidence is less established than for other PFAS.",
    health_effects: "The EPA's most recent assessment of PFDA, completed in 2024, found that the main concern is how it affects children's immune systems — specifically, their ability to build immunity from vaccines. It's also linked to liver effects including elevated liver enzymes. PFDA is regulated as part of a group of five PFAS compounds, meaning your exposure to the whole group matters, not just this one compound alone.",
    clinical_threshold: "No individual EPA limit. Regulated as part of the hazard index group (five PFAS combined). EPA assessment completed July 2024.",
    actionable: "NSF/ANSI 58-certified filter. For households with young children, the immune effect — reduced vaccine effectiveness — is the most relevant concern to discuss with a pediatrician. Liver function monitoring is appropriate with long-term exposure.",
    evidence_note: null,
    epa_limit: null
  },
  "PFBA": {
    full: "Perfluorobutanoic acid",
    thyroid: "PFBA may affect thyroid function based on animal studies and EPA's formal assessment, though human research at drinking water levels is limited.",
    health_effects: "Unlike many other PFAS, PFBA clears out of the body relatively quickly — within a few days. That sounds reassuring, but it means if it keeps showing up in your water, it keeps getting into your body. The EPA's own assessment found real concerns about thyroid function, liver health, and developmental effects. Its presence in your water may also be a sign that other PFAS are there too, since PFBA is often a breakdown product of other chemicals.",
    clinical_threshold: "No federal limit. EPA assessment completed December 2022. Short half-life means blood levels drop quickly after exposure stops — but ongoing water exposure maintains body burden.",
    actionable: "NSF/ANSI 58-certified filter. Because PFBA clears quickly, stopping exposure through filtration is particularly effective. Its presence may indicate co-contamination with other regulated PFAS worth monitoring.",
    evidence_note: "PFBA's short half-life is sometimes misread as meaning it's safer. The EPA's own assessment found real thyroid and developmental concerns — shorter persistence affects how it accumulates, not whether it causes harm.",
    epa_limit: null
  },
  "PFPeA": {
    full: "Perfluoropentanoic acid",
    thyroid: "Thyroid disruption is a theoretical concern for PFPeA based on its chemical similarity to other PFAS, but direct human evidence is extremely limited.",
    health_effects: "Researchers simply don't know much about PFPeA yet — it's one of the least studied PFAS that commonly shows up in drinking water. There's preliminary evidence it may be linked to leukemia in men, but this is very early-stage research. The honest answer is that we don't have enough data to say how harmful it is at the levels typically found in tap water. Its presence may point to broader contamination from other, better-studied chemicals.",
    clinical_threshold: "No federal limit or established reference level. The data gap is substantial — this is one of the least evaluated common PFAS.",
    actionable: "NSF/ANSI 58-certified filter. Given how little is known, reducing exposure is the most practical step. Its detection may indicate co-contamination with better-studied PFAS.",
    evidence_note: "Very little human research exists on PFPeA. 'We don't know' is the honest answer here — not reassurance.",
    epa_limit: null
  },
  "PFBS": {
    full: "Perfluorobutane sulfonic acid",
    thyroid: "PFBS was promoted as a safer replacement for PFOS, but emerging evidence shows it directly interferes with the thyroid's ability to absorb iodine — which is essential for making thyroid hormones. This is particularly relevant during pregnancy and in children.",
    health_effects: "PFBS was marketed as a safe alternative to PFOS, but the EPA's own assessment found concerns about thyroid function, child development, and kidney health. Like PFBA, it clears the body faster than older PFAS — but ongoing water exposure keeps replenishing it. The 'safer alternative' label from industry was based on how fast it leaves the body, not on evidence that it's harmless.",
    clinical_threshold: "No individual federal limit. Regulated as part of the hazard index group. EPA toxicity assessment completed April 2021.",
    actionable: "NSF/ANSI 58-certified filter. The thyroid concern is most relevant during pregnancy and for children — discuss with your provider if either applies. Kidney function is worth monitoring with long-term high exposure.",
    evidence_note: "PFBS was called a 'safe' PFOS replacement by industry. The EPA found thyroid, developmental, and kidney hazards. Shorter persistence in the body is not the same as being safe.",
    epa_limit: null
  },
  "6:2 FTS": {
    full: "6:2 Fluorotelomer sulfonate",
    thyroid: "6:2 FTS directly interferes with the thyroid's ability to absorb iodine — the same way PFBS does. It has been detected in umbilical cord blood, meaning a developing baby can be exposed during pregnancy.",
    health_effects: "6:2 FTS is the main chemical in modern firefighting foam and is most commonly found in water near military bases, airports, and industrial sites. It can affect the immune system, interfere with thyroid function, and may affect how the pancreas produces insulin. It's also concerning because it breaks down in the environment into other PFAS — including some that are now federally regulated. There's no federal limit for it yet, but scientific concern is growing.",
    clinical_threshold: "No federal limit or reference level. Hawaii conducted a risk evaluation in 2025. It breaks down into other regulated PFAS compounds in the environment.",
    actionable: "NSF/ANSI 58-certified filter. If you live near a military base, airport, or industrial facility, flagging this to your healthcare provider is worthwhile. Thyroid and pregnancy concerns are the most clinically relevant.",
    evidence_note: "6:2 FTS can break down into more persistent, regulated PFAS. Its 'safer' designation was based on lower bioaccumulation — not on being tested and found harmless.",
    epa_limit: null
  },
  "HFPO-DA": {
    full: "Hexafluoropropylene oxide dimer acid (GenX)",
    thyroid: "GenX was developed as a direct replacement for PFOA and may affect the thyroid in a similar way — by reducing the thyroid's ability to absorb iodine, which is needed to make hormones essential for fetal brain development during pregnancy.",
    health_effects: "GenX was introduced as a replacement for PFOA after that chemical was phased out due to health concerns — but it carries its own risks. It's one of only a handful of PFAS that have been shown to cause tumors in long-term animal studies, specifically in the liver. The EPA has set a federal limit for it. It also affects the liver, kidneys, and immune system. Its presence in water is often linked to nearby industrial manufacturing.",
    clinical_threshold: "EPA limit: 10 ppt (0.010 µg/L). Animal cancer data are a significant concern. It's detected primarily in urine rather than blood, unlike older long-chain PFAS.",
    actionable: "NSF/ANSI 58-certified filter (reverse osmosis most effective). Detections near or above the EPA limit are worth discussing with your provider. Liver and kidney function monitoring is appropriate with documented long-term exposure.",
    evidence_note: null,
    epa_limit: 0.010
  },
  "Lithium": {
    full: "Lithium (naturally occurring)",
    thyroid: "Lithium accumulates in thyroid tissue and directly interferes with how the thyroid makes and releases hormones. Unlike PFAS, lithium is naturally occurring — it seeps into water from rock and soil, not industrial contamination. Research has found adverse thyroid effects during pregnancy at water concentrations above approximately 5 µg/L.",
    health_effects: "Lithium in drinking water is unusual because it has both potential benefits and real risks depending on the amount — and both can occur at levels found in some U.S. tap water. The most consistently documented concern is thyroid function, particularly during pregnancy. There's also emerging research linking higher lithium levels in water to increased risk of autism spectrum disorder and schizophrenia in children born to mothers exposed during pregnancy. At the same time, lower levels have been associated with reduced suicide rates and potentially lower dementia risk at a population level. Researchers are still working out exactly where the line is.",
    clinical_threshold: "No federal limit. EPA non-regulatory reference level: 10 µg/L. ASD risk signal begins above 7.36 µg/L — below the EPA's own reference level. Thyroid effects in pregnancy suggested above ~5 µg/L. EPA regulatory decision expected March 2026.",
    actionable: "NSF/ANSI 58-certified reverse osmosis filter removes lithium. If you're pregnant, the ASD and schizophrenia risk signals are the most clinically actionable concern — discuss with your OB-GYN, particularly if you're in a western U.S. state where groundwater lithium is highest. Thyroid function monitoring is appropriate.",
    evidence_note: "Lithium is naturally occurring, not industrial — but 'natural' doesn't mean safe. An ASD risk signal has been found at concentrations below the EPA's own reference level. A federal regulatory decision is expected in March 2026.",
    epa_limit: null
  }
};
