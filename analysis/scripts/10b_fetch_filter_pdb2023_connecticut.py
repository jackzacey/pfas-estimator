#!/usr/bin/env python3
"""Freeze a Connecticut-only geography fallback from the 2023 Census PDB.

The 2024 ACS and PDB use Connecticut's new planning-region county equivalents,
while EPA's service-area crosswalk uses original 2020 Census block-group
GEOIDs. The 2023 PDB retains those original 2020 GEOIDs and supplies aligned
2017–2021 ACS characteristics plus 2020 urban/rural counts. It is used only for
Connecticut and is flagged as an older-vintage fallback.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import shutil
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


URL = "https://www2.census.gov/adrm/PDB/2023/pdb2023bg.csv"
FIELDS = [
    "GIDBG",
    "Tot_Population_ACS_17_21", "Tot_Population_ACSMOE_17_21",
    "Hispanic_ACS_17_21", "Hispanic_ACSMOE_17_21",
    "NH_White_alone_ACS_17_21", "NH_White_alone_ACSMOE_17_21",
    "NH_Blk_alone_ACS_17_21", "NH_Blk_alone_ACSMOE_17_21",
    "NH_AIAN_alone_ACS_17_21", "NH_AIAN_alone_ACSMOE_17_21",
    "NH_Asian_alone_ACS_17_21", "NH_Asian_alone_ACSMOE_17_21",
    "NH_NHOPI_alone_ACS_17_21", "NH_NHOPI_alone_ACSMOE_17_21",
    "NH_SOR_alone_ACS_17_21", "NH_SOR_alone_ACSMOE_17_21",
    "NH_Multi_Races_ACS_17_21", "NH_Multi_Races_ACSMOE_17_21",
    "Pov_Univ_ACS_17_21", "Pov_Univ_ACSMOE_17_21",
    "Prs_Blw_Pov_Lev_ACS_17_21", "Prs_Blw_Pov_Lev_ACSMOE_17_21",
    "Med_HHD_Inc_BG_ACS_17_21", "Med_HHD_Inc_BG_ACSMOE_17_21",
    "Tot_Population_CEN_2020", "URBAN_POP_CEN_2020", "RURAL_POP_CEN_2020",
]


def parse_args() -> argparse.Namespace:
    analysis_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--crosswalk",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "epa_cws_block_group_crosswalk_ucmr5.csv.gz",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=analysis_dir / "data" / "raw" / "census_pdb2023",
    )
    parser.add_argument(
        "--derived-dir", type=Path, default=analysis_dir / "data" / "derived"
    )
    parser.add_argument(
        "--output-dir", type=Path, default=analysis_dir / "outputs"
    )
    return parser.parse_args()


def ssl_context() -> ssl.SSLContext:
    defaults = ssl.get_default_verify_paths()
    if defaults.cafile:
        return ssl.create_default_context()
    bundle = Path("/etc/ssl/cert.pem")
    if bundle.is_file():
        return ssl.create_default_context(cafile=str(bundle))
    return ssl.create_default_context()


SSL_CONTEXT = ssl_context()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(destination: Path) -> dict[str, Any]:
    headers: dict[str, str] = {}
    if not destination.is_file():
        partial = destination.with_suffix(destination.suffix + ".partial")
        request = urllib.request.Request(
            URL,
            headers={"User-Agent": "PFAS-AJPH-reproducible-analysis/0.2"},
        )
        with urllib.request.urlopen(request, timeout=600, context=SSL_CONTEXT) as response:
            headers = dict(response.headers.items())
            with partial.open("wb") as output:
                shutil.copyfileobj(response, output, length=1024 * 1024)
        partial.replace(destination)
    return {
        "url": URL,
        "path": str(destination.resolve()),
        "bytes": destination.stat().st_size,
        "sha256": sha256(destination),
        "response_headers_on_download": headers,
    }


def clean_numeric(value: str) -> str:
    value = value.strip().replace("$", "").replace(",", "")
    if value in {"", "-", "N", "NA", "N/A"}:
        return ""
    return value


def main() -> None:
    args = parse_args()
    if not args.crosswalk.is_file():
        raise FileNotFoundError(args.crosswalk)
    for directory in (args.raw_dir, args.derived_dir, args.output_dir):
        directory.mkdir(parents=True, exist_ok=True)

    connecticut_geoids: set[str] = set()
    with gzip.open(args.crosswalk, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            geoid = row["GEOID20"]
            if geoid.startswith("09"):
                connecticut_geoids.add(geoid)

    source_path = args.raw_dir / "pdb2023bg.csv"
    manifest = download(source_path)
    output_path = args.derived_dir / "pdb2023_connecticut_crosswalk_block_groups.csv.gz"
    source_rows = 0
    retained_geoids: set[str] = set()
    with source_path.open("r", encoding="utf-8-sig", errors="strict", newline="") as source, gzip.open(
        output_path, "wt", encoding="utf-8", newline="", compresslevel=6
    ) as output:
        reader = csv.DictReader(source)
        missing_fields = set(FIELDS) - set(reader.fieldnames or [])
        if missing_fields:
            raise ValueError(f"2023 Planning Database fields missing: {sorted(missing_fields)}")
        writer = csv.DictWriter(output, fieldnames=FIELDS)
        writer.writeheader()
        for row in reader:
            source_rows += 1
            geoid = row["GIDBG"].strip()
            if geoid not in connecticut_geoids:
                continue
            retained_geoids.add(geoid)
            writer.writerow({
                field: row[field] if field == "GIDBG" else clean_numeric(row[field])
                for field in FIELDS
            })

    missing = sorted(connecticut_geoids - retained_geoids)
    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_manifest": manifest,
        "product": "2023 Census Planning Database block-group file",
        "fallback_scope": "Connecticut 2020 block groups only",
        "acs_vintage_in_product": "2017-2021 ACS 5-year",
        "geography_vintage": "Original 2020 Census block groups",
        "source_rows": source_rows,
        "connecticut_crosswalk_geoids_expected": len(connecticut_geoids),
        "connecticut_crosswalk_geoids_retained": len(retained_geoids),
        "connecticut_crosswalk_geoids_missing": len(missing),
        "first_missing_geoids": missing[:100],
        "selected_fields": FIELDS,
        "output": str(output_path.resolve()),
        "output_sha256": sha256(output_path),
        "interpretation": (
            "Older-vintage, geography-aligned fallback used only because current ACS/PDB "
            "GEOIDs reflect Connecticut's planning-region county equivalents."
        ),
    }
    report_path = args.output_dir / "pdb2023_connecticut_fallback_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")
    if missing:
        raise RuntimeError(json.dumps(report, indent=2))
    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "source_rows": source_rows,
        "expected": len(connecticut_geoids),
        "retained": len(retained_geoids),
        "missing": len(missing),
        "source_bytes": manifest["bytes"],
    }, indent=2))


if __name__ == "__main__":
    main()
