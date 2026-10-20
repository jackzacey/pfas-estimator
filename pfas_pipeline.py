"""
PFAS Estimator — Data Analysis Pipeline
Reproduces all findings reported in:

"PFAS Contamination in U.S. Community Water Systems: A National ZIP Code-Level
Analysis of EPA UCMR 5 Data with a Clinical Translation Framework"

Jack Zhang, jackzacey@gmail.com
pfasestimator.org

Data source: EPA UCMR 5 (2023-2025), publicly available at:
https://www.epa.gov/dwucmr/occurrence-data-unregulated-contaminant-monitoring-rule

This script reads data.js (the processed UCMR 5 dataset) and reproduces
all statistics reported in the manuscript abstract and results section.
See Methods section of the manuscript for full pipeline description.
"""

import json
import statistics
import sys

# ── Load data ──────────────────────────────────────────────────────────────────

def load_data(path='data.js'):
    with open(path, 'r') as f:
        raw = f.read()
    json_str = raw.replace('const DATA = ', '', 1).rstrip().rstrip(';').strip()
    return json.loads(json_str)

# ── MCL thresholds (µg/L) ──────────────────────────────────────────────────────
# Source: EPA NPDWR, April 2024
# PFOA, PFOS: individual MCLs of 0.004 µg/L (4 ppt)
# PFHxS, PFNA, HFPO-DA: individual MCLs of 0.010 µg/L (10 ppt)
# PFBS: regulated via Hazard Index; individual reference level 2.0 µg/L
# Note: EPA defines exceedance as "at or above" the MCL

MCLS = {
    'PFOA':    0.004,
    'PFOS':    0.004,
    'PFHxS':   0.010,
    'PFNA':    0.010,
    'HFPO-DA': 0.010,
    'PFBS':    2.0,
}

# ── Analysis ───────────────────────────────────────────────────────────────────

def analyze(data):
    all_records = [r for records in data.values() for r in records]
    total_zips = len(data)
    total_records = len(all_records)
    compounds = sorted(set(r['compound'] for r in all_records))
    systems = set(r['sys'] for r in all_records)

    print("=" * 60)
    print("DATASET SUMMARY")
    print("=" * 60)
    print(f"Total ZIP codes with detections:  {total_zips:,}")
    print(f"Total compound-level records:      {total_records:,}")
    print(f"Unique compounds:                  {len(compounds)}")
    print(f"Unique water systems:              {len(systems):,}")
    print(f"Compounds: {compounds}")

    # ── Headline exceedance finding ────────────────────────────────────────────
    # EPA standard: at or above MCL counts as exceedance
    zips_exceed = set()
    for zip_code, records in data.items():
        for r in records:
            if r['compound'] in MCLS and r['level'] >= MCLS[r['compound']]:
                zips_exceed.add(zip_code)

    print("\n" + "=" * 60)
    print("HEADLINE FINDING")
    print("=" * 60)
    print(f"ZIP codes with >= 1 compound at or above MCL: "
          f"{len(zips_exceed):,} of {total_zips:,} "
          f"({round(len(zips_exceed)/total_zips*100, 1)}%)")

    # ── Per-compound analysis ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("PER-COMPOUND RESULTS")
    print("=" * 60)

    for compound in compounds:
        vals = [r['level'] for r in all_records if r['compound'] == compound]
        detected_zips = sum(
            1 for records in data.values()
            if any(r['compound'] == compound for r in records)
        )
        pct_of_total = round(detected_zips / total_zips * 100, 1)
        mean_val = round(statistics.mean(vals), 6)
        max_val = max(vals)

        if compound in MCLS:
            exceed_zips = sum(
                1 for records in data.values()
                if any(r['compound'] == compound and r['level'] >= MCLS[compound]
                       for r in records)
            )
            exceed_pct = round(exceed_zips / detected_zips * 100, 1)
            print(f"\n{compound}")
            print(f"  MCL/threshold:       {MCLS[compound]} µg/L")
            print(f"  Detected ZIP codes:  {detected_zips:,} ({pct_of_total}% of dataset)")
            print(f"  Exceed MCL:          {exceed_zips:,} of {detected_zips:,} "
                  f"detected ZIPs ({exceed_pct}%)")
            print(f"  Mean concentration:  {mean_val} µg/L")
            print(f"  Peak concentration:  {max_val} µg/L")
            if compound in ('PFOA', 'PFOS'):
                print(f"  NOTE: MRL ({MCLS[compound]} µg/L) = MCL. "
                      f"Detection prevalence reported rather than exceedance rate.")
        else:
            print(f"\n{compound} [no federal MCL]")
            print(f"  Detected ZIP codes:  {detected_zips:,} ({pct_of_total}% of dataset)")
            print(f"  Mean concentration:  {mean_val} µg/L")
            print(f"  Peak concentration:  {max_val} µg/L")

    # ── Data integrity checks ──────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("DATA INTEGRITY CHECKS")
    print("=" * 60)

    # Confirm highest-value-only (no duplicates per compound per ZIP)
    multi = sum(
        1 for records in data.values()
        for compound in set(r['compound'] for r in records)
        if sum(1 for r in records if r['compound'] == compound) > 1
    )
    print(f"ZIP codes with duplicate compound readings: {multi} "
          f"(expected 0 — highest value already retained)")

    # Confirm no non-detections
    zero_vals = sum(1 for r in all_records if r['level'] == 0)
    print(f"Zero-value records (non-detections): {zero_vals} (expected 0 — excluded in pipeline)")

if __name__ == '__main__':
    path = sys.argv[1] if len(sys.argv) > 1 else 'data.js'
    print(f"Loading data from: {path}\n")
    data = load_data(path)
    analyze(data)
