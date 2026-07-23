# PFAS Estimator — State Page Build System

## What this is

An automated system that generates SEO-friendly, static state-level PFAS
drinking-water pages from `data.js` — the same file that powers the main
ZIP-lookup tool. You maintain one script and one template, not 52 pages.

## Rebuild workflow

```bash
python3 build_state_pages.py                 # validate + publish
python3 build_state_pages.py --dry-run        # validate only, no changes written
```

Run this from the repo root (or pass `--repo-root /path/to/pfas-estimator`).
When `data.js` is updated after a future UCMR refresh, this is the only
command you need to run to regenerate every state page, the state index,
and the sitemap.

## Files added

```
build_state_pages.py              # the build script
config/
  thresholds.json                 # per-compound methodology, mirrors AJPH Table 1 exactly
  state_names.json                # abbrev -> full state name (for slugs/titles)
  zip_to_state.json               # copy of the crosswalk already in index.html (see below)
  site_meta.json                  # base URL, data-updated label, exclusions
templates/
  state_page_template.html        # single reusable template, {{TOKEN}} placeholders
states/                           # GENERATED — do not hand-edit, will be overwritten
  index.html
  california-pfas-drinking-water/index.html
  ... (52 total)
sitemap.xml                       # regenerated: homepage + /states/ + every state page
styles.css                        # NEW — extracted from index.html's inline <style> block
```

## Files modified

- **`index.html`**:
  1. Inline `<style>` block replaced with `<link rel="stylesheet" href="styles.css">`,
     so state pages can share the same styling without duplicating ~16KB of CSS
     into 52 separate files.
  2. Added `?zip=` query-param support (`?zip=90210` pre-fills and runs the
     lookup automatically) — this is what state pages link to, so "look up a
     ZIP code" is a real deep link, not just a link to the homepage.
  3. Fixed a **pre-existing bug**: ZIP 96543 (Andersen Air Force Base, Guam)
     had no entry in `ZIP_TO_STATE`, so it was silently dropped from the
     live map's state aggregation. Added `"965":"GU"`.

## Why the numbers are trustworthy

The existing client-side `buildStateMapData()` function (used by the map
view) computes one *blended* percentage across all 12 compounds mixed
together — which isn't meaningful (it averages PFOA's ~0.01 µg/L scale
with lithium's ~50 µg/L scale into one number) and doesn't distinguish
compounds where "exceedance" isn't a valid concept (PFBS, lithium).

This build script does **not** reuse that logic. It computes true
per-compound statistics directly from `data.js`, applying the exact same
per-compound rules frozen in the manuscript's Table 1:

| Compound | Method |
|---|---|
| PFOA, PFOS | Detection prevalence reported as "at/above limit" (reporting limit == MCL by construction) |
| PFHxS, PFNA, HFPO-DA | True MCL exceedance (`level >= limit`) |
| PFBS | Detection prevalence only — Hazard Index not calculated (dataset lacks co-located sample-event readings) |
| Lithium | Detection prevalence at/above 7.36 µg/L, explicitly framed as an evidence-based reference, **not** a regulatory threshold |
| PFPeA, PFBA, PFHpA, 6:2 FTS, PFDA | Detection prevalence only, no federal reference |

**This was verified to reconcile exactly against your frozen manuscript
numbers before any pages were generated:** summing the per-state "ZIPs with
≥1 regulated compound at/above threshold" across all 52 generated pages
gives 5,059 of 14,070 ZIPs (the one Guam ZIP is excluded from generation;
see below) — matching the manuscript's 5,059/14,071 (36.0%) exactly, as
does the 3,186 (63.0%) "more than one compound" figure. The build script's
`validate_build()` function re-checks this automatically on every run and
**refuses to publish** if the numbers stop reconciling.

## Guam was excluded from page generation

`data.js` contains exactly one ZIP code in Guam (96543, Andersen Air Force
Base, one PFHxS record at 0.0034 µg/L — below threshold). A one-ZIP "state"
page has nothing to summarize and would read as padding rather than
information, so it's excluded from `states/` generation via
`config/site_meta.json` → `excluded_from_generation`. The underlying crosswalk
bug that silently dropped this ZIP from the live map has been fixed
regardless (see above) — this is just about whether to generate a page for
it, not about data completeness. Reverse this by removing `"GU"` from that
config list if you'd rather have the page.

## Validation checks (run automatically, every build)

- National totals (ZIP count, exceedance count, multi-exceedance count)
  reconcile exactly against the frozen manuscript figures
- No duplicate canonical URLs across all 52 pages
- No unresolved `{{TOKEN}}` placeholders left in any generated HTML
- No literal `undefined`/`NaN` in any generated HTML
- Every percentage falls between 0 and 100
- No compound's detected-ZIP or exceedance count exceeds its state's total ZIP count
- Stale generated pages (states no longer in the dataset) are detected,
  reported, and removed
- Pages are built into a temporary directory and only swap into the live
  `states/` directory after every check above passes — a failed validation
  never touches the live site

## What's intentionally deferred

- **Agency links** (state drinking-water agency URLs) — stubbed as an empty
  `AGENCY_LINK_ROW` token. You said "later" — when ready, add a
  `config/agency_links.json` (`{"CA": "https://...", ...}`) and wire it into
  `main()`; the template already has the insertion point.
- **`pfas_pipeline.py`** was not touched or required for this system. The
  dataset is frozen for AJPH submission; this script treats `data.js` as
  static input. If/when UCMR 6 data eventually replaces it, the same
  `python3 build_state_pages.py` command regenerates everything from the
  new `data.js` with no other changes needed.

## Deployment note

You mentioned GitHub for files with a Squarespace-managed domain — that
setup (GitHub Pages + external DNS) serves folder URLs like
`/states/california-pfas-drinking-water/` natively via each folder's
`index.html`, so no rewrite rules are needed. Just commit the `states/`
directory, `styles.css`, the updated `index.html`, and `sitemap.xml`.

## Known limitations, stated honestly

- Per-state ZIP tables are capped at 2,000 rows for performance (no state
  currently approaches this — Texas, the largest, has 1,356 ZIPs).
- `zip_to_state.json` is a copy of the crosswalk in `index.html`, not a
  live import — if you ever edit one, edit the other, or wire this script
  to parse it directly out of `index.html` instead of keeping a duplicate.
  Flagging this now rather than silently letting two copies drift apart.
