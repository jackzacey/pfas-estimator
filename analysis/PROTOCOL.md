# AJPH analysis protocol — version 0.2

**Status:** Locked after the UCMR sampling-design audit; deviations from version 0.1 are logged below  
**Target:** American Journal of Public Health Research Article  
**Data release:** UCMR 5 results received through January 15, 2026; refresh once using the final fall 2026 release if available before submission

## Research question

Among US community water systems with complete UCMR 5 PFAS monitoring, how do sampling-location annual-average individual-PFAS and mixture Hazard Index benchmark results vary by water-system characteristics and the racial, ethnic, socioeconomic, and rural composition of populations served, and which communities would be affected by proposed changes to federal PFAS standards?

## Study design

Cross-sectional ecological analysis of public drinking-water monitoring at the community-water-system level. The study will estimate system- and community-level monitoring patterns and disparities. It will not estimate individual exposure, household exposure, disease risk, causal effects, or regulatory noncompliance.

## Cohorts

### Primary inferential cohort

Active community water systems with:

- a valid PWSID;
- a reported retail population served of at least 3300 people;
- at least 1 UCMR 5 sampling location;
- a complete monitoring set under EPA's UCMR 5 annual-average definition; and
- a valid EPA service-area boundary and eligible served-population demographic estimates.

UCMR 5 attempted a census of eligible PWSs serving at least 3300 people. EPA selected 800 systems serving fewer than 3300 people using a population-weighted stratified design intended to estimate national occurrence, not state, regional, or demographic-subgroup disparities. Public row-level analysis weights or inclusion probabilities were not identified. The sampled smaller systems are therefore not mixed into primary inferential models.

### Supplementary cohort

- Monitored CWSs serving fewer than 3300 people will be described separately and included only in analyses explicitly labeled as unweighted sample sensitivities. Those results cannot be interpreted as estimates for all US small systems.
- Nontransient noncommunity water systems will be included in occurrence summaries but excluded from served-population demographic models because residential Census characteristics do not represent school, workplace, hospital, or other noncommunity populations.

## Outcomes

### Primary outcome

CWS with at least 1 complete-set sampling location whose EPA-compatible annual average is above an applicable individual numeric MCL for PFOA, PFOS, PFHxS, PFNA, or HFPO-DA, or whose EPA-compatible Hazard Index is above 1 for a qualifying mixture. In the January 2026 technical-assistance tables, the unrounded classification rules use the cutoffs described below.

EPA's January 2026 Average PFAS Results export is the primary source for derived sampling-location averages and benchmark classifications. A reproducible reconstruction from the occurrence-data text file is retained as a validation analysis; conflicting repeat/replacement records are not resolved by an invented selection rule.

For validation against EPA's January 2026 summary, results below the UCMR MRL/PQL are treated as zero in the average. EPA's significant-figure rules classify averages as greater than the MCL at the following unrounded cutoffs: at least 0.00405 µg/L for PFOA/PFOS and at least 0.015 µg/L for PFHxS/PFNA/HFPO-DA. These cutoffs reproduce a rounded comparison; they are not new toxicological thresholds.

### Mixture component of the primary outcome

CWS with at least 1 complete-set sampling location whose EPA-compatible Hazard Index is above 1 for a qualifying mixture of PFHxS, PFNA, HFPO-DA, and PFBS.

For validation against EPA's January 2026 summary, the unrounded Hazard Index cutoff is at least 1.5 and at least 2 mixture components must have been measured at or above their UCMR MRLs. Final manuscript terminology will describe this as an EPA technical-assistance comparison rather than a compliance determination.

### Secondary outcomes

- compound-specific detection among all monitored CWSs;
- annual-average concentration distributions;
- combined individual-MCL or Hazard Index benchmark status;
- population served by CWS benchmark status;
- stratification by system size, source water, ownership, region, and rurality; and
- maximum observed concentration as a sensitivity analysis only.

Adjusted compound-specific models require at least 20 events and 20 non-events and successful convergence. Benjamini-Hochberg false-discovery-rate adjustment will be applied across modeled secondary community-characteristic coefficients. Sparse or nonconvergent outcomes will be presented descriptively rather than forced into unstable regression models.

The phrases “MCL comparison” and “benchmark status” will not be used as synonyms for compliance or noncompliance.

## Primary exposures and covariates

Service-area characteristics will be derived from 2020–2024 ACS estimates using EPA's version 3 CWS-to-2020 Census block-group crosswalk. Primary interpolation will use EPA's residential-building-footprint weights; area weights will be retained as a sensitivity analysis and as a fallback where no building weight is available:

- percentage Hispanic/Latino;
- percentage non-Hispanic Black;
- percentage American Indian/Alaska Native;
- percentage below the federal poverty level;
- median household income;
- percentage without a high-school diploma; and
- rurality.

