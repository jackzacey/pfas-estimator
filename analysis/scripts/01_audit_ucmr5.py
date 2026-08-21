#!/usr/bin/env python3
"""Audit the raw January 2026 UCMR 5 text files without altering them.

This stage intentionally performs no MCL, Hazard Index, exposure, or health-risk
classification. It establishes the available rows, identifiers, monitoring-event
structure, analyte inventory, reporting signs, and PWS-to-ZIP multiplicity.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


EXPECTED_COLUMNS = {
    "PWSID",
    "PWSName",
    "Size",
    "FacilityID",
    "FacilityWaterType",
    "SamplePointID",
    "CollectionDate",
    "SampleID",
    "Contaminant",
    "MRL",
    "AnalyticalResultsSign",
    "AnalyticalResultValue",
    "SampleEventCode",
    "MonitoringRequirement",
    "Region",
    "State",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", required=True, type=Path, dest="all_path")
    parser.add_argument("--additional", required=True, type=Path)
    parser.add_argument("--zip", required=True, type=Path, dest="zip_path")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "outputs",
    )
    return parser.parse_args()


def sha256(path: Path, chunk_size: int = 1024 * 1024) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(chunk_size), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_metadata(path: Path) -> dict[str, Any]:
    stat = path.stat()
    return {
        "path": str(path.resolve()),
        "bytes": stat.st_size,
        "modified_utc": datetime.fromtimestamp(
            stat.st_mtime, tz=timezone.utc
        ).isoformat(),
        "sha256": sha256(path),
    }


def open_tsv(path: Path) -> tuple[csv.DictReader, Any]:
    # EPA's files may contain a legacy microgram character. Replacement is safe
    # for this structural audit because identifiers and numeric fields are ASCII.
    handle = path.open("r", encoding="utf-8-sig", errors="replace", newline="")
    return csv.DictReader(handle, delimiter="\t"), handle


def numeric(value: str | None) -> float | None:
    if value is None or value.strip() == "":
        return None
    try:
        return float(value)
    except ValueError:
        return None


def quantiles(values: Iterable[int]) -> dict[str, float | int | None]:
    ordered = sorted(values)
    if not ordered:
        return {"min": None, "median": None, "p95": None, "max": None}
    p95_index = min(len(ordered) - 1, int(0.95 * (len(ordered) - 1)))
    return {
        "min": ordered[0],
        "median": statistics.median(ordered),
        "p95": ordered[p95_index],
        "max": ordered[-1],
    }


def audit_all(path: Path) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    reader, handle = open_tsv(path)
    try:
        fields = set(reader.fieldnames or [])
        missing = sorted(EXPECTED_COLUMNS - fields)
        if missing:
            raise ValueError(f"UCMR5_All.txt is missing required columns: {missing}")

        total_rows = 0
        pws_ids: set[str] = set()
        pws_names: dict[str, str] = {}
        pws_sizes: dict[str, str] = {}
        states: set[str] = set()
        regions: set[str] = set()
        sample_points: set[tuple[str, str, str]] = set()
        sample_ids: set[tuple[str, str]] = set()
        event_contaminants: dict[tuple[str, str, str, str, str], set[str]] = defaultdict(set)
        location_events: dict[tuple[str, str, str], set[tuple[str, str]]] = defaultdict(set)
        location_water_types: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        signs: Counter[str] = Counter()
        monitoring_requirements: Counter[str] = Counter()
        facility_water_types: Counter[str] = Counter()
        units: Counter[str] = Counter()
        methods: Counter[str] = Counter()
        analytes: dict[str, dict[str, Any]] = defaultdict(
            lambda: {
                "rows": 0,
                "reported_numeric_rows": 0,
                "below_mrl_rows": 0,
                "other_sign_rows": 0,
                "mrl_values": set(),
                "methods": set(),
                "units": set(),
                "pws_with_numeric_result": set(),
                "locations_with_numeric_result": set(),
                "minimum_reported_result": None,
                "maximum_reported_result": None,
            }
        )

        for row in reader:
            total_rows += 1
            pwsid = row["PWSID"].strip()
            facility = row["FacilityID"].strip()
            sample_point = row["SamplePointID"].strip()
            date = row["CollectionDate"].strip()
            event_code = row["SampleEventCode"].strip()
            sample_id = row["SampleID"].strip()
            contaminant = row["Contaminant"].strip()
            sign = row["AnalyticalResultsSign"].strip()
            result = numeric(row["AnalyticalResultValue"])
            mrl = numeric(row["MRL"])
            location = (pwsid, facility, sample_point)
            event = (pwsid, facility, sample_point, event_code, date)

            pws_ids.add(pwsid)
            pws_names[pwsid] = row["PWSName"].strip()
            pws_sizes[pwsid] = row["Size"].strip()
            states.add(row["State"].strip())
            regions.add(row["Region"].strip())
            sample_points.add(location)
            sample_ids.add((pwsid, sample_id))
            event_contaminants[event].add(contaminant)
            location_events[location].add((event_code, date))
            location_water_types[location].add(row["FacilityWaterType"].strip())
            signs[sign or "(blank)"] += 1
            monitoring_requirements[row["MonitoringRequirement"].strip() or "(blank)"] += 1
            facility_water_types[row["FacilityWaterType"].strip() or "(blank)"] += 1
            units[row["Units"].strip() or "(blank)"] += 1
            methods[row["MethodID"].strip() or "(blank)"] += 1

            stats = analytes[contaminant]
            stats["rows"] += 1
            if mrl is not None:
                stats["mrl_values"].add(mrl)
            stats["methods"].add(row["MethodID"].strip())
            stats["units"].add(row["Units"].strip())

            if sign == "<":
                stats["below_mrl_rows"] += 1
            elif result is not None:
                stats["reported_numeric_rows"] += 1
                stats["pws_with_numeric_result"].add(pwsid)
                stats["locations_with_numeric_result"].add(location)
                current_min = stats["minimum_reported_result"]
                current_max = stats["maximum_reported_result"]
                stats["minimum_reported_result"] = result if current_min is None else min(current_min, result)
                stats["maximum_reported_result"] = result if current_max is None else max(current_max, result)
            else:
                stats["other_sign_rows"] += 1

        event_analyte_counts = Counter(len(value) for value in event_contaminants.values())
        location_event_counts = [len(value) for value in location_events.values()]
        conflicting_water_type_locations = sum(
            1 for value in location_water_types.values() if len(value - {""}) > 1
        )

        inventory: list[dict[str, Any]] = []
        for name in sorted(analytes):
            stats = analytes[name]
            inventory.append(
                {
                    "contaminant": name,
                    "rows": stats["rows"],
                    "reported_numeric_rows": stats["reported_numeric_rows"],
                    "below_mrl_rows": stats["below_mrl_rows"],
                    "other_sign_rows": stats["other_sign_rows"],
                    "pws_with_numeric_result": len(stats["pws_with_numeric_result"]),
                    "locations_with_numeric_result": len(stats["locations_with_numeric_result"]),
                    "mrl_values": sorted(stats["mrl_values"]),
                    "minimum_reported_result": stats["minimum_reported_result"],
                    "maximum_reported_result": stats["maximum_reported_result"],
                    "methods": sorted(value for value in stats["methods"] if value),
                    "units": sorted(value for value in stats["units"] if value),
                }
            )

        summary = {
            "rows": total_rows,
            "unique_pws": len(pws_ids),
            "unique_sample_points": len(sample_points),
            "unique_sample_ids": len(sample_ids),
            "unique_monitoring_events": len(event_contaminants),
            "unique_contaminants": len(analytes),
            "states_or_territories": sorted(value for value in states if value),
            "regions": sorted(value for value in regions if value),
            "pws_size_counts": dict(sorted(Counter(pws_sizes.values()).items())),
            "analytical_result_sign_counts": dict(sorted(signs.items())),
            "monitoring_requirement_counts": dict(sorted(monitoring_requirements.items())),
            "facility_water_type_counts": dict(sorted(facility_water_types.items())),
            "unit_counts": dict(sorted(units.items())),
            "method_counts": dict(sorted(methods.items())),
            "monitoring_event_analyte_count_distribution": {
                str(key): value for key, value in sorted(event_analyte_counts.items())
            },
            "events_per_sample_point": quantiles(location_event_counts),
            "sample_points_with_conflicting_water_types": conflicting_water_type_locations,
        }
        return summary, inventory
    finally:
        handle.close()


def audit_additional(path: Path) -> dict[str, Any]:
    reader, handle = open_tsv(path)
    try:
        rows = 0
        events: set[tuple[str, str, str, str]] = set()
        elements: Counter[str] = Counter()
        responses: Counter[str] = Counter()
        for row in reader:
            rows += 1
            events.add(
                (
                    row["PWSID"].strip(),
                    row["FacilityID"].strip(),
                    row["SamplePointID"].strip(),
                    row["SampleEventCode"].strip(),
                )
            )
            elements[row["AdditionalDataElement"].strip() or "(blank)"] += 1
            responses[row["Response"].strip() or "(blank)"] += 1
        return {
            "rows": rows,
            "unique_event_keys": len(events),
            "additional_data_element_counts": dict(sorted(elements.items())),
            "response_counts": dict(responses.most_common()),
        }
    finally:
        handle.close()


def audit_zip(path: Path) -> dict[str, Any]:
    reader, handle = open_tsv(path)
    try:
        rows = 0
        pairs: set[tuple[str, str]] = set()
        pws_to_zips: dict[str, set[str]] = defaultdict(set)
        zip_to_pws: dict[str, set[str]] = defaultdict(set)
        invalid_zip_rows = 0
        for row in reader:
            rows += 1
            pwsid = row["PWSID"].strip()
            zipcode = row["ZIPCODE"].strip().zfill(5)
            if len(zipcode) != 5 or not zipcode.isdigit():
                invalid_zip_rows += 1
            pairs.add((pwsid, zipcode))
            pws_to_zips[pwsid].add(zipcode)
            zip_to_pws[zipcode].add(pwsid)

        pws_multiplicity = [len(value) for value in pws_to_zips.values()]
        zip_multiplicity = [len(value) for value in zip_to_pws.values()]
        return {
            "rows": rows,
            "unique_pairs": len(pairs),
            "duplicate_pair_rows": rows - len(pairs),
            "unique_pws": len(pws_to_zips),
            "unique_zipcodes": len(zip_to_pws),
            "invalid_zip_rows": invalid_zip_rows,
            "zipcodes_per_pws": quantiles(pws_multiplicity),
            "pws_per_zipcode": quantiles(zip_multiplicity),
            "pws_linked_to_multiple_zipcodes": sum(value > 1 for value in pws_multiplicity),
            "zipcodes_linked_to_multiple_pws": sum(value > 1 for value in zip_multiplicity),
        }
    finally:
        handle.close()


def write_inventory(path: Path, inventory: list[dict[str, Any]]) -> None:
    columns = [
        "contaminant",
        "rows",
        "reported_numeric_rows",
        "below_mrl_rows",
        "other_sign_rows",
        "pws_with_numeric_result",
        "locations_with_numeric_result",
        "mrl_values",
        "minimum_reported_result",
        "maximum_reported_result",
        "methods",
        "units",
    ]
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=columns)
        writer.writeheader()
        for row in inventory:
            rendered = dict(row)
            for key in ("mrl_values", "methods", "units"):
                rendered[key] = "|".join(str(value) for value in rendered[key])
            writer.writerow(rendered)


def main() -> None:
    args = parse_args()
    for path in (args.all_path, args.additional, args.zip_path):
        if not path.is_file():
            raise FileNotFoundError(path)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    all_summary, inventory = audit_all(args.all_path)
    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "purpose": "Structural audit only; no benchmark, compliance, exposure, or health-risk classification.",
        "sources": {
            "all": source_metadata(args.all_path),
            "additional": source_metadata(args.additional),
            "zip": source_metadata(args.zip_path),
        },
        "all_results": all_summary,
        "additional_data_elements": audit_additional(args.additional),
        "pws_zip_crosswalk": audit_zip(args.zip_path),
    }

    report_path = args.output_dir / "ucmr5_structural_audit.json"
    inventory_path = args.output_dir / "ucmr5_contaminant_inventory.csv"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    write_inventory(inventory_path, inventory)

    print(f"Wrote {report_path}")
    print(f"Wrote {inventory_path}")
    print(json.dumps({
        "rows": all_summary["rows"],
        "unique_pws": all_summary["unique_pws"],
        "unique_sample_points": all_summary["unique_sample_points"],
        "unique_monitoring_events": all_summary["unique_monitoring_events"],
        "unique_contaminants": all_summary["unique_contaminants"],
    }, indent=2))


if __name__ == "__main__":
    main()
