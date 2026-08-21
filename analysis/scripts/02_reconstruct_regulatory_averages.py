#!/usr/bin/env python3
"""Reconstruct UCMR 5 sampling-location averages and PFAS Hazard Index.

The implementation follows EPA's January 2026 UCMR 5 Data Summary:

* complete ground-water locations have SE1 and SE2;
* surface-water, GWUDI, and mixed locations have SE1-SE4;
* results below the UCMR MRL/PQL are zero in regulatory-compatible averages;
* PFOA/PFOS averages are counted above the MCL at >= 0.00405 ug/L;
* PFHxS/PFNA/HFPO-DA averages are counted above at >= 0.015 ug/L;
* HI is counted above at >= 1.5 with at least two mixture PFAS measured
  at or above their UCMR MRL.

These are technical-assistance comparisons, not compliance determinations.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


INDIVIDUAL_PFAS = ("PFOA", "PFOS", "PFHxS", "PFNA", "HFPO-DA")
HI_PFAS = ("PFHxS", "PFNA", "HFPO-DA", "PFBS")
TARGET_PFAS = set(INDIVIDUAL_PFAS) | set(HI_PFAS)

AVERAGE_CUTOFFS = {
    "PFOA": 0.00405,
    "PFOS": 0.00405,
    "PFHxS": 0.015,
    "PFNA": 0.015,
    "HFPO-DA": 0.015,
}

HI_HBWC = {
    "PFHxS": 0.010,
    "PFNA": 0.010,
    "HFPO-DA": 0.010,
    "PFBS": 2.0,
}

EPA_JAN_2026 = {
    "PFOA": {"L": {"full": 4128, "above": 452}, "S": {"full": 5111, "above": 283}},
    "PFOS": {"L": {"full": 4127, "above": 497}, "S": {"full": 5111, "above": 323}},
    "PFHxS": {"L": {"full": 4126, "above": 40}, "S": {"full": 5111, "above": 24}},
    "PFNA": {"L": {"full": 4127, "above": 3}, "S": {"full": 5111, "above": 6}},
    "HFPO-DA": {"L": {"full": 4129, "above": 2}, "S": {"full": 5111, "above": 1}},
    "HI": {"L": {"full": 4125, "above": 44}, "S": {"full": 5110, "above": 29}},
    "ANY": {"L": {"full": 4129, "above": 632}, "S": {"full": 5111, "above": 432}},
}


@dataclass
class EventValue:
    values: set[float] = field(default_factory=set)
    signs: set[str] = field(default_factory=set)
    dates: set[str] = field(default_factory=set)
    sample_ids: set[str] = field(default_factory=set)

    @property
    def conflict(self) -> bool:
        return len(self.values) > 1

    @property
    def value(self) -> float:
        if self.conflict or not self.values:
            raise ValueError("Event does not have one unambiguous value")
        return next(iter(self.values))

    @property
    def detected(self) -> bool:
        return "=" in self.signs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", required=True, type=Path, dest="all_path")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "outputs",
    )
    return parser.parse_args()


def result_value(sign: str, raw_value: str) -> float:
    sign = sign.strip()
    raw_value = raw_value.strip()
    if sign == "<":
        return 0.0
    if sign == "=" and raw_value:
        return float(raw_value)
    raise ValueError(f"Unsupported analytical result: sign={sign!r}, value={raw_value!r}")


def expected_event_codes(water_type: str) -> tuple[str, ...]:
    if water_type == "GW":
        return ("SE1", "SE2")
    if water_type in {"SW", "GU", "MX"}:
        return ("SE1", "SE2", "SE3", "SE4")
    raise ValueError(f"Unknown FacilityWaterType: {water_type!r}")


def nested_counts() -> dict[str, dict[str, dict[str, int]]]:
    return {
        outcome: {
            size: {"full": 0, "above": 0}
            for size in ("L", "S")
        }
        for outcome in (*INDIVIDUAL_PFAS, "HI", "ANY")
    }


def main() -> None:
    args = parse_args()
    if not args.all_path.is_file():
        raise FileNotFoundError(args.all_path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    metadata: dict[tuple[str, str, str], dict[str, str]] = {}
    observations: dict[
        tuple[str, str, str],
        dict[str, dict[str, EventValue]],
    ] = defaultdict(lambda: defaultdict(lambda: defaultdict(EventValue)))
    target_rows = 0

    with args.all_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            contaminant = row["Contaminant"].strip()
            if contaminant not in TARGET_PFAS:
                continue
            target_rows += 1
            location = (
                row["PWSID"].strip(),
                row["FacilityID"].strip(),
                row["SamplePointID"].strip(),
            )
            current_metadata = {
                "pwsid": row["PWSID"].strip(),
                "pws_name": row["PWSName"].strip(),
                "pws_size": row["Size"].strip(),
                "facility_id": row["FacilityID"].strip(),
                "facility_name": row["FacilityName"].strip(),
                "sample_point_id": row["SamplePointID"].strip(),
                "sample_point_name": row["SamplePointName"].strip(),
                "water_type": row["FacilityWaterType"].strip(),
                "state": row["State"].strip(),
                "region": row["Region"].strip(),
            }
            if location in metadata:
                immutable = ("pwsid", "pws_size", "facility_id", "sample_point_id", "water_type", "state", "region")
                conflicts = [
                    key for key in immutable
                    if metadata[location][key] != current_metadata[key]
                ]
                if conflicts:
                    raise ValueError(f"Conflicting location metadata for {location}: {conflicts}")
            else:
                metadata[location] = current_metadata

            event_code = row["SampleEventCode"].strip()
            event = observations[location][contaminant][event_code]
            event.values.add(result_value(row["AnalyticalResultsSign"], row["AnalyticalResultValue"]))
            event.signs.add(row["AnalyticalResultsSign"].strip())
            event.dates.add(row["CollectionDate"].strip())
            event.sample_ids.add(row["SampleID"].strip())

    fieldnames = [
        "pwsid", "pws_name", "pws_size", "state", "region", "facility_id",
        "facility_name", "sample_point_id", "sample_point_name", "water_type",
        "expected_event_count", "has_conflicting_event_values",
    ]
    for contaminant in INDIVIDUAL_PFAS:
        fieldnames.extend([
            f"{contaminant}_full_set",
            f"{contaminant}_average_ug_l",
            f"{contaminant}_above_mcl_comparison",
        ])
    for contaminant in HI_PFAS:
        fieldnames.extend([
            f"{contaminant}_hi_full_set",
            f"{contaminant}_hi_average_ug_l",
            f"{contaminant}_detected_in_full_set",
        ])
    fieldnames.extend([
        "hi_full_set",
        "hi_detected_component_count",
        "hazard_index",
        "hi_above_mcl_comparison",
        "any_full_set",
        "any_above_mcl_comparison",
    ])

    location_rows: list[dict[str, Any]] = []
    ambiguous_event_rows: list[dict[str, Any]] = []
    duplicate_event_records = 0
    conflicting_event_values = 0

    pws_full: dict[str, dict[str, bool]] = defaultdict(lambda: defaultdict(bool))
    pws_above: dict[str, dict[str, bool]] = defaultdict(lambda: defaultdict(bool))
    pws_size: dict[str, str] = {}

    for location in sorted(metadata):
        row: dict[str, Any] = dict(metadata[location])
        expected = expected_event_codes(row["water_type"])
        row["expected_event_count"] = len(expected)
        row_conflict = False

        for contaminant, events in observations[location].items():
            for event_code, event in events.items():
                duplicate_event_records += max(0, len(event.sample_ids) - 1)
                if event.conflict:
                    conflicting_event_values += 1
                    row_conflict = True
                if len(event.sample_ids) > 1 or event.conflict:
                    ambiguous_event_rows.append({
                        "pwsid": row["pwsid"],
                        "pws_name": row["pws_name"],
                        "pws_size": row["pws_size"],
                        "state": row["state"],
                        "facility_id": row["facility_id"],
                        "sample_point_id": row["sample_point_id"],
                        "water_type": row["water_type"],
                        "contaminant": contaminant,
                        "sample_event_code": event_code,
                        "is_expected_event": int(event_code in expected),
                        "has_conflicting_values": int(event.conflict),
                        "values_after_nondetect_zero": "|".join(
                            f"{value:.10g}" for value in sorted(event.values)
                        ),
                        "analytical_signs": "|".join(sorted(event.signs)),
                        "collection_dates": "|".join(sorted(event.dates)),
                        "sample_ids": "|".join(sorted(event.sample_ids)),
                    })

        individual_full: dict[str, bool] = {}
        individual_above: dict[str, bool] = {}
        individual_average: dict[str, float | None] = {}
        for contaminant in INDIVIDUAL_PFAS:
            events = observations[location][contaminant]
            full = all(code in events and not events[code].conflict for code in expected)
            average = (
                sum(events[code].value for code in expected) / len(expected)
                if full else None
            )
            above = bool(full and average is not None and average >= AVERAGE_CUTOFFS[contaminant])
            individual_full[contaminant] = full
            individual_average[contaminant] = average
            individual_above[contaminant] = above
            row[f"{contaminant}_full_set"] = int(full)
            row[f"{contaminant}_average_ug_l"] = "" if average is None else f"{average:.10g}"
            row[f"{contaminant}_above_mcl_comparison"] = int(above)

        hi_full_by_component: dict[str, bool] = {}
        hi_average_by_component: dict[str, float | None] = {}
        hi_detected_by_component: dict[str, bool] = {}
        for contaminant in HI_PFAS:
            events = observations[location][contaminant]
            full = all(code in events and not events[code].conflict for code in expected)
            average = (
                sum(events[code].value for code in expected) / len(expected)
                if full else None
            )
            detected = bool(full and any(events[code].detected for code in expected))
            hi_full_by_component[contaminant] = full
            hi_average_by_component[contaminant] = average
            hi_detected_by_component[contaminant] = detected
            row[f"{contaminant}_hi_full_set"] = int(full)
            row[f"{contaminant}_hi_average_ug_l"] = "" if average is None else f"{average:.10g}"
            row[f"{contaminant}_detected_in_full_set"] = int(detected)

        hi_full = all(hi_full_by_component.values())
        detected_component_count = sum(hi_detected_by_component.values()) if hi_full else 0
        hi = (
            sum(
                float(hi_average_by_component[contaminant]) / HI_HBWC[contaminant]
                for contaminant in HI_PFAS
            )
            if hi_full else None
        )
        hi_above = bool(hi_full and hi is not None and hi >= 1.5 and detected_component_count >= 2)
        any_full = any(individual_full.values()) or hi_full
        any_above = any(individual_above.values()) or hi_above

        row["has_conflicting_event_values"] = int(row_conflict)
        row["hi_full_set"] = int(hi_full)
        row["hi_detected_component_count"] = detected_component_count
        row["hazard_index"] = "" if hi is None else f"{hi:.10g}"
        row["hi_above_mcl_comparison"] = int(hi_above)
        row["any_full_set"] = int(any_full)
        row["any_above_mcl_comparison"] = int(any_above)
        location_rows.append(row)

        pwsid = row["pwsid"]
        pws_size[pwsid] = row["pws_size"]
        for contaminant in INDIVIDUAL_PFAS:
            pws_full[pwsid][contaminant] |= individual_full[contaminant]
            pws_above[pwsid][contaminant] |= individual_above[contaminant]
        pws_full[pwsid]["HI"] |= hi_full
        pws_above[pwsid]["HI"] |= hi_above
        pws_full[pwsid]["ANY"] |= any_full
        pws_above[pwsid]["ANY"] |= any_above

    counts = nested_counts()
    for pwsid, size in pws_size.items():
        for outcome in counts:
            counts[outcome][size]["full"] += int(pws_full[pwsid][outcome])
            counts[outcome][size]["above"] += int(pws_above[pwsid][outcome])

    validation: dict[str, Any] = {}
    exact_match = True
    for outcome, by_size in EPA_JAN_2026.items():
        validation[outcome] = {}
        for size, expected_counts in by_size.items():
            actual_counts = counts[outcome][size]
            difference = {
                key: actual_counts[key] - expected_counts[key]
                for key in ("full", "above")
            }
            match = all(value == 0 for value in difference.values())
            exact_match &= match
            validation[outcome][size] = {
                "expected": expected_counts,
                "actual": actual_counts,
                "difference": difference,
                "exact_match": match,
            }

    location_path = args.output_dir / "ucmr5_regulatory_location_averages.csv"
    with location_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(location_rows)

    ambiguous_path = args.output_dir / "ucmr5_ambiguous_event_records.csv"
    ambiguous_fields = [
        "pwsid", "pws_name", "pws_size", "state", "facility_id",
        "sample_point_id", "water_type", "contaminant", "sample_event_code",
        "is_expected_event", "has_conflicting_values",
        "values_after_nondetect_zero", "analytical_signs", "collection_dates",
        "sample_ids",
    ]
    with ambiguous_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ambiguous_fields)
        writer.writeheader()
        writer.writerows(ambiguous_event_rows)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source": str(args.all_path.resolve()),
        "target_rows_read": target_rows,
        "locations": len(location_rows),
        "pws": len(pws_size),
        "duplicate_event_records": duplicate_event_records,
        "ambiguous_event_groups": len(ambiguous_event_rows),
        "event_keys_with_conflicting_values": conflicting_event_values,
        "epa_comparison_counts": counts,
        "validation_against_epa_january_2026_table_4": validation,
        "exact_match_all_cells": exact_match,
        "interpretation": "Technical-assistance comparisons only; not compliance determinations.",
    }
    report_path = args.output_dir / "ucmr5_regulatory_reconstruction.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {location_path}")
    print(f"Wrote {ambiguous_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "locations": len(location_rows),
        "pws": len(pws_size),
        "event_conflicts": conflicting_event_values,
        "exact_match_all_epa_cells": exact_match,
    }, indent=2))


if __name__ == "__main__":
    main()