The ACS poverty numerator will be the sum of C17002 income-to-poverty-ratio categories below 0.50 and 0.50–0.99; the denominator will be the C17002 poverty-status universe. This block-group table is used because B17001 is not published for block groups in the 2020–2024 table-based Summary File.

The 2024 Census Planning Database supplies 2020 Census urban/rural counts. Its 2018–2022 ACS fields may be used only as a flagged fallback for 2020 GEOIDs absent from the 2020–2024 ACS geography. Connecticut's new planning-region county equivalents changed its block-group GEOIDs in current products; for Connecticut only, the 2023 Planning Database supplies geography-aligned 2017–2021 ACS characteristics and 2020 urban/rural counts on the original 2020 block-group GEOIDs used by EPA's crosswalk. Every older-vintage fallback is flagged, and a latest-only sensitivity analysis excludes all such systems.

Demographic models require valid primary race/ethnicity and poverty measures for block-group links covering at least 90% of the service area's crosswalk-estimated 2020 population. This threshold is fixed before outcome-model results are examined.

The primary joint model includes Hispanic, non-Hispanic Black, non-Hispanic American Indian/Alaska Native, poverty, and rural proportions. Prespecified system covariates are log2 population served, groundwater versus surface-water source, ownership, and EPA region. Race and ethnicity are treated as markers of structural conditions, not biological susceptibility.

## Statistical analysis

- Report numerator and denominator beside every percentage.
- Use the census-monitored population-serving-at-least-3300 cohort for primary inference; report the monitored smaller-system sample separately and never describe its unweighted results as nationally representative.
- Estimate adjusted prevalence ratios using modified Poisson regression. Because the prespecified residual diagnostic detected spatial autocorrelation after region adjustment, primary uncertainty will use Conley-style spatial heteroskedasticity-and-autocorrelation-consistent sandwich variance with a 250-km Bartlett kernel. State-clustered variance and 100- and 500-km spatial cutoffs are uncertainty sensitivities.
- Include EPA-region fixed effects and evaluate leave-one-region-out influence.
- Evaluate residual spatial autocorrelation with permutation-based Moran's I using 4-, 8-, and 12-nearest service-area centroids.
- Control the false-discovery rate for secondary compound-specific models.
- Report null and contrary findings as prominently as positive findings.

## Required sensitivity analyses

- EPA authoritative versus modeled service-area boundaries;
- complete monitoring sets only versus all available observations;
- primary census cohort versus the explicitly unweighted full monitored CWS sample;
- sampling-location versus CWS summaries;
- annual-average versus maximum-observation summaries;
- defensible below-quantitation treatments for the Hazard Index;
- system-size and source-water strata; and
- exclusion of systems with uncertain or conflicting geographic linkage.

## Policy analysis

Compare the number and served-population composition of CWSs covered by the April 2024 NPDWR configuration with EPA's May 2026 proposal to rescind provisions specific to PFHxS, PFNA, HFPO-DA, and Hazard Index mixtures. This is a regulatory-coverage scenario, not a health-effects estimate or a statement that the proposed rule is final. Rule status will be verified on the submission date.

## Website role

The website is a secondary implementation of frozen analytical outputs. It may display individual samples, annual averages, Hazard Index components, system attributes, service-area provenance, and aggregate demographic context. It may not infer individual exposure, select the paper's denominator, change classifications, or calculate health risk through generative AI.

## Decisions still requiring external methods review

- EPA-compatible treatment of below-quantitation results in annual averages and Hazard Index calculations;
- compositional treatment of racial and ethnic variables;
- service-area population interpolation and uncertainty propagation; and
- final model family if benchmark outcomes are rare.

## Protocol change log

- **Version 0.1:** Required the analysis to address the small-system sampling design but did not yet define the implementation. An initial mixed-cohort, unweighted model was run as a pipeline diagnostic.
- **Version 0.2 (after sampling-design audit):** Review of EPA's 2021 representative-sample design established that systems serving fewer than 3300 were selected for national occurrence estimation and that public row-level analysis weights were not identified. The census-monitored systems serving at least 3300 were therefore designated as the primary inferential cohort, with the monitored smaller systems retained as a plainly labeled unweighted sensitivity. Rurality, already listed among the intended service-area measures, was added to the joint model. The combined April 2024 individual-or-Hazard-Index comparison was fixed as the single primary outcome; compound-specific models are secondary and subject to event-count, convergence, and FDR rules.
- **Version 0.2 spatial amendment (after the prespecified diagnostic):** Residual Moran's I remained positive under all three k-nearest-neighbor definitions. The coefficient model was not changed. A 250-km Conley-style spatial-HAC covariance was designated for primary uncertainty, with state-clustered and 100-/500-km spatial-HAC estimates reported as sensitivities. This post-diagnostic amendment is recorded rather than represented as a pre-result decision.
