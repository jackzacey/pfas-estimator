# September 27 feedback update

This change addresses incomplete-result interpretation, source-to-display traceability, result hierarchy and a verified utility-link pilot. The frozen v0.2 research outputs, ZIP-review decisions and manuscript results are unchanged.

## What changed

- Result summaries use all six outcome/location coverage counts. An available average at one location no longer implies every location has a complete comparison. Missing comparisons are explicitly unavailable, including in deterministic English/Chinese assistant answers and the generated-answer context.
- New additive `data/lookup-evidence.json` reproduces the published maxima and full-set flags for 10,289 systems / 26,625 locations. Source input checksums are checked during generation; the browser checks the evidence checksum, release identity and agreement with the lookup before enabling results.
- “How these numbers were produced” shows source-unit conversion, locations sharing each maximum, occurrence-record date ranges, source CSV lines and provenance. Ties are retained in the underlying evidence; the interface shows up to five examples, labeled when truncated.
- Source-record dates are explicitly **not** represented as the exact retained EPA averaging set. No unsupported reconstruction or additional numerical precision is introduced. Zero-coded nondetections remain below-reporting-level results, not measured zeros.
- Official report links are keyed by PWSID, with the report's actual data year and link-check date. Pilot: CA4310011 San Jose Water (2024 data), VT0005202 Newport (2025), NC0201010 Burlington (2025), PA4550005 Selinsgrove (2024). A report or town name does not verify service to a specific home.
- Provider confirmation detail is expandable; direct official information and coverage remain visible. Optional AI follows the result rather than precedes it.

## Reproduce evidence

Run from the repository root with the original frozen source inputs:

```sh
python3 analysis/scripts/19_build_lookup_evidence.py --locations analysis/outputs/epa_ucmr5_average_pfas_locations.csv --raw /path/to/frozen/UCMR5_All.txt
```

The source files are not replaced. A changed input checksum fails generation. The evidence file is an additive website artifact outside the locked research export. If intentionally regenerated, update its pinned checksum in `scientific-site-v2.js` only after reviewing the source and reproduced values.

## Validation

- Existing assistant, all-system bilingual rendering, frozen-release/reviewer regression, ZIP-review and ZIP integration tests pass.
- New evidence tests check all-system outcome reproduction, checksum pin, incorrect-release and altered-value rejection, mixed/incomplete/complete/positive scenarios, English/Chinese rendering and provider-link IDs.
- Browser layout was also checked at 390 px width and with the Chinese language toggle; new source and coverage text remained readable. This is not a substitute for reader comprehension testing.
- Real mixed-coverage regression fixture: Santa Ana Westside `063503118`.
- Browser check: ZIP 95032 initializes with verified evidence, excludes Kohala Ranch, displays coverage (PFOA 11/19; PFHxS 10/19), and expands PFHxS to Williams and Will Wool source locations with 2023 occurrence dates. Both tie for the archived 4 ppt display.

## Remaining limits

The exact alternative ATSDR tool/version and record-selection logic still require reconciliation; the supplied historical UCMR3 output is not a same-record comparison. This change does not claim that discrepancy fully resolved. Independent scientific review and reader comprehension testing remain outstanding. The four-link pilot is not a national provider directory; upstream suppliers and town aliases are not invented. A current-data release remains separate from the frozen study.

The evidence payload is approximately 8.2 MB uncompressed; transfer compression should be enabled by hosting. A later per-system lazy-loading optimization may be appropriate, but must preserve fail-closed validation. This update has not been pushed or deployed.
