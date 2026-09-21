# Website feedback implemented — September 21, 2026

Scope: public ZIP lookup and supporting methodology copy. Existing theme, stylesheets, frozen research data, thresholds, calculations, and manuscript outputs are unchanged. No outreach was sent and no live deployment was performed.

## Changes

- **Identify the right provider:** ask visitors to confirm both the system name and PWSID with their bill's provider, explain that one company can operate several systems, and add purchased-water guidance only when the source record identifies purchased water.
- **Show the age of the record:** keep sampling dates beside each finding and flag when the newest sample in this archived record is more than one calendar year old. This is a record-age notice, not a new health threshold or a claim that the utility has not tested since then. Missing, invalid, and future dates do not receive a false age classification.
- **Explain the results without hiding them:** show nondetection/incomplete rows and the mixture result without opening a dropdown. Do not duplicate detected chemical cards in those rows. Explain that below-limit results are not measured zeros, and retain the yearly-average and fixed research-benchmark limitations.
- **Make current official information easier to find:** put EPA sample records, a water-quality report finder, and state resources beside each system. Explain that annual reports may omit PFAS and provide a question visitors can ask their provider about recent testing and treatment.
- **Clarify chemical coverage:** explain that the five individual results are not all PFAS or a total concentration. PFBS is already part of the mixture calculation; the frozen website export does not have an independent PFBS summary. Maxima from different locations/years cannot be added to assess a state's combined-PFAS rule.
- **Give private-well users a next step:** link state well-testing guidance before lookup and after results, including no-match results; offer Maine CDC guidance when a returned system is in Maine.
- **Keep AI optional:** clearly label it as AI, not a water-safety assessment, and direct users to official verification rather than health or safety decisions. The lookup itself remains deterministic.
- Updated English and Chinese result copy together; expanded the methodology's chemical-coverage explanation.

## Valid concerns that require a separate data project

Town/address matching, upstream supplier names, system-specific report URLs, and a full set of current state-specific PFAS sums require verified source mappings and data not present in this archive. The website does not infer these from ZIPs, utility names, or independently maximized chemical values. A final-UCMR-5 refresh would need its own versioned release and validation; this change does not silently replace the January 2026 research archive.

The Vermont feedback justified a clearer coverage explanation and official-state link, not adopting an unverified list of chemicals or a new state-compliance calculation. The existing fixed research comparison is retained.

## Official destinations checked

- [EPA private-well programs by state](https://www.epa.gov/privatewells/private-drinking-water-well-programs-your-state)
- [Maine CDC: PFAS and well water](https://www.maine.gov/dhhs/mecdc/healthy-living/health-and-safety/pfas-in-maine/pfas-and-well-water)
- [EPA water-quality reports](https://www.epa.gov/ccr)
- [EPA UCMR 5 data finder](https://www.epa.gov/dwucmr/fifth-unregulated-contaminant-monitoring-rule-data-finder)
- [Minnesota PFAS testing dashboard](https://www.health.mn.gov/communities/environment/water/pfasmap.html)
- [Vermont drinking-water PFAS information](https://dec.vermont.gov/water/drinking-water/water-quality-monitoring/and-polyfluoroalkyl-substances-pfas-drinking-water) — official search result verified; direct retrieval returned HTTP 403. No current numerical legal claim was inferred from the unavailable page.
- [Pennsylvania public drinking-water resources](https://www.pa.gov/agencies/dep/programs-and-services/water/bureau-of-safe-drinking-water/public-drinking-water)

## Verification

- `node --check scientific-site-v2.js`
- `node tests/reviewer-feedback-regressions.test.js`: frozen release and original theme hashes unchanged.
- `node tests/assistant-result-tools.test.js`: deterministic assistant boundaries unchanged.
- `node tests/lookup-clarity.test.js`: all 10,289 systems render in English and Chinese; six outcomes per system, no duplicated detected rows, accurate below-limit/incomplete handling, date boundary cases, contextual official/private-well links, and HTML escaping.
- Local browser checks: desktop and 390px/320px layouts; ZIP 01720's four systems; language switching; no-match/private-well handoff; no horizontal overflow or JavaScript errors. Screenshots inspected on desktop and mobile.
