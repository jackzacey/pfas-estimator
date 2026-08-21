#!/usr/bin/env python3
"""Aggregate ACS/PDB block-group characteristics to CWS service areas."""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import sqlite3
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--cohort",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_cohort.csv",
    )
    parser.add_argument(
        "--crosswalk",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "epa_cws_block_group_crosswalk_ucmr5.csv.gz",
    )
    parser.add_argument(
        "--acs-database",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "acs2024_crosswalk_block_groups.sqlite",
    )
    parser.add_argument(
        "--pdb",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "pdb2024_crosswalk_block_groups.csv.gz",
    )
    parser.add_argument(
        "--pdb-ct-fallback",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "pdb2023_connecticut_crosswalk_block_groups.csv.gz",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=analysis_dir / "outputs",
    )
    return parser.parse_args()


def number(value: str | None) -> float | None:
    if value is None:
        return None
    value = str(value).strip()
    if not value or value.upper() in {"NA", "N/A", "NULL"}:
        return None
    return float(value)


def divide(numerator: float, denominator: float) -> float | None:
    return numerator / denominator if denominator > 0 else None


def read_cohort(path: Path) -> tuple[list[str], dict[str, dict[str, str]]]:
    rows: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fieldnames = reader.fieldnames or []
        for row in reader:
            rows[row["pwsid"]] = row
    return fieldnames, rows


