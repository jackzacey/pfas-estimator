# System-level state pages

The state directory and state-detail pages are generated from the frozen website exports in:

`analysis/exports/ucmr5_jan2026_v0_2/`

They do not use `data.js`, ZIP maxima, detection-only denominators, or duplicated system-to-ZIP records.

## Rebuild

From the repository root:

```sh
python3 build_state_pages.py --dry-run
python3 build_state_pages.py
```

The dry run verifies all state and territory denominators and comparison counts before any published page is replaced. The full build generates the state directory, 56 state and territory pages, and the sitemap.

## Units and denominators

- Unit: unique public water system identified by PWSID.
- Denominator: active community water systems with complete UCMR 5 monitoring in each state or territory.
- Numerator: systems with at least one complete-set sampling location meeting the named EPA January 2026 technical comparison.
- ZIP codes: lookup routes only; never a state-page denominator.

The generated pages reconcile to 8,936 eligible complete-monitoring community water systems and 1,030 systems meeting at least one April 2024 comparison.

## Preserved interface

The generator retains the existing state-card directory, regional filters, search box, hero layout, summary cards, sortable-style tables, navigation, and state-detail visual language. It replaces only the legacy calculations, labels, and rows.

## Automatic safeguards

The builder refuses to publish if:

- release identifiers differ across website exports;
- a state denominator differs from the unique eligible-system rows;
- any compound-specific system count differs from the frozen state summary;
- national totals do not reconcile to 8,936 and 1,030;
- unresolved template values or legacy ZIP-analysis language remain.

Pages are built and validated in a temporary directory before the `states/` directory is replaced.
