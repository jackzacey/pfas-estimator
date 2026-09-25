# ZIP lookup accuracy update — September 25, 2026

## User-visible behavior

ZIP search remains the first step. For 95032 the primary result is San Jose Water;
Kohala Ranch is no longer presented as a possible local provider. The list is not
claimed to identify every provider serving every address in that ZIP.

- Exclude 73 reviewed mainland ZIP associations for Kohala Ranch (HI0000151).
- Keep 338 unresolved associations accessible in a separate expandable list of
  provider names, states and system IDs. Do not include their concentrations in
  primary result cards, summary counts or the assistant's concentration context.
- Explain unresolved-only searches as needing provider confirmation, not as no
  monitoring or no contamination. Provide a route to EPA records by system ID.
- Sort primary candidates alphabetically with system-ID tie breaking. PFAS levels
  and membership in a research cohort no longer affect provider order.
- Describe unflagged matches as possible providers and the release as archived EPA
  data. Neither label implies verified household service.

## Evidence and decision limits

Kohala Ranch is located on the island of Hawaii and serves the Ranch and nearby
communities. Its mainland ZIP associations are geographically incompatible with
local household service. The source associations remain archived; only their use
in the public locator changes.

Sources:
- https://cca.hawaii.gov/dca/water/
- https://kohalaranchhawaii.com/about/
- https://www.sjwater.com/water-source-map
- https://www.sjwater.com/customer-care/start-stop-or-transfer-service/does-sjw-service-my-locale

The coarse state screen flags 411 associations: 73 excluded and 338 unresolved.
Two audit-only prefix corrections (008 -> VI, 039 -> ME) remove 11 false positives
from the original 422-candidate screen. Source:
https://pe.usps.com/imm_archive/html/imm_archive_20090511/imm/immc2_003.htm

An earlier draft excluded another 36 associations for Bryan County RWD #2 and Clark
County PWSD #1. Those exclusions were withdrawn because regional service descriptions
were not sufficient to independently disprove every selected association. They
remain unresolved; supporting sources are retained under deferred_reviews.

A state mismatch is a screening signal, not an error verdict. Border systems,
tribal systems, purchased-water relationships and postal boundaries need individual
review. Unflagged same-state links can also be wrong. No national geographic
replacement or certification of service coverage is included.

Boundary provenance in the existing lookup: 6,714 System Sourced, 3,086 Modeled,
489 missing. Provenance alone does not establish current accuracy. Polygon overlap
must be independently evaluated for false additions and missing providers before
it can replace existing associations.

## Data integrity and maintenance

All original research exports, raw files, system records and concentrations remain
unchanged. The public review overlay is pinned to the exact lookup SHA-256 and
release ID. A missing file, wrong source hash or malformed review inventory blocks
lookup loading rather than bypassing the corrections. Browser hashing requires
HTTPS or localhost, matching production and local-preview use.

Update explicit decisions in config/zip-association-reviews.json with evidence and
a review date, then regenerate the audit and unresolved inventory:

    python3 analysis/scripts/18_audit_zip_associations.py --output qa/zip-association-review-2026-09-25.csv --update-pending

A new source release requires reviewing decisions and intentionally updating the
source checksum. Do not silently reuse the decisions with replacement source data.

## Separate measurement investigation

San Jose Water's Williams PFOS samples are <MRL on 2023-02-16 and 6.2 ppt on
2023-08-16, giving 3.1 ppt with nondetections treated as zero. PFHxS samples are
3.1 and 5.5 ppt, averaging 4.3 ppt; the saved EPA average export reports 4 ppt,
which the site preserves. This update does not revise those concentrations.
The ATSDR tool's missing UCMR5 result remains unexplained. This update must not be
represented as resolving that discrepancy or completing independent validation.

## Validation

Passed:
- ZIP review tests: exactly 73 excluded links; all other associations and all
  measurements preserved; pending inventory validation and border-candidate retention.
- Integration tests: exact-source hash rejection, mixed/uncertain-only results,
  English/Chinese rendering, neutral ordering and assistant isolation.
- Existing lookup tests across all 10,289 systems in English and Chinese.
- Frozen-release regression and deterministic assistant tests.
- Audit CSV and pending inventory exactly reproduce from the source/configuration.
- Real Chrome localhost checks for 95032, 42223, 01720 and 00000; Chinese switching
  and 390-pixel mobile rendering inspected. External requests blocked during testing.
- git diff --check.

No public deployment was performed during preparation. These changes improve
traceability and uncertainty handling, but do not guarantee complete coverage,
100% accuracy, absence of bias or zero risk.
