# AJPH research pipeline

This directory contains the reproducible analysis that will become the scientific source of truth for the manuscript and website.

The existing root-level `data.js` is a legacy display dataset. It contains selected, detection-only ZIP-level maxima and is not suitable for national prevalence, annual-average, Hazard Index, disparity, or compliance analyses.

## Design rule

The pipeline produces versioned derived tables. The manuscript, supplement, figures, and website must all consume those same outputs. The website may make those outputs easier to explore, but it must not calculate or redefine the study findings independently.

## Current inputs

The January 15, 2026 UCMR 5 release is currently available locally at:

```text
/Users/jackzhang/Downloads/ucmr5-occurrence-data/
```

Raw files are not committed. Each run records file hashes, sizes, row counts, and modification times.

## First audit

Run:

```bash
python3 analysis/scripts/01_audit_ucmr5.py \
  --all /Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_All.txt \
  --additional /Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_AddtlDataElem.txt \
  --zip /Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_ZIPCodes.txt
```

This creates untracked outputs in `analysis/outputs/` and performs no benchmark or health-risk classification.

## Planned stages

1. Audit and freeze source data.
2. Reconstruct and validate complete sampling-location monitoring sets.
3. Reproduce EPA annual-average and Hazard Index indicators.
4. Link CWSs to EPA service-area version 3 and SDWIS characteristics.
5. Interpolate 2020–2024 ACS characteristics to service areas.
6. Run prespecified descriptive, weighted, disparity, policy, and sensitivity analyses.
7. Export website-ready tables from the locked analysis outputs.

## Service-area attribute linkage

Run:

```bash
python3 analysis/scripts/03_fetch_cws_service_areas.py \
  --ucmr-all /Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_All.txt
```

This freezes the official EPA service-layer attributes, links UCMR PWSIDs to the
CWS universe, and records boundary provenance. Polygon geometry is fetched in a
later stage only for eligible systems used in the Census overlay.

## EPA-derived location averages

Export the unfiltered **Average PFAS Results** sheet from EPA's UCMR 5 Data
Finder, freeze it under `analysis/data/raw/`, and run:

```bash
python3 analysis/scripts/04_normalize_epa_average_export.py \
  --xlsx analysis/data/raw/epa_ucmr5_average_pfas_results_jan2026.xlsx
```

This preserves EPA's derived location averages as the primary benchmark source,
normalizes the export to one row per sampling location, and validates all PWS
counts against table 4 of the January 2026 Data Summary. The raw-record
reconstruction remains a transparent cross-check and duplicate-record audit.

## SDWIS system characteristics

Freeze EPA ECHO's current `SDWA_system_search_download.zip` under
`analysis/data/raw/`, then run:

```bash
python3 analysis/scripts/05_link_sdwis_system_metadata.py \
  --ucmr-all /Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_All.txt \
  --sdwis-zip analysis/data/raw/SDWA_system_search_download_2026-08-12.zip
```

This links exact PWSIDs to current system type, activity, population served,
source water, ownership, and other prespecified system characteristics.

## PWS-level analytic cohort

After stages 3–5, run:

```bash
python3 analysis/scripts/06_build_system_analysis_cohort.py
```

The result is one row per PWS with EPA-derived benchmark outcomes, SDWIS system
characteristics, service-boundary provenance, and explicit occurrence- and
demographic-cohort inclusion flags.

## Service-area geometry and Census crosswalk

Full polygon download is optional and is not required for the current
statistical pipeline. If a future analysis needs locally frozen polygons, run:

```bash
python3 analysis/scripts/07_fetch_analysis_service_geometries.py
```

This downloads only the service-area polygons for systems admitted to the
demographic cohort, verifies every OBJECTID/PWSID pair, and stores a compressed,
hashed GeoJSON snapshot.

The current statistical linkage uses EPA's stronger precomputed CWS-to-Census
crosswalk from the versioned archive. Extract the analytic subset with:

```bash
python3 analysis/scripts/08_extract_epa_census_crosswalk.py
```

Building-footprint weights are primary because they better approximate the
residential share of a block group inside each service area. Area weights are
retained for sensitivity analysis and as a documented fallback.

## Freeze ACS block-group characteristics

Run:

```bash
python3 analysis/scripts/09_fetch_filter_acs2024.py
```

This downloads the official table-based 2020–2024 ACS 5-year files needed for
the prespecified race/ethnicity, poverty, education, and household-income
measures; records full source hashes; and retains estimates and margins of error
for only the block groups appearing in EPA's crosswalk.

To obtain 2020 urban/rural counts and a geography-aligned fallback for 2020
GEOIDs absent from the current ACS, run:

```bash
python3 analysis/scripts/10_fetch_filter_planning_database.py
```

The Census 2024 Planning Database uses 2020 block-group geography and 2018–2022
ACS estimates. Current Census products use Connecticut's new planning-region
county equivalents, while EPA's crosswalk retains original 2020 GEOIDs. Freeze
the official older, aligned Connecticut values with:

```bash
/Users/jackzhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  analysis/scripts/10b_fetch_filter_pdb2023_connecticut.py
```

That Connecticut-only fallback uses the 2023 Planning Database (2017–2021 ACS
plus 2020 Census) and is explicitly flagged. A latest-only sensitivity excludes
all systems requiring either older-vintage fallback.

## Aggregate service-area demographics

Run:

```bash
python3 analysis/scripts/11_aggregate_system_demographics.py
```

This applies EPA building and area weights, aggregates counts before calculating
percentages, records latest/fallback/missing population coverage, and creates
explicit primary and latest-only demographic-model cohorts.

## Primary disparity models

Use the bundled scientific Python runtime and run:

```bash
/Users/jackzhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  analysis/scripts/12_run_primary_models.py
```

The script limits primary inference to census-monitored CWSs serving at least
3,300 people, fits modified-Poisson models with state-clustered robust variance,
reports numerator/denominator descriptive quartiles, and repeats the model with
area weights, a strict latest-only cohort, authoritative system-sourced
boundaries, and the explicitly unweighted full monitored CWS sample. It also
runs staged exposure models, leave-one-EPA-region-out checks, source- and
size-stratified checks, and FDR-controlled secondary outcome models when event
counts and convergence permit.

## Spatial diagnostics and uncertainty

Freeze exact service-area centroids, calculate permutation-based Moran's I for
the primary model residuals, and compute spatial-HAC uncertainty with:

```bash
/Users/jackzhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  analysis/scripts/13_fetch_service_area_centroids.py

/Users/jackzhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  analysis/scripts/14_spatial_residual_diagnostics.py

python3 analysis/scripts/15_spatial_hac_inference.py
```

The final command uses SciPy's spherical neighbor search and sparse matrices.
It leaves the modified-Poisson coefficients unchanged and reports spatial-HAC
standard errors using a primary 250-km Bartlett kernel plus 100- and 500-km
cutoff sensitivities.

Run focused regression tests with:

```bash
/Users/jackzhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 \
  -m unittest discover -s analysis/tests -v
```
