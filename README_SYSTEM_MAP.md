# Water-system map

The system map reuses the final August 2026 website lookup, monitoring periods,
and sampling-location evidence. It does not change measurements, comparison
flags, ZIP associations, or the archived research analysis.

## Geography and coverage

`data/system-map-locations.json` is an exact-PWSID join to the EPA community
water-system service-area layer. Centroids were retrieved November 8, 2026.
9,817 of 10,307 lookup systems have usable coordinates; the 490 remaining
systems can still be found by name or ID and opened directly. They are not
placed at ZIP centers, administrative addresses, or guessed locations.

One approximate marker represents each system, independent of the number of
associated ZIP codes. The EPA service-area centroid is not a sampling location
or a guarantee that the marker lies inside every disconnected service polygon.
For the one ID with multiple geometry records, the largest area is selected
deterministically; records are not averaged together. The data audit lists that
ID, unmatched IDs, state coverage, and provenance. Modeled boundaries and
water-system-supplied boundaries retain their source labels. Communities served
come from the August 12, 2026 ECHO/SDWIS snapshot used by the existing project.
Missing communities are labeled as unreported rather than inferred from names.

Source: https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas

## Interpretation

- Summary colors reuse the published exceedance flags, including the mixture
  index. A positive flag takes precedence over incomplete coverage.
- The blue category requires complete comparisons at every archived location
  across all six outcomes. Partial coverage with no positive flag is gray.
- Concentration mode offers the five individual chemicals, with the same highest
  complete-location average and micrograms/liter-to-parts-per-trillion conversion
  as the detailed lookup. The mixture index is not a concentration.
- Incomplete selected-chemical comparisons are gray even when some valid annual
  averages exist. A zero from below-reporting-level substitution is displayed as
  "below [reporting limit]", never as a measured zero.
- Cluster numbers count systems, not detections or average concentrations.
- Summary cutoffs remain the frozen research comparisons; neither mode measures
  current household exposure, compliance, or safety.

`/?system=PWSID#result` opens exactly one system using the existing result renderer
without inventing a ZIP match. It preserves provider-confirmation guidance,
sampling dates, incomplete sample context, bilingual rendering, printing, and
assistant context. These views do not increment the ZIP-search counter.

## Rebuild and verification

Run `build_system_map.py --snapshot PATH --cities PATH` to reproduce the sidecar
from a frozen EPA response and the archived SDWIS CSV. Add `--fetch` only when
intentionally refreshing geography. The source snapshot, batch cache, and audit
for this implementation are saved outside the repository in
`/Users/jackzhang/Documents/Codex/2026-11-08/system-map/`.
The output records hashes for the lookup, geography snapshot, and city input.

Run `node --test tests/*.test.js`. Map tests validate every system's scientific
classification, all coordinates and IDs, missing-geometry accounting, units,
nondetects, direct selections, language changes, and transitions back to ZIP
searches. Browser checks cover mobile wrapping, Hawaii filtering, unknown
geography, concentration selection, state overview, fullscreen, and result links.

Leaflet 1.9.4 and Leaflet.markercluster 1.5.3 are vendored with licenses. Map tiles
load on demand from OpenStreetMap with attribution; there is no tile prefetch or
offline download. They are an external basemap dependency, while the markers and
scientific data are served locally with the site. Existing D3/state-map behavior
is preserved behind the state overview toggle.
