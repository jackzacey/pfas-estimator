#!/usr/bin/env python3
"""Normalize and validate EPA's January 2026 Average PFAS Results export.

EPA's interactive Data Finder contains a derived location-average table that is
not included in the occurrence-data text-file bundle. This script reads the
official XLSX export with the Python standard library, produces one row per
sampling location, and validates PWS counts against EPA Data Summary table 4.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator
from xml.etree import ElementTree as ET


NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
OUTCOMES = ("PFOA", "PFOS", "PFHxS", "PFNA", "HFPO-DA", "Hazard Index (HI)")
TOKENS = {
    "PFOA": "pfoa",
    "PFOS": "pfos",
    "PFHxS": "pfhxs",
    "PFNA": "pfna",
    "HFPO-DA": "hfpo_da",
    "Hazard Index (HI)": "hi",
}
EPA_JAN_2026 = {
    "PFOA": {"L": {"full": 4128, "above": 452}, "S": {"full": 5111, "above": 283}},
    "PFOS": {"L": {"full": 4127, "above": 497}, "S": {"full": 5111, "above": 323}},
    "PFHxS": {"L": {"full": 4126, "above": 40}, "S": {"full": 5111, "above": 24}},
    "PFNA": {"L": {"full": 4127, "above": 3}, "S": {"full": 5111, "above": 6}},
    "HFPO-DA": {"L": {"full": 4129, "above": 2}, "S": {"full": 5111, "above": 1}},
    "Hazard Index (HI)": {"L": {"full": 4125, "above": 44}, "S": {"full": 5110, "above": 29}},
    "ANY": {"L": {"full": 4129, "above": 632}, "S": {"full": 5111, "above": 432}},
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "outputs",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def column_index(cell_reference: str) -> int:
    letters = re.match(r"[A-Z]+", cell_reference)
    if not letters:
        raise ValueError(f"Invalid cell reference: {cell_reference}")
    value = 0
    for character in letters.group(0):
        value = value * 26 + ord(character) - ord("A") + 1
    return value - 1


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    strings: list[str] = []
    with archive.open("xl/sharedStrings.xml") as handle:
        for event, element in ET.iterparse(handle, events=("end",)):
            if element.tag == f"{NS}si":
                strings.append("".join(node.text or "" for node in element.iter(f"{NS}t")))
                element.clear()
    return strings


def iter_xlsx_rows(path: Path) -> Iterator[list[str]]:
    with zipfile.ZipFile(path) as archive:
        shared = read_shared_strings(archive)
        with archive.open("xl/worksheets/sheet1.xml") as handle:
            for event, element in ET.iterparse(handle, events=("end",)):
                if element.tag != f"{NS}row":
                    continue
                values: dict[int, str] = {}
                for cell in element.findall(f"{NS}c"):
                    reference = cell.attrib.get("r", "")
                    index = column_index(reference)
                    value_element = cell.find(f"{NS}v")
                    if value_element is None or value_element.text is None:
                        value = ""
                    elif cell.attrib.get("t") == "s":
                        value = shared[int(value_element.text)]
                    else:
                        value = value_element.text
                    values[index] = value
                if values:
                    yield [values.get(index, "") for index in range(max(values) + 1)]
                element.clear()


def yes_no(value: str) -> int | None:
    normalized = value.strip().upper()
    if normalized in {"", "N/A"}:
        return None
    if normalized == "Y":
        return 1
    if normalized == "N":
        return 0
    raise ValueError(f"Unexpected Y/N value: {value!r}")


def count_by_pws(rows: list[dict[str, Any]]) -> dict[str, dict[str, dict[str, int]]]:
    pws_flags: dict[str, dict[str, bool]] = defaultdict(lambda: defaultdict(bool))
    pws_sizes: dict[str, str] = {}
    for row in rows:
        pwsid = row["pwsid"]
        pws_sizes[pwsid] = row["pws_size"]
        for outcome in OUTCOMES:
            token = TOKENS[outcome]
            pws_flags[pwsid][f"{outcome}_full"] |= row[f"{token}_full_set"] == 1
            pws_flags[pwsid][f"{outcome}_above"] |= row[f"{token}_above_mcl_comparison"] == 1
        pws_flags[pwsid]["ANY_full"] |= row["any_full_set"] == 1
        pws_flags[pwsid]["ANY_above"] |= row["any_above_mcl_comparison"] == 1

    counts = {
        outcome: {size: {"full": 0, "above": 0} for size in ("L", "S")}
        for outcome in (*OUTCOMES, "ANY")
    }
    for pwsid, flags in pws_flags.items():
        size = pws_sizes[pwsid]
        for outcome in counts:
            counts[outcome][size]["full"] += int(flags[f"{outcome}_full"])
            counts[outcome][size]["above"] += int(flags[f"{outcome}_above"])
    return counts


def main() -> None:
    args = parse_args()
    if not args.xlsx.is_file():
        raise FileNotFoundError(args.xlsx)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    rows = iter_xlsx_rows(args.xlsx)
    header = next(rows)
    expected_header = [
        "PWS ID", "PWS Name", "Contaminant", "April 2024 PFAS NPDWR MCL",
        "Location Has a Full Set of Results", "Average > MCL", "Average Result",
        "Facility ID", "Facility Name", "Sample Point ID", "Sample Point Name",
        "PWS Size", "Facility Water Type", "Sample Point Type", "EPA Region", "State",
    ]
    if header != expected_header:
        raise ValueError(f"Unexpected EPA export header: {header}")

    source_rows: list[dict[str, str]] = []
    for values in rows:
        padded = values + [""] * (len(header) - len(values))
        source_rows.append(dict(zip(header, padded)))

    location_metadata: dict[tuple[str, str, str], dict[str, Any]] = {}
    records: dict[tuple[str, str, str], dict[str, dict[str, str]]] = defaultdict(dict)
    duplicate_location_outcomes: list[dict[str, str]] = []
    for source in source_rows:
        outcome = source["Contaminant"]
        if outcome not in OUTCOMES:
            raise ValueError(f"Unexpected outcome: {outcome!r}")
        key = (source["PWS ID"], source["Facility ID"], source["Sample Point ID"])
        metadata = {
            "pwsid": source["PWS ID"],
            "pws_name": source["PWS Name"],
            "pws_size": source["PWS Size"],
            "state": source["State"],
            "epa_region": source["EPA Region"],
            "facility_id": source["Facility ID"],
            "facility_name": source["Facility Name"],
            "sample_point_id": source["Sample Point ID"],
            "sample_point_name": source["Sample Point Name"],
            "water_type": source["Facility Water Type"],
            "sample_point_type": source["Sample Point Type"],
        }
        prior_metadata = location_metadata.setdefault(key, metadata)
        if prior_metadata != metadata:
            raise ValueError(f"Conflicting EPA location metadata for {key}")
        if outcome in records[key]:
            duplicate_location_outcomes.append(source)
        records[key][outcome] = source

    if duplicate_location_outcomes:
        raise ValueError(f"Duplicate location/outcome rows: {len(duplicate_location_outcomes)}")

    normalized_rows: list[dict[str, Any]] = []
    missing_outcome_records: list[dict[str, str]] = []
    for key in sorted(location_metadata):
        row = dict(location_metadata[key])
        full_flags: list[bool] = []
        above_flags: list[bool] = []
        for outcome in OUTCOMES:
            token = TOKENS[outcome]
            record = records[key].get(outcome)
            if record is None:
                row[f"{token}_record_present"] = 0
                row[f"{token}_full_set"] = None
                row[f"{token}_average_result"] = None
                row[f"{token}_above_mcl_comparison"] = None
                missing_outcome_records.append({
                    "pwsid": key[0], "facility_id": key[1],
                    "sample_point_id": key[2], "missing_outcome": outcome,
                })
                continue
            full = yes_no(record["Location Has a Full Set of Results"])
            above = yes_no(record["Average > MCL"])
            average = record["Average Result"].strip()
            if average.upper() == "N/A":
                average = ""
            if full == 1 and (above is None or not average):
                raise ValueError(f"Complete record missing result/classification: {key} {outcome}")
            if full == 0 and (above is not None or average):
                raise ValueError(f"Incomplete record has result/classification: {key} {outcome}")
            row[f"{token}_record_present"] = 1
            row[f"{token}_full_set"] = full
            row[f"{token}_average_result"] = float(average) if average else None
            row[f"{token}_above_mcl_comparison"] = above
            full_flags.append(full == 1)
            above_flags.append(above == 1)
        row["any_full_set"] = int(any(full_flags))
        row["any_above_mcl_comparison"] = int(any(above_flags))
        normalized_rows.append(row)

    base_fields = [
        "pwsid", "pws_name", "pws_size", "state", "epa_region", "facility_id",
        "facility_name", "sample_point_id", "sample_point_name", "water_type",
        "sample_point_type",
    ]
    outcome_fields: list[str] = []
    for outcome in OUTCOMES:
        token = TOKENS[outcome]
        outcome_fields.extend([
            f"{token}_record_present", f"{token}_full_set",
            f"{token}_average_result", f"{token}_above_mcl_comparison",
        ])
    fieldnames = [*base_fields, *outcome_fields, "any_full_set", "any_above_mcl_comparison"]
    normalized_path = args.output_dir / "epa_ucmr5_average_pfas_locations.csv"
    with normalized_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(normalized_rows)

    missing_path = args.output_dir / "epa_ucmr5_average_export_missing_records.csv"
    with missing_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["pwsid", "facility_id", "sample_point_id", "missing_outcome"],
        )
        writer.writeheader()
        writer.writerows(missing_outcome_records)

    counts = count_by_pws(normalized_rows)
    validation: dict[str, Any] = {}
    exact_match = True
    for outcome, by_size in EPA_JAN_2026.items():
        validation[outcome] = {}
        for size, expected in by_size.items():
            actual = counts[outcome][size]
            difference = {key: actual[key] - expected[key] for key in ("full", "above")}
            match = all(value == 0 for value in difference.values())
            exact_match &= match
            validation[outcome][size] = {
                "expected": expected,
                "actual": actual,
                "difference": difference,
                "exact_match": match,
            }

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source": str(args.xlsx.resolve()),
        "source_sha256": sha256(args.xlsx),
        "source_rows": len(source_rows),
        "locations": len(normalized_rows),
        "pws": len({row["pwsid"] for row in normalized_rows}),
        "rows_by_outcome": dict(Counter(row["Contaminant"] for row in source_rows)),
        "missing_location_outcome_records": missing_outcome_records,
        "pws_comparison_counts": counts,
        "validation_against_epa_january_2026_table_4": validation,
        "exact_match_all_cells": exact_match,
        "interpretation": (
            "EPA-derived UCMR location averages and technical-assistance MCL "
            "comparisons; not compliance determinations."
        ),
    }
    report_path = args.output_dir / "epa_ucmr5_average_export_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {normalized_path}")
    print(f"Wrote {missing_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "source_rows": len(source_rows),
        "locations": len(normalized_rows),
        "pws": len({row["pwsid"] for row in normalized_rows}),
        "missing_outcome_records": len(missing_outcome_records),
        "exact_match_all_epa_cells": exact_match,
    }, indent=2))


if __name__ == "__main__":
    main()
