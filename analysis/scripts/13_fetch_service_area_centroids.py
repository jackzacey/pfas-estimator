#!/usr/bin/env python3
"""Freeze EPA service-area centroids for spatial residual diagnostics."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


LAYER_URL = (
    "https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/"
    "Water_System_Boundaries/FeatureServer/0"
)


def parse_args() -> argparse.Namespace:
    analysis_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--cohort",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_with_demographics.csv",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=analysis_dir / "outputs"
    )
    parser.add_argument("--batch-size", type=int, default=1000)
    return parser.parse_args()


def fetch_json(url: str, parameters: dict[str, str], attempts: int = 5) -> dict:
    encoded = urllib.parse.urlencode(parameters).encode("utf-8")
    for attempt in range(attempts):
        try:
            request = urllib.request.Request(
                url,
                data=encoded,
                headers={"User-Agent": "PFAS-AJPH-reproducible-analysis/0.2"},
            )
            with urllib.request.urlopen(request, timeout=90) as response:
                payload = json.load(response)
            if "error" in payload:
                raise RuntimeError(payload["error"])
            return payload
        except Exception:
            if attempt == attempts - 1:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("Unreachable")


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(
        args.cohort,
        dtype={"pwsid": str, "boundary_objectid": "Int64"},
        usecols=["pwsid", "boundary_objectid", "primary_demographic_model_cohort"],
    )
    frame = frame[frame["primary_demographic_model_cohort"] == 1].dropna(
        subset=["boundary_objectid"]
    )
    expected = {
        int(row.boundary_objectid): str(row.pwsid).zfill(9)
        for row in frame.itertuples(index=False)
    }

    rows: list[dict[str, object]] = []
    objectids = sorted(expected)
    for start in range(0, len(objectids), args.batch_size):
        batch = objectids[start:start + args.batch_size]
        parameters = {
            "objectIds": ",".join(str(value) for value in batch),
            "outFields": "OBJECTID,PWSID",
            "returnGeometry": "false",
            "returnCentroid": "true",
            "outSR": "4326",
            "f": "json",
        }
        payload = fetch_json(f"{LAYER_URL}/query", parameters)
        for feature in payload.get("features", []):
            attributes = feature["attributes"]
            objectid = int(attributes["OBJECTID"])
            pwsid = str(attributes["PWSID"]).zfill(9)
            centroid = feature.get("centroid") or {}
            if objectid not in expected:
                raise ValueError(f"Unexpected OBJECTID {objectid}")
            if expected[objectid] != pwsid:
                raise ValueError(
                    f"OBJECTID/PWSID mismatch: {objectid} {pwsid} != {expected[objectid]}"
                )
            rows.append({
                "pwsid": pwsid,
                "boundary_objectid": objectid,
                "longitude": centroid.get("x"),
                "latitude": centroid.get("y"),
            })

    result = pd.DataFrame(rows).drop_duplicates(subset=["boundary_objectid"])
    output_path = args.output_dir / "ucmr5_service_area_centroids.csv"
    result.to_csv(output_path, index=False, quoting=csv.QUOTE_MINIMAL)
    missing = sorted(set(expected) - set(result["boundary_objectid"].astype(int)))
    invalid_coordinates = int(result[["longitude", "latitude"]].isna().any(axis=1).sum())
    digest = hashlib.sha256(output_path.read_bytes()).hexdigest()
    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_layer": LAYER_URL,
        "query_parameters": {
            "outFields": "OBJECTID,PWSID",
            "returnGeometry": False,
            "returnCentroid": True,
            "outSR": 4326,
        },
        "expected_boundaries": len(expected),
        "returned_boundaries": len(result),
        "missing_boundary_objectids": missing,
        "invalid_coordinate_rows": invalid_coordinates,
        "output_sha256": digest,
    }
    report_path = args.output_dir / "ucmr5_service_area_centroid_audit.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    if missing or invalid_coordinates:
        raise RuntimeError(json.dumps(report, indent=2))
    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
