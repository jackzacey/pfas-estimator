#!/usr/bin/env python3
"""Extract EPA's CWS-to-Census block-group crosswalk for the analytic cohort."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import io
import json
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


MEMBER = "3_0/Census_Tables/Block_Groups_V_3_0.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--boundary-archive",
        type=Path,
        default=analysis_dir / "data" / "raw" / "epa_service_areas" /
        "PWS_Boundaries_Latest_v3_2026-03.zip",
    )
    parser.add_argument(
        "--cohort",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_cohort.csv",
    )
    parser.add_argument(
        "--derived-dir",
        type=Path,
        default=analysis_dir / "data" / "derived",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=analysis_dir / "outputs",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    for path in (args.boundary_archive, args.cohort):
        if not path.is_file():
            raise FileNotFoundError(path)
    args.derived_dir.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    cohort: set[str] = set()
    provenance: dict[str, str] = {}
    with args.cohort.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["primary_demographic_cohort"] == "1":
                cohort.add(row["pwsid"])
                provenance[row["pwsid"]] = row["boundary_provenance"]

    output_path = args.derived_dir / "epa_cws_block_group_crosswalk_ucmr5.csv.gz"
    source_rows = 0
    retained_rows = 0
    retained_pws: set[str] = set()
    retained_geoids: set[str] = set()
    missing_building_weight_rows = 0
    zero_buildings_rows = 0
    weight_source_counts: Counter[str] = Counter()

    with zipfile.ZipFile(args.boundary_archive) as archive:
        if MEMBER not in archive.namelist():
            raise FileNotFoundError(f"{MEMBER} not present in boundary archive")
        with archive.open(MEMBER) as binary, gzip.open(
            output_path, "wt", encoding="utf-8", newline="", compresslevel=6
        ) as output:
            reader = csv.DictReader(io.TextIOWrapper(binary, encoding="utf-8-sig", newline=""))
            source_fields = reader.fieldnames or []
            expected_fields = [
                "GEOID20", "PWSID", "BG_Km", "BG_I_Km", "Area_Weight",
                "Pop20_AW", "BG_Buildings", "BG_O_Buildings", "Bldg_Weight", "Pop20_BW",
            ]
            if source_fields != expected_fields:
                raise ValueError(f"Unexpected EPA crosswalk fields: {source_fields}")
            fieldnames = [*expected_fields, "Preferred_Weight", "Preferred_Weight_Source", "Boundary_Provenance"]
            writer = csv.DictWriter(output, fieldnames=fieldnames)
            writer.writeheader()
            for row in reader:
                source_rows += 1
                pwsid = row["PWSID"]
                if pwsid not in cohort:
                    continue
                retained_rows += 1
                retained_pws.add(pwsid)
                retained_geoids.add(row["GEOID20"])
                building_weight = row["Bldg_Weight"].strip()
                if building_weight.upper() in {"NA", "N/A", "NULL"}:
                    building_weight = ""
                building_count = row["BG_Buildings"].strip()
                buildings = (
                    int(float(building_count))
                    if building_count.upper() not in {"", "NA", "N/A", "NULL"}
                    else 0
                )
                if not building_weight:
                    missing_building_weight_rows += 1
                if buildings == 0:
                    zero_buildings_rows += 1
                if building_weight and buildings > 0:
                    preferred_weight = building_weight
                    weight_source = "building"
                else:
                    preferred_weight = row["Area_Weight"]
                    weight_source = "area_fallback"
                weight_source_counts[weight_source] += 1
                writer.writerow({
                    **row,
                    "Preferred_Weight": preferred_weight,
                    "Preferred_Weight_Source": weight_source,
                    "Boundary_Provenance": provenance[pwsid],
                })

    missing_pws = sorted(cohort - retained_pws)
    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_archive": str(args.boundary_archive.resolve()),
        "source_archive_sha256": sha256(args.boundary_archive),
        "source_member": MEMBER,
        "source_rows": source_rows,
        "cohort_pws_expected": len(cohort),
        "cohort_pws_with_crosswalk": len(retained_pws),
        "cohort_pws_missing_crosswalk": missing_pws,
        "retained_crosswalk_rows": retained_rows,
        "unique_2020_block_groups": len(retained_geoids),
        "rows_missing_building_weight": missing_building_weight_rows,
        "rows_with_zero_bg_buildings": zero_buildings_rows,
        "preferred_weight_source_counts": dict(weight_source_counts),
        "output": str(output_path.resolve()),
        "output_sha256": sha256(output_path),
        "interpretation": (
            "EPA version 3 CWS-to-2020 Census block-group crosswalk. Building-"
            "footprint weights are primary; area weights are retained and used only "
            "where an EPA building weight is unavailable."
        ),
    }
    report_path = args.output_dir / "ucmr5_epa_census_crosswalk_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "source_rows": source_rows,
        "retained_rows": retained_rows,
        "cohort_pws_expected": len(cohort),
        "cohort_pws_with_crosswalk": len(retained_pws),
        "unique_block_groups": len(retained_geoids),
        "weight_sources": dict(weight_source_counts),
    }, indent=2))


if __name__ == "__main__":
    main()
