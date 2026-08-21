#!/usr/bin/env python3
"""Link UCMR systems to a frozen EPA ECHO/SDWIS system-search snapshot."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


KEEP_FIELDS = (
    "PWSID", "PWS_NAME", "STATE_CODE", "EPA_REGION", "PWS_TYPE_CODE",
    "PWS_TYPE_DESC", "PRIMARY_SOURCE_CODE", "PRIMARY_SOURCE_DESC",
    "POPULATION_SERVED_COUNT", "PWS_ACTIVITY_CODE", "PWS_ACTIVITY_DESC",
    "OWNER_TYPE_CODE", "OWNER_DESC", "INDIAN_COUNTRY", "TRIBAL_FLAG",
    "SERVICE_AREA_TYPE_CODE", "SERVICE_AREA_TYPE_DESC", "GW_SW_CODE",
    "CITIES_SERVED", "COUNTIES_SERVED", "FIPS_CODES", "DFR_URL",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ucmr-all", required=True, type=Path)
    parser.add_argument("--sdwis-zip", required=True, type=Path)
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


def read_ucmr_systems(path: Path) -> dict[str, dict[str, str]]:
    systems: dict[str, dict[str, str]] = {}
    with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            pwsid = row["PWSID"].strip()
            current = {
                "ucmr_pws_name": row["PWSName"].strip(),
                "ucmr_size": row["Size"].strip(),
                "ucmr_state": row["State"].strip(),
                "ucmr_region": row["Region"].strip(),
            }
            prior = systems.setdefault(pwsid, current)
            if prior != current:
                raise ValueError(f"Conflicting UCMR system metadata for {pwsid}")
    return systems


def read_sdwis(path: Path) -> tuple[dict[str, dict[str, str]], int, str]:
    systems: dict[str, dict[str, str]] = {}
    row_count = 0
    with zipfile.ZipFile(path) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(csv_names) != 1:
            raise ValueError(f"Expected one CSV in {path}; found {csv_names}")
        csv_name = csv_names[0]
        with archive.open(csv_name) as binary:
            import io

            with io.TextIOWrapper(binary, encoding="utf-8-sig", errors="replace", newline="") as handle:
                reader = csv.DictReader(handle)
                missing_fields = set(KEEP_FIELDS) - set(reader.fieldnames or [])
                if missing_fields:
                    raise ValueError(f"Missing expected SDWIS fields: {sorted(missing_fields)}")
                for row in reader:
                    row_count += 1
                    pwsid = row["PWSID"].strip()
                    if not pwsid:
                        continue
                    selected = {field.lower(): row[field].strip() for field in KEEP_FIELDS}
                    if pwsid in systems:
                        raise ValueError(f"Duplicate PWSID in SDWIS system snapshot: {pwsid}")
                    systems[pwsid] = selected
    return systems, row_count, csv_name


def main() -> None:
    args = parse_args()
    for path in (args.ucmr_all, args.sdwis_zip):
        if not path.is_file():
            raise FileNotFoundError(path)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    ucmr = read_ucmr_systems(args.ucmr_all)
    sdwis, sdwis_rows, member_name = read_sdwis(args.sdwis_zip)

    matched: list[dict[str, Any]] = []
    unmatched: list[dict[str, str]] = []
    for pwsid, ucmr_row in sorted(ucmr.items()):
        sdwis_row = sdwis.get(pwsid)
        if sdwis_row is None:
            unmatched.append({"pwsid": pwsid, **ucmr_row})
            continue
        matched.append({"pwsid": pwsid, **ucmr_row, **sdwis_row})

    output_fields = [
        "pwsid", "ucmr_pws_name", "ucmr_size", "ucmr_state", "ucmr_region",
        *[field.lower() for field in KEEP_FIELDS if field != "PWSID"],
    ]
    matched_path = args.output_dir / "ucmr5_sdwis_system_metadata.csv"
    with matched_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=output_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(matched)

    unmatched_path = args.output_dir / "ucmr5_without_sdwis_system_metadata.csv"
    unmatched_fields = ["pwsid", "ucmr_pws_name", "ucmr_size", "ucmr_state", "ucmr_region"]
    with unmatched_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=unmatched_fields)
        writer.writeheader()
        writer.writerows(unmatched)

    type_counts = Counter(row["pws_type_code"] or "MISSING" for row in matched)
    activity_counts = Counter(row["pws_activity_code"] or "MISSING" for row in matched)
    source_counts = Counter(row["primary_source_code"] or "MISSING" for row in matched)
    owner_counts = Counter(row["owner_type_code"] or "MISSING" for row in matched)
    population_missing = sum(not row["population_served_count"] for row in matched)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source": str(args.sdwis_zip.resolve()),
        "source_sha256": sha256(args.sdwis_zip),
        "source_member": member_name,
        "source_rows": sdwis_rows,
        "source_unique_pwsids": len(sdwis),
        "ucmr_unique_pwsids": len(ucmr),
        "ucmr_matched": len(matched),
        "ucmr_unmatched": len(unmatched),
        "pws_type_counts": dict(type_counts),
        "pws_activity_counts": dict(activity_counts),
        "primary_source_counts": dict(source_counts),
        "owner_type_counts": dict(owner_counts),
        "missing_population_served": population_missing,
        "interpretation": "Current ECHO/SDWIS system attributes linked by exact PWSID.",
    }
    report_path = args.output_dir / "ucmr5_sdwis_system_linkage.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {matched_path}")
    print(f"Wrote {unmatched_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "sdwis_rows": sdwis_rows,
        "ucmr_pws": len(ucmr),
        "matched": len(matched),
        "unmatched": len(unmatched),
        "pws_types": dict(type_counts),
        "active_status": dict(activity_counts),
        "missing_population": population_missing,
    }, indent=2))


if __name__ == "__main__":
    main()
