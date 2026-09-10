# CDPHE feedback implementation record

## Source and scope

This record documents website feedback received by email from Aki Suzuki, MPH, Emerging Issues Scientist in the Colorado Department of Public Health and Environment Toxicology and Risk Assessment Program, and the corresponding website changes prepared on September 10, 2026.

The changes apply to public-facing website language and navigation only. They do not modify the manuscript, the frozen January 2026 research release, source data, inclusion rules, calculations, or study conclusions.

## Feedback and implementation

| Feedback | Decision | Website implementation |
| --- | --- | --- |
| Define dashboard terms such as “Complete Monitoring.” | Accepted. | “Complete monitoring” is defined as at least one sampling location having all required samples needed to calculate a yearly average. The site also states that this does not mean every home was tested or that a system is safe or compliant. |
| Rewrite “Systems Reaching a Study Comparison Level” in plain language and show both the count above and below the benchmark. | Accepted. | Result summaries now say that a yearly average was “at or above” a study benchmark. When several systems are shown, the summary gives both the number at or above a benchmark and the remaining number below all study benchmarks. |
| Refer to the “study level” as an “EPA technical benchmark” after defining it. | Accepted with a scientific-accuracy adjustment. | The site uses “EPA-based study benchmark.” This avoids implying that the project’s exact unrounded reconstruction cutoffs are current EPA regulatory thresholds. The definition explains that they reproduce EPA’s January 2026 technical-assistance classification around the April 2024 federal levels and are not current standards or compliance findings. |
| Use “at or above” rather than “reached.” | Accepted. | The homepage, result cards, map, state table, generated state pages, and assistant guardrails use “at or above.” |
| Present common research-assistant questions as popups rather than scrolling chat prompts. | Accepted. | Four quick explanations now open in an accessible dialog. The free-form research assistant remains available below them. |
| Define “reporting level” where results are shown. | Accepted. | The results glossary and methodology explain that the EPA reporting level is the lowest concentration UCMR 5 reports as a number for a compound. They also explain that a below-level result is not a measured zero and does not prove absence. |

## Site-wide consistency work

The same language rules were applied across the homepage lookup, result cards, national map, state table, state pages, methodology page, deterministic assistant answers, and assistant-response sanitization. Technical field names inside the frozen data release were left unchanged.

## Guardrails preserved

- ZIP codes remain locator inputs and do not prove which utility serves a household.
- UCMR 5 samples represent entry points to a distribution system, not household faucets.
- Results do not determine current legal compliance, household tap concentration, personal exposure, or health risk.
- The public research snapshot remains frozen through January 15, 2026, while the site directs readers to EPA’s current Data Finder for newer official data.
- The research remains identified as independent and preliminary, not peer reviewed.

## Verification requirements

Before publication, regenerate all state pages, run the assistant and reviewer-feedback regression tests, confirm that the frozen research-release hashes are unchanged, and inspect the lookup and dialog at desktop and mobile widths.
