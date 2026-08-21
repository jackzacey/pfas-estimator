#!/usr/bin/env python3
"""Build the PWS-level UCMR analytic cohort from frozen derived inputs."""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


OUTCOMES = ("pfoa", "pfos", "pfhxs", "pfna", "hfpo_da", "hi")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--location-averages",
        type=Path,
        default=analysis_dir / "outputs" / "epa_ucmr5_average_pfas_locations.csv",
    )
    parser.add_argument(
        "--sdwis",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_sdwis_system_metadata.csv",
    )
    parser.add_argument(
        "--service-areas",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_cws_service_area_attributes.csv",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=analysis_dir / "outputs",
    )
    return parser.parse_args()


def read_by_pwsid(path: Path) -> dict[str, dict[str, str]]:
    rows: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            pwsid = row["pwsid"].strip()
            if pwsid in rows:
                raise ValueError(f"Duplicate pwsid in {path}: {pwsid}")
            rows[pwsid] = row
    return rows


def as_int(value: str) -> int | None:
    value = value.strip()
    return int(value) if value else None


def as_float(value: str) -> float | None:
    value = value.strip()
    return float(value) if value else None


def main() -> None:
    args = parse_args()
    for path in (args.location_averages, args.sdwis, args.service_areas):
        if not path.is_file():
            raise FileNotFoundError(path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    sdwis = read_by_pwsid(args.sdwis)
    service_areas = read_by_pwsid(args.service_areas)

    pws_rows: dict[str, dict[str, Any]] = {}
    pws_locations: Counter[str] = Counter()
    outcome_full: dict[str, Counter[str]] = {outcome: Counter() for outcome in OUTCOMES}
    outcome_above: dict[str, Counter[str]] = {outcome: Counter() for outcome in OUTCOMES}
    outcome_records: dict[str, Counter[str]] = {outcome: Counter() for outcome in OUTCOMES}
    outcome_max: dict[str, dict[str, float]] = {outcome: {} for outcome in OUTCOMES}

    with args.location_averages.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for location in reader:
            pwsid = location["pwsid"].strip()
            location_metadata = {
                "pwsid": pwsid,
                "ucmr_pws_name": location["pws_name"],
                "ucmr_size": location["pws_size"],
                "ucmr_state": location["state"],
                "ucmr_epa_region": location["epa_region"],
            }
            prior = pws_rows.setdefault(pwsid, location_metadata)
            if prior != location_metadata:
                raise ValueError(f"Conflicting location metadata for {pwsid}")
            pws_locations[pwsid] += 1
            for outcome in OUTCOMES:
                present = as_int(location[f"{outcome}_record_present"])
                full = as_int(location[f"{outcome}_full_set"])
                above = as_int(location[f"{outcome}_above_mcl_comparison"])
                average = as_float(location[f"{outcome}_average_result"])
                outcome_records[outcome][pwsid] += int(present == 1)
                outcome_full[outcome][pwsid] += int(full == 1)
                outcome_above[outcome][pwsid] += int(above == 1)
                if average is not None:
                    outcome_max[outcome][pwsid] = max(
                        average,
                        outcome_max[outcome].get(pwsid, float("-inf")),
                    )

    analytic_rows: list[dict[str, Any]] = []
    exclusion_counts: Counter[str] = Counter()
    for pwsid in sorted(pws_rows):
        if pwsid not in sdwis:
            raise ValueError(f"EPA average PWS missing from SDWIS linkage: {pwsid}")
        base = dict(pws_rows[pwsid])
        system = sdwis[pwsid]
        boundary = service_areas.get(pwsid)
        row: dict[str, Any] = {
            **base,
            "sampling_location_count": pws_locations[pwsid],
            "sdwis_pws_name": system["pws_name"],
            "sdwis_state_code": system["state_code"],
            "sdwis_epa_region": system["epa_region"],
            "pws_type_code": system["pws_type_code"],
            "pws_type_desc": system["pws_type_desc"],
            "pws_activity_code": system["pws_activity_code"],
            "pws_activity_desc": system["pws_activity_desc"],
            "population_served_count": as_int(system["population_served_count"]),
            "primary_source_code": system["primary_source_code"],
            "primary_source_desc": system["primary_source_desc"],
            "owner_type_code": system["owner_type_code"],
            "owner_desc": system["owner_desc"],
            "indian_country": system["indian_country"],
            "tribal_flag": system["tribal_flag"],
            "service_area_type_code": system["service_area_type_code"],
            "service_area_type_desc": system["service_area_type_desc"],
            "detailed_facility_report": system["dfr_url"],
            "boundary_available": int(boundary is not None),
            "boundary_objectid": boundary["OBJECTID"] if boundary else "",
            "boundary_provenance": boundary["Symbology_Field"] if boundary else "",
            "boundary_model_method": boundary["Model_Method"] if boundary else "",
            "boundary_data_source": boundary["Data_Source"] if boundary else "",
            "boundary_original_provider": boundary["Original_Data_Provider"] if boundary else "",
            "boundary_verification_status": boundary["Verification_Status"] if boundary else "",
            "boundary_area_sq_km": as_float(boundary["Area_SqKM"]) if boundary else None,
            "boundary_population_served_count": (
                as_int(boundary["Population_Served_Count"]) if boundary else None
            ),
        }

        any_full = False
        any_above = False
        for outcome in OUTCOMES:
            full_count = outcome_full[outcome][pwsid]
            above_count = outcome_above[outcome][pwsid]
            row[f"{outcome}_location_record_count"] = outcome_records[outcome][pwsid]
            row[f"{outcome}_full_location_count"] = full_count
            row[f"{outcome}_above_location_count"] = above_count
            row[f"{outcome}_system_full_set"] = int(full_count > 0)
            row[f"{outcome}_system_above_mcl_comparison"] = int(above_count > 0)
            row[f"{outcome}_max_location_average"] = outcome_max[outcome].get(pwsid)
            any_full |= full_count > 0
            any_above |= above_count > 0
        row["any_system_full_set"] = int(any_full)
        row["any_system_above_mcl_comparison"] = int(any_above)

        occurrence_eligible = (
            row["pws_type_code"] == "CWS"
            and row["pws_activity_code"] == "A"
            and any_full
        )
        demographic_eligible = occurrence_eligible and boundary is not None
        row["primary_occurrence_cohort"] = int(occurrence_eligible)
        row["primary_demographic_cohort"] = int(demographic_eligible)
        reasons: list[str] = []
        if row["pws_type_code"] != "CWS":
            reasons.append("noncommunity_system")
        if row["pws_activity_code"] != "A":
            reasons.append("not_currently_active")
        if not any_full:
            reasons.append("no_complete_location_set")
        if occurrence_eligible and boundary is None:
            reasons.append("no_epa_cws_boundary")
        row["cohort_exclusion_reasons"] = "|".join(reasons)
        for reason in reasons:
            exclusion_counts[reason] += 1

        sdwis_population = row["population_served_count"]
        boundary_population = row["boundary_population_served_count"]
        row["boundary_vs_sdwis_population_relative_difference"] = (
            abs(boundary_population - sdwis_population) / sdwis_population
            if boundary_population is not None and sdwis_population not in (None, 0)
            else None
        )
        analytic_rows.append(row)

    fieldnames = list(analytic_rows[0])
    output_path = args.output_dir / "ucmr5_system_analysis_cohort.csv"
    with output_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(analytic_rows)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_files": {
            "location_averages": str(args.location_averages.resolve()),
            "sdwis": str(args.sdwis.resolve()),
            "service_areas": str(args.service_areas.resolve()),
        },
        "pfas_average_systems": len(analytic_rows),
        "primary_occurrence_cohort": sum(row["primary_occurrence_cohort"] for row in analytic_rows),
        "primary_demographic_cohort": sum(row["primary_demographic_cohort"] for row in analytic_rows),
        "boundary_provenance_in_demographic_cohort": dict(Counter(
            row["boundary_provenance"] for row in analytic_rows
            if row["primary_demographic_cohort"]
        )),
        "exclusion_reason_counts_not_mutually_exclusive": dict(exclusion_counts),
        "interpretation": (
            "Primary occurrence cohort is active CWSs with at least one complete "
            "EPA-derived sampling-location average; demographic cohort also requires "
            "an EPA service-area boundary."
        ),
    }
    report_path = args.output_dir / "ucmr5_system_analysis_cohort_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "systems": len(analytic_rows),
        "occurrence_cohort": report["primary_occurrence_cohort"],
        "demographic_cohort": report["primary_demographic_cohort"],
        "boundary_provenance": report["boundary_provenance_in_demographic_cohort"],
        "exclusions": report["exclusion_reason_counts_not_mutually_exclusive"],
    }, indent=2))


if __name__ == "__main__":
    main()