def load_support_tables(
    connection: sqlite3.Connection,
    crosswalk: Path,
    pdb: Path,
    pdb_ct_fallback: Path,
) -> None:
    connection.execute("DROP TABLE IF EXISTS epa_crosswalk")
    connection.execute(
        """
        CREATE TABLE epa_crosswalk (
          geoid TEXT NOT NULL,
          pwsid TEXT NOT NULL,
          area_weight REAL,
          preferred_weight REAL,
          pop20_aw REAL,
          pop20_bw REAL,
          preferred_weight_source TEXT,
          boundary_provenance TEXT
        )
        """
    )
    insert_crosswalk = "INSERT INTO epa_crosswalk VALUES (?,?,?,?,?,?,?,?)"
    batch: list[tuple[Any, ...]] = []
    with gzip.open(crosswalk, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            batch.append((
                row["GEOID20"], row["PWSID"], number(row["Area_Weight"]),
                number(row["Preferred_Weight"]), number(row["Pop20_AW"]),
                number(row["Pop20_BW"]), row["Preferred_Weight_Source"],
                row["Boundary_Provenance"],
            ))
            if len(batch) >= 5000:
                connection.executemany(insert_crosswalk, batch)
                batch.clear()
        if batch:
            connection.executemany(insert_crosswalk, batch)
    connection.execute("CREATE INDEX idx_epa_crosswalk_geoid ON epa_crosswalk(geoid)")
    connection.execute("CREATE INDEX idx_epa_crosswalk_pwsid ON epa_crosswalk(pwsid)")

    connection.execute("DROP TABLE IF EXISTS pdb2024")
    connection.execute(
        """
        CREATE TABLE pdb2024 (
          geoid TEXT PRIMARY KEY,
          total_acs REAL, hispanic REAL, nh_white REAL, nh_black REAL,
          nh_aian REAL, nh_asian REAL, nh_nhopi REAL, nh_other REAL,
          nh_multi REAL, poverty_universe REAL, below_poverty REAL,
          median_hhi REAL, total_2020 REAL, urban_2020 REAL, rural_2020 REAL
        )
        """
    )
    insert_pdb = "INSERT INTO pdb2024 VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    batch.clear()
    with gzip.open(pdb, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            batch.append((
                row["GIDBG"],
                number(row["Tot_Population_ACS_18_22"]),
                number(row["Hispanic_ACS_18_22"]),
                number(row["NH_White_alone_ACS_18_22"]),
                number(row["NH_Blk_alone_ACS_18_22"]),
                number(row["NH_AIAN_alone_ACS_18_22"]),
                number(row["NH_Asian_alone_ACS_18_22"]),
                number(row["NH_NHOPI_alone_ACS_18_22"]),
                number(row["NH_SOR_alone_ACS_18_22"]),
                number(row["NH_Multi_Races_ACS_18_22"]),
                number(row["Pov_Univ_ACS_18_22"]),
                number(row["Prs_Blw_Pov_Lev_ACS_18_22"]),
                number(row["Med_HHD_Inc_BG_ACS_18_22"]),
                number(row["Tot_Population_CEN_2020"]),
                number(row["URBAN_POP_CEN_2020"]),
                number(row["RURAL_POP_CEN_2020"]),
            ))
            if len(batch) >= 5000:
                connection.executemany(insert_pdb, batch)
                batch.clear()
    if batch:
        connection.executemany(insert_pdb, batch)

    connection.execute("DROP TABLE IF EXISTS pdb2023_ct")
    connection.execute(
        """
        CREATE TABLE pdb2023_ct (
          geoid TEXT PRIMARY KEY,
          total_acs REAL, hispanic REAL, nh_white REAL, nh_black REAL,
          nh_aian REAL, nh_asian REAL, nh_nhopi REAL, nh_other REAL,
          nh_multi REAL, poverty_universe REAL, below_poverty REAL,
          median_hhi REAL, total_2020 REAL, urban_2020 REAL, rural_2020 REAL
        )
        """
    )
    insert_ct = "INSERT INTO pdb2023_ct VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
    batch.clear()
    with gzip.open(pdb_ct_fallback, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            batch.append((
                row["GIDBG"],
                number(row["Tot_Population_ACS_17_21"]),
                number(row["Hispanic_ACS_17_21"]),
                number(row["NH_White_alone_ACS_17_21"]),
                number(row["NH_Blk_alone_ACS_17_21"]),
                number(row["NH_AIAN_alone_ACS_17_21"]),
                number(row["NH_Asian_alone_ACS_17_21"]),
                number(row["NH_NHOPI_alone_ACS_17_21"]),
                number(row["NH_SOR_alone_ACS_17_21"]),
                number(row["NH_Multi_Races_ACS_17_21"]),
                number(row["Pov_Univ_ACS_17_21"]),
                number(row["Prs_Blw_Pov_Lev_ACS_17_21"]),
                number(row["Med_HHD_Inc_BG_ACS_17_21"]),
                number(row["Tot_Population_CEN_2020"]),
                number(row["URBAN_POP_CEN_2020"]),
                number(row["RURAL_POP_CEN_2020"]),
            ))
            if len(batch) >= 5000:
                connection.executemany(insert_ct, batch)
                batch.clear()
        if batch:
            connection.executemany(insert_ct, batch)
    connection.commit()


def accumulator() -> defaultdict[str, float]:
    return defaultdict(float)


def main() -> None:
    args = parse_args()
    for path in (
        args.cohort, args.crosswalk, args.acs_database, args.pdb,
        args.pdb_ct_fallback,
    ):
        if not path.is_file():
            raise FileNotFoundError(path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    cohort_fields, cohort = read_cohort(args.cohort)
    connection = sqlite3.connect(args.acs_database)
    load_support_tables(
        connection, args.crosswalk, args.pdb, args.pdb_ct_fallback
    )

    query = """
      SELECT
        x.pwsid, x.geoid, x.area_weight, x.preferred_weight,
        x.pop20_aw, x.pop20_bw, x.preferred_weight_source,
        r.B03002_E001, r.B03002_E003, r.B03002_E004, r.B03002_E005,
        r.B03002_E006, r.B03002_E007, r.B03002_E008, r.B03002_E009,
        r.B03002_E012,
        p.C17002_E001, p.C17002_E002, p.C17002_E003,
        e.B15003_E001,
        e.B15003_E002, e.B15003_E003, e.B15003_E004, e.B15003_E005,
        e.B15003_E006, e.B15003_E007, e.B15003_E008, e.B15003_E009,
        e.B15003_E010, e.B15003_E011, e.B15003_E012, e.B15003_E013,
        e.B15003_E014, e.B15003_E015, e.B15003_E016,
        i.B19013_E001, h.B11001_E001,
        d.total_acs, d.hispanic, d.nh_white, d.nh_black, d.nh_aian,
        d.nh_asian, d.nh_nhopi, d.nh_other, d.nh_multi,
        d.poverty_universe, d.below_poverty, d.median_hhi,
        d.total_2020, d.urban_2020, d.rural_2020,
        c.total_acs AS ct_total_acs,
        c.hispanic AS ct_hispanic,
        c.nh_white AS ct_nh_white,
        c.nh_black AS ct_nh_black,
        c.nh_aian AS ct_nh_aian,
        c.nh_asian AS ct_nh_asian,
        c.nh_nhopi AS ct_nh_nhopi,
        c.nh_other AS ct_nh_other,
        c.nh_multi AS ct_nh_multi,
        c.poverty_universe AS ct_poverty_universe,
        c.below_poverty AS ct_below_poverty,
        c.median_hhi AS ct_median_hhi,
        c.total_2020 AS ct_total_2020,
        c.urban_2020 AS ct_urban_2020,
        c.rural_2020 AS ct_rural_2020
      FROM epa_crosswalk x
      LEFT JOIN b03002 r ON r.geoid=x.geoid
      LEFT JOIN c17002 p ON p.geoid=x.geoid
      LEFT JOIN b15003 e ON e.geoid=x.geoid
      LEFT JOIN b19013 i ON i.geoid=x.geoid
      LEFT JOIN b11001 h ON h.geoid=x.geoid
      LEFT JOIN pdb2024 d ON d.geoid=x.geoid
      LEFT JOIN pdb2023_ct c ON c.geoid=x.geoid
      ORDER BY x.pwsid, x.geoid
    """

    columns = [description[0] for description in connection.execute(query).description]
    by_pws: dict[str, dict[str, defaultdict[str, float]]] = defaultdict(
        lambda: {"preferred": accumulator(), "area": accumulator()}
    )
    crosswalk_rows: Counter[str] = Counter()
    fallback_rows: Counter[str] = Counter()
    ct_fallback_rows: Counter[str] = Counter()
    missing_rows: Counter[str] = Counter()

    for values in connection.execute(query):
        row = dict(zip(columns, values))
        pwsid = row["pwsid"]
        crosswalk_rows[pwsid] += 1
        latest = row["B03002_E001"] is not None
        current_fallback = not latest and row["total_acs"] is not None
        ct_fallback = (
            not latest
            and not current_fallback
            and row["ct_total_acs"] is not None
        )
        fallback = current_fallback or ct_fallback
        if fallback:
            fallback_rows[pwsid] += 1
        if ct_fallback:
            ct_fallback_rows[pwsid] += 1
        if not latest and not fallback:
            missing_rows[pwsid] += 1

        def fallback_value(field: str) -> float | None:
            return row[field] if current_fallback else row[f"ct_{field}"]

        latest_education = row["B15003_E001"] is not None
        no_hs = (
            sum(row[f"B15003_E{line:03d}"] or 0 for line in range(2, 17))
            if latest_education else None
        )

        characteristics = {
            "total": row["B03002_E001"] if latest else fallback_value("total_acs"),
            "hispanic": row["B03002_E012"] if latest else fallback_value("hispanic"),
            "nh_white": row["B03002_E003"] if latest else fallback_value("nh_white"),
            "nh_black": row["B03002_E004"] if latest else fallback_value("nh_black"),
            "nh_aian": row["B03002_E005"] if latest else fallback_value("nh_aian"),
            "nh_asian": row["B03002_E006"] if latest else fallback_value("nh_asian"),
            "nh_nhopi": row["B03002_E007"] if latest else fallback_value("nh_nhopi"),
            "nh_other": row["B03002_E008"] if latest else fallback_value("nh_other"),
            "nh_multi": row["B03002_E009"] if latest else fallback_value("nh_multi"),
            "poverty_universe": row["C17002_E001"] if latest else fallback_value("poverty_universe"),
            "below_poverty": (
                (row["C17002_E002"] or 0) + (row["C17002_E003"] or 0)
                if latest else fallback_value("below_poverty")
            ),
            "education_universe": row["B15003_E001"] if latest_education else None,
            "no_hs": no_hs,
            "median_hhi": row["B19013_E001"] if latest else fallback_value("median_hhi"),
            "households": row["B11001_E001"] if latest else None,
            "rural_total": row["total_2020"] if row["total_2020"] is not None else row["ct_total_2020"],
            "rural": row["rural_2020"] if row["rural_2020"] is not None else row["ct_rural_2020"],
        }

        for method, weight_name, pop20_name in (
            ("preferred", "preferred_weight", "pop20_bw"),
            ("area", "area_weight", "pop20_aw"),
        ):
            sums = by_pws[pwsid][method]
            weight = row[weight_name]
            if weight is None:
                continue
            pop20 = row[pop20_name]
            if method == "preferred" and pop20 is None:
                pop20 = row["pop20_aw"]
            if pop20 is not None:
                sums["coverage_population_total"] += pop20
                source = "latest" if latest else "fallback" if fallback else "missing"
                sums[f"coverage_population_{source}"] += pop20

            for characteristic in (
                "total", "hispanic", "nh_white", "nh_black", "nh_aian",
                "nh_asian", "nh_nhopi", "nh_other", "nh_multi",
                "poverty_universe", "below_poverty", "education_universe", "no_hs",
                "rural_total", "rural",
            ):
                value = characteristics[characteristic]
                if value is not None:
                    sums[characteristic] += weight * value
            hhi = characteristics["median_hhi"]
            total = characteristics["total"]
            if hhi is not None and total is not None and hhi >= 0 and total > 0:
                sums["hhi_weighted_sum"] += weight * total * hhi
                sums["hhi_population_weight"] += weight * total

    connection.close()

    demographic_fields: list[str] = [
        "demographic_crosswalk_row_count", "demographic_fallback_row_count",
        "demographic_ct_fallback_row_count", "demographic_missing_row_count",
        "demographic_source_category",
    ]
    metric_names = [
        "acs_estimated_population", "pct_hispanic", "pct_nh_white", "pct_nh_black",
        "pct_nh_aian", "pct_nh_asian", "pct_nh_nhopi", "pct_nh_other",
        "pct_nh_multiracial", "pct_below_poverty", "pct_without_hs_diploma",
        "population_weighted_bg_median_hhi", "pct_rural",
        "latest_population_coverage_fraction", "fallback_population_coverage_fraction",
        "missing_population_coverage_fraction",
    ]
    for method in ("preferred", "area"):
        demographic_fields.extend(f"{metric}_{method}" for metric in metric_names)
    demographic_fields.extend([
        "primary_demographic_model_cohort",
        "latest_only_demographic_sensitivity_cohort",
    ])

    output_rows: list[dict[str, Any]] = []
    source_categories: Counter[str] = Counter()
    for pwsid, cohort_row in cohort.items():
        row: dict[str, Any] = dict(cohort_row)
        if pwsid not in by_pws:
            row.update({field: "" for field in demographic_fields})
            row["demographic_crosswalk_row_count"] = 0
            row["demographic_source_category"] = "no_crosswalk"
            row["primary_demographic_model_cohort"] = 0
            row["latest_only_demographic_sensitivity_cohort"] = 0
            source_categories["no_crosswalk"] += 1
            output_rows.append(row)
            continue

        row["demographic_crosswalk_row_count"] = crosswalk_rows[pwsid]
        row["demographic_fallback_row_count"] = fallback_rows[pwsid]
        row["demographic_ct_fallback_row_count"] = ct_fallback_rows[pwsid]
        row["demographic_missing_row_count"] = missing_rows[pwsid]
        has_fallback = fallback_rows[pwsid] > 0
        has_missing = missing_rows[pwsid] > 0
        category = (
            "partial_missing" if has_missing
            else "latest_plus_fallback" if has_fallback
            else "latest_only"
        )
        row["demographic_source_category"] = category
        source_categories[category] += 1

        for method in ("preferred", "area"):
            sums = by_pws[pwsid][method]
            row[f"acs_estimated_population_{method}"] = sums["total"] or ""
            for field, numerator in (
                ("pct_hispanic", "hispanic"), ("pct_nh_white", "nh_white"),
                ("pct_nh_black", "nh_black"), ("pct_nh_aian", "nh_aian"),
                ("pct_nh_asian", "nh_asian"), ("pct_nh_nhopi", "nh_nhopi"),
                ("pct_nh_other", "nh_other"), ("pct_nh_multiracial", "nh_multi"),
            ):
                row[f"{field}_{method}"] = divide(sums[numerator], sums["total"])
            row[f"pct_below_poverty_{method}"] = divide(
                sums["below_poverty"], sums["poverty_universe"]
            )
            row[f"pct_without_hs_diploma_{method}"] = divide(
                sums["no_hs"], sums["education_universe"]
            )
            row[f"population_weighted_bg_median_hhi_{method}"] = divide(
                sums["hhi_weighted_sum"], sums["hhi_population_weight"]
            )
            row[f"pct_rural_{method}"] = divide(sums["rural"], sums["rural_total"])
            coverage_total = sums["coverage_population_total"]
            for source in ("latest", "fallback", "missing"):
                row[f"{source}_population_coverage_fraction_{method}"] = divide(
                    sums[f"coverage_population_{source}"], coverage_total
                )

        usable_fraction = 1 - float(row.get("missing_population_coverage_fraction_preferred") or 0)
        latest_fraction = float(row.get("latest_population_coverage_fraction_preferred") or 0)
        has_primary_metrics = all(
            row.get(field) not in (None, "")
            for field in (
                "pct_hispanic_preferred", "pct_nh_black_preferred",
                "pct_nh_aian_preferred", "pct_below_poverty_preferred",
                "pct_rural_preferred",
            )
        )
        row["primary_demographic_model_cohort"] = int(
            row["primary_occurrence_cohort"] == "1"
            and usable_fraction >= 0.90
            and has_primary_metrics
        )
        row["latest_only_demographic_sensitivity_cohort"] = int(
            row["primary_occurrence_cohort"] == "1"
            and latest_fraction >= 0.90
            and not has_fallback
            and not has_missing
            and has_primary_metrics
        )
        output_rows.append(row)

    output_fields = [*cohort_fields, *demographic_fields]
    output_path = args.output_dir / "ucmr5_system_analysis_with_demographics.csv"
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(output_rows)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "systems": len(output_rows),
        "systems_by_demographic_source": dict(source_categories),
        "primary_demographic_model_cohort": sum(
            int(row["primary_demographic_model_cohort"]) for row in output_rows
        ),
        "latest_only_demographic_sensitivity_cohort": sum(
            int(row["latest_only_demographic_sensitivity_cohort"]) for row in output_rows
        ),
        "minimum_population_coverage_for_model": 0.90,
        "primary_weight": "EPA building-footprint weight with documented area fallback",
        "sensitivity_weight": "EPA area weight",
        "connecticut_fallback": (
            "2023 Planning Database (2017-2021 ACS plus 2020 Census) on original "
            "2020 block-group GEOIDs; fallback use is explicitly flagged"
        ),
        "interpretation": (
            "System-level ecological characteristics; not individual attributes. "
            "Race/ethnicity variables are structural markers, not biological traits."
        ),
    }
    report_path = args.output_dir / "ucmr5_system_demographic_aggregation_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
