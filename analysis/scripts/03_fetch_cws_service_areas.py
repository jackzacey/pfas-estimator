#!/usr/bin/env python3
"""Fetch EPA community-water-system service-area attributes and join UCMR PWSIDs.

The script queries the official EPA ArcGIS Feature Service in deterministic pages,
stores a frozen attribute snapshot, and writes UCMR linkage diagnostics. Geometry
is intentionally deferred to the Census-overlay stage so this audit stays small.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SERVICE_URL = (
    "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/"
    "Water_System_Boundaries/FeatureServer/0"
)
FIELDS = (
    "OBJECTID,PWSID,PWS_Name,Primacy_Agency,Pop_Cat_5,"
    "Population_Served_Count,Service_Connections_Count,Model_Method,"
    "Service_Area_Type,Symbology_Field,Original_Data_Provider,"
    "Data_Provider_Type,Data_Source,Modification_Method,Feature_Type,"
    "Method_Details,Verification_Status,Original_Data_Created_Date,Confirmed,"
    "Area_SqKM"
)


def ssl_context() -> ssl.SSLContext:
    """Return a verified TLS context, including framework-Python on macOS."""
    defaults = ssl.get_default_verify_paths()
    if defaults.cafile:
        return ssl.create_default_context()
    macos_bundle = Path("/etc/ssl/cert.pem")
    if macos_bundle.is_file():
        return ssl.create_default_context(cafile=str(macos_bundle))
    return ssl.create_default_context()


SSL_CONTEXT = ssl_context()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ucmr-all", required=True, type=Path)
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "data" / "raw" / "epa_service_areas",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "outputs",
    )
    parser.add_argument("--page-size", type=int, default=2000)
    return parser.parse_args()


def request_json(url: str, params: dict[str, str | int], attempts: int = 4) -> dict[str, Any]:
    encoded = urllib.parse.urlencode(params)
    request = urllib.request.Request(
        f"{url}?{encoded}",
        headers={"User-Agent": "PFAS-AJPH-reproducible-analysis/0.1"},
    )
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=120, context=SSL_CONTEXT) as response:
                payload = json.load(response)
            if "error" in payload:
                raise RuntimeError(payload["error"])
            return payload
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")


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


def fetch_features(page_size: int) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    metadata = request_json(SERVICE_URL, {"f": "json"})
    features: list[dict[str, Any]] = []
    offset = 0
    while True:
        payload = request_json(
            f"{SERVICE_URL}/query",
            {
                "where": "1=1",
                "outFields": FIELDS,
                "returnGeometry": "false",
                "orderByFields": "OBJECTID ASC",
                "resultOffset": offset,
                "resultRecordCount": page_size,
                "f": "json",
            },
        )
        page = [feature["attributes"] for feature in payload.get("features", [])]
        features.extend(page)
        if len(page) < page_size:
            break
        offset += len(page)
    return metadata, features


def main() -> None:
    args = parse_args()
    if not args.ucmr_all.is_file():
        raise FileNotFoundError(args.ucmr_all)
    args.raw_dir.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    ucmr_systems = read_ucmr_systems(args.ucmr_all)
    service_metadata, features = fetch_features(args.page_size)
    by_pwsid: dict[str, dict[str, Any]] = {}
    duplicate_pwsids: list[str] = []
    for feature in features:
        pwsid = str(feature.get("PWSID") or "").strip()
        if not pwsid:
            continue
        if pwsid in by_pwsid:
            duplicate_pwsids.append(pwsid)
        by_pwsid[pwsid] = feature

    snapshot = {
        "fetched_utc": datetime.now(tz=timezone.utc).isoformat(),
        "service_url": SERVICE_URL,
        "service_item_id": service_metadata.get("serviceItemId"),
        "service_name": service_metadata.get("name"),
        "service_description": service_metadata.get("serviceDescription"),
        "copyright_text": service_metadata.get("copyrightText"),
        "max_record_count": service_metadata.get("maxRecordCount"),
        "features": features,
    }
    snapshot_path = args.raw_dir / "epa_cws_service_area_attributes.json"
    snapshot_path.write_text(json.dumps(snapshot, indent=2), encoding="utf-8")

    rows: list[dict[str, Any]] = []
    unmatched: list[dict[str, str]] = []
    for pwsid, ucmr in sorted(ucmr_systems.items()):
        feature = by_pwsid.get(pwsid)
        if feature is None:
            unmatched.append({"pwsid": pwsid, **ucmr})
            continue
        rows.append({
            "pwsid": pwsid,
            **ucmr,
            **{key: value for key, value in feature.items()},
        })

    matched_path = args.output_dir / "ucmr5_cws_service_area_attributes.csv"
    matched_fields = [
        "pwsid", "ucmr_pws_name", "ucmr_size", "ucmr_state", "ucmr_region",
        *[field for field in FIELDS.split(",") if field not in {"PWSID"}],
    ]
    with matched_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=matched_fields, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    unmatched_path = args.output_dir / "ucmr5_without_cws_service_area.csv"
    with unmatched_path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["pwsid", "ucmr_pws_name", "ucmr_size", "ucmr_state", "ucmr_region"],
        )
        writer.writeheader()
        writer.writerows(unmatched)

    provenance_counts: dict[str, int] = {}
    for row in rows:
        provenance = str(row.get("Symbology_Field") or "MISSING")
        provenance_counts[provenance] = provenance_counts.get(provenance, 0) + 1

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_url": SERVICE_URL,
        "service_item_id": service_metadata.get("serviceItemId"),
        "snapshot": str(snapshot_path.resolve()),
        "snapshot_sha256": sha256(snapshot_path),
        "service_features": len(features),
        "service_unique_pwsids": len(by_pwsid),
        "service_duplicate_pwsids": sorted(set(duplicate_pwsids)),
        "ucmr_unique_pwsids": len(ucmr_systems),
        "ucmr_matched_to_cws_service_area": len(rows),
        "ucmr_not_matched_to_cws_service_area": len(unmatched),
        "matched_boundary_provenance": provenance_counts,
        "interpretation": (
            "An unmatched UCMR PWS is not necessarily missing data: UCMR includes "
            "noncommunity systems, while this service layer is the CWS universe."
        ),
    }
    report_path = args.output_dir / "ucmr5_cws_service_area_linkage.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {snapshot_path}")
    print(f"Wrote {matched_path}")
    print(f"Wrote {unmatched_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "service_features": len(features),
        "ucmr_pws": len(ucmr_systems),
        "matched": len(rows),
        "unmatched": len(unmatched),
        "provenance": provenance_counts,
    }, indent=2))


if __name__ == "__main__":
    main()
