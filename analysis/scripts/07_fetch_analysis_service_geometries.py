#!/usr/bin/env python3
"""Freeze EPA service-area polygons for the prespecified demographic cohort."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import ssl
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


QUERY_URL = (
    "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/"
    "Water_System_Boundaries/FeatureServer/0/query"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--cohort",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_cohort.csv",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=analysis_dir / "data" / "raw" / "epa_service_areas",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=analysis_dir / "outputs",
    )
    parser.add_argument("--batch-size", type=int, default=25)
    return parser.parse_args()


def ssl_context() -> ssl.SSLContext:
    defaults = ssl.get_default_verify_paths()
    if defaults.cafile:
        return ssl.create_default_context()
    macos_bundle = Path("/etc/ssl/cert.pem")
    if macos_bundle.is_file():
        return ssl.create_default_context(cafile=str(macos_bundle))
    return ssl.create_default_context()


SSL_CONTEXT = ssl_context()


def request_json(params: dict[str, str], attempts: int = 5) -> dict[str, Any]:
    request = urllib.request.Request(
        f"{QUERY_URL}?{urllib.parse.urlencode(params)}",
        headers={
            "User-Agent": "PFAS-AJPH-reproducible-analysis/0.1",
            "Accept-Encoding": "gzip",
        },
    )
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=180, context=SSL_CONTEXT) as response:
                data = response.read()
                if response.headers.get("Content-Encoding", "").lower() == "gzip":
                    data = gzip.decompress(data)
                payload = json.loads(data)
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


def main() -> None:
    args = parse_args()
    if not args.cohort.is_file():
        raise FileNotFoundError(args.cohort)
    if args.batch_size < 1 or args.batch_size > 100:
        raise ValueError("--batch-size must be 1–100")
    args.raw_dir.mkdir(parents=True, exist_ok=True)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    expected: dict[int, str] = {}
    with args.cohort.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            if row["primary_demographic_cohort"] != "1":
                continue
            objectid = int(row["boundary_objectid"])
            pwsid = row["pwsid"]
            if objectid in expected:
                raise ValueError(f"Duplicate boundary OBJECTID in cohort: {objectid}")
            expected[objectid] = pwsid

    output_path = args.raw_dir / "epa_ucmr5_demographic_cohort_service_areas.geojson.gz"
    partial_path = output_path.with_suffix(output_path.suffix + ".partial")
    received: dict[int, str] = {}
    feature_count = 0
    first = True
    objectids = sorted(expected)

    with gzip.open(partial_path, "wt", encoding="utf-8", compresslevel=6) as handle:
        handle.write('{"type":"FeatureCollection","crs":{"type":"name","properties":{"name":"EPSG:4326"}},"features":[')
        for start in range(0, len(objectids), args.batch_size):
            batch = objectids[start:start + args.batch_size]
            payload = request_json({
                "objectIds": ",".join(str(value) for value in batch),
                "outFields": "OBJECTID,PWSID,Symbology_Field",
                "returnGeometry": "true",
                "returnZ": "false",
                "returnM": "false",
                "outSR": "4326",
                "geometryPrecision": "6",
                "f": "geojson",
            })
            for feature in payload.get("features", []):
                properties = feature.get("properties") or {}
                objectid = int(properties["OBJECTID"])
                pwsid = str(properties["PWSID"])
                if objectid not in expected:
                    raise ValueError(f"Unexpected OBJECTID returned: {objectid}")
                if expected[objectid] != pwsid:
                    raise ValueError(
                        f"PWSID mismatch for OBJECTID {objectid}: "
                        f"expected {expected[objectid]}, received {pwsid}"
                    )
                if objectid in received:
                    raise ValueError(f"Duplicate returned OBJECTID: {objectid}")
                if not feature.get("geometry"):
                    raise ValueError(f"Missing geometry for OBJECTID {objectid}")
                received[objectid] = pwsid
                if not first:
                    handle.write(",")
                handle.write(json.dumps(feature, separators=(",", ":")))
                first = False
                feature_count += 1
        handle.write("]}")

    missing = sorted(set(expected) - set(received))
    if missing:
        raise ValueError(f"Service returned {len(missing)} fewer geometries; first IDs: {missing[:20]}")
    partial_path.replace(output_path)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_url": QUERY_URL,
        "source_layer": "EPA Water System Boundaries FeatureServer/0",
        "source_service_item_id": "80c6912ef14f46e480f5afd807767b4b",
        "selection": "primary_demographic_cohort == 1",
        "geometry_crs": "EPSG:4326",
        "geometry_precision_decimal_degrees": 6,
        "expected_features": len(expected),
        "received_features": feature_count,
        "output": str(output_path.resolve()),
        "output_bytes_gzip": output_path.stat().st_size,
        "output_sha256": sha256(output_path),
        "interpretation": (
            "Frozen EPA service-area geometry for exact PWSIDs in the prespecified "
            "demographic cohort; boundary provenance remains available in the cohort table."
        ),
    }
    report_path = args.output_dir / "ucmr5_analysis_service_geometry_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "features": feature_count,
        "gzip_bytes": output_path.stat().st_size,
        "sha256": report["output_sha256"],
    }, indent=2))


if __name__ == "__main__":
    main()
