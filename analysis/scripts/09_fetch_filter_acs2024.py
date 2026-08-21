#!/usr/bin/env python3
"""Freeze selected 2020–2024 ACS 5-year tables and filter to EPA crosswalk BGs."""

from __future__ import annotations

import argparse
import csv
import gzip
import hashlib
import json
import shutil
import sqlite3
import ssl
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BASE_URL = (
    "https://www2.census.gov/programs-surveys/acs/summary_file/2024/"
    "table-based-SF/data/5YRData"
)
TABLES = {
    "b03002": [
        "B03002_E001", "B03002_M001",  # total
        "B03002_E003", "B03002_M003",  # non-Hispanic White
        "B03002_E004", "B03002_M004",  # non-Hispanic Black
        "B03002_E005", "B03002_M005",  # non-Hispanic AIAN
        "B03002_E006", "B03002_M006",  # non-Hispanic Asian
        "B03002_E007", "B03002_M007",  # non-Hispanic NHPI
        "B03002_E008", "B03002_M008",  # non-Hispanic other race
        "B03002_E009", "B03002_M009",  # non-Hispanic two or more races
        "B03002_E012", "B03002_M012",  # Hispanic or Latino
    ],
    "c17002": [
        "C17002_E001", "C17002_M001",  # poverty-status universe
        "C17002_E002", "C17002_M002",  # ratio under 0.50
        "C17002_E003", "C17002_M003",  # ratio 0.50–0.99
    ],
    "b15003": [
        "B15003_E001", "B15003_M001",  # population age 25+
        *[
            f"B15003_{kind}{line:03d}"
            for line in range(2, 17)  # no high-school diploma
            for kind in ("E", "M")
        ],
    ],
    "b19013": [
        "B19013_E001", "B19013_M001",  # median household income
    ],
    "b11001": [
        "B11001_E001", "B11001_M001",  # households
    ],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--crosswalk",
        type=Path,
        default=analysis_dir / "data" / "derived" /
        "epa_cws_block_group_crosswalk_ucmr5.csv.gz",
    )
    parser.add_argument(
        "--raw-dir",
        type=Path,
        default=analysis_dir / "data" / "raw" / "acs2024_5yr",
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


def ssl_context() -> ssl.SSLContext:
    defaults = ssl.get_default_verify_paths()
    if defaults.cafile:
        return ssl.create_default_context()
    macos_bundle = Path("/etc/ssl/cert.pem")
    if macos_bundle.is_file():
        return ssl.create_default_context(cafile=str(macos_bundle))
    return ssl.create_default_context()


SSL_CONTEXT = ssl_context()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def download(url: str, destination: Path) -> dict[str, Any]:
    if not destination.is_file():
        partial = destination.with_suffix(destination.suffix + ".partial")
        request = urllib.request.Request(
            url,
            headers={"User-Agent": "PFAS-AJPH-reproducible-analysis/0.1"},
        )
        with urllib.request.urlopen(request, timeout=300, context=SSL_CONTEXT) as response:
            headers = dict(response.headers.items())
            with partial.open("wb") as output:
                shutil.copyfileobj(response, output, length=1024 * 1024)
        partial.replace(destination)
    else:
        headers = {}
    return {
        "url": url,
        "path": str(destination.resolve()),
        "bytes": destination.stat().st_size,
        "sha256": sha256(destination),
        "response_headers_on_download": headers,
    }


def normalize_number(value: str) -> str | None:
    value = value.strip()
    if not value:
        return None
    try:
        numeric = float(value)
    except ValueError as error:
        raise ValueError(f"Unexpected ACS numeric value: {value!r}") from error
    if numeric <= -100000000:
        return None
    return value


def main() -> None:
    args = parse_args()
    if not args.crosswalk.is_file():
        raise FileNotFoundError(args.crosswalk)
    for directory in (args.raw_dir, args.derived_dir, args.output_dir):
        directory.mkdir(parents=True, exist_ok=True)

    geoids: set[str] = set()
    with gzip.open(args.crosswalk, "rt", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            geoids.add(row["GEOID20"])

    database_path = args.derived_dir / "acs2024_crosswalk_block_groups.sqlite"
    connection = sqlite3.connect(database_path)
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("DROP TABLE IF EXISTS crosswalk_geoids")
    connection.execute("CREATE TABLE crosswalk_geoids (geoid TEXT PRIMARY KEY)")
    connection.executemany(
        "INSERT INTO crosswalk_geoids (geoid) VALUES (?)",
        ((geoid,) for geoid in sorted(geoids)),
    )
    connection.commit()

    source_manifest: dict[str, Any] = {}
    table_audits: dict[str, Any] = {}
    for table, variables in TABLES.items():
        filename = f"acsdt5y2024-{table}.dat"
        url = f"{BASE_URL}/{filename}"
        path = args.raw_dir / filename
        source_manifest[table] = download(url, path)

        connection.execute(f"DROP TABLE IF EXISTS {table}")
        columns_sql = ", ".join(f'"{variable}" REAL' for variable in variables)
        connection.execute(f"CREATE TABLE {table} (geoid TEXT PRIMARY KEY, {columns_sql})")

        source_rows = 0
        block_group_rows = 0
        retained_rows = 0
        missing_value_cells = 0
        insert_sql = (
            f"INSERT INTO {table} (geoid, "
            + ", ".join(f'"{variable}"' for variable in variables)
            + ") VALUES ("
            + ",".join("?" for _ in range(len(variables) + 1))
            + ")"
        )
        batch: list[tuple[Any, ...]] = []
        with path.open("r", encoding="utf-8-sig", errors="strict", newline="") as handle:
            reader = csv.DictReader(handle, delimiter="|")
            missing_columns = set(["GEO_ID", *variables]) - set(reader.fieldnames or [])
            if missing_columns:
                raise ValueError(f"{table} is missing columns: {sorted(missing_columns)}")
            for row in reader:
                source_rows += 1
                geo_id = row["GEO_ID"]
                if not geo_id.startswith("1500000US"):
                    continue
                block_group_rows += 1
                geoid = geo_id.removeprefix("1500000US")
                if geoid not in geoids:
                    continue
                values = [normalize_number(row[variable]) for variable in variables]
                missing_value_cells += sum(value is None for value in values)
                batch.append((geoid, *values))
                retained_rows += 1
                if len(batch) >= 5000:
                    connection.executemany(insert_sql, batch)
                    batch.clear()
            if batch:
                connection.executemany(insert_sql, batch)
        connection.commit()
        table_audits[table] = {
            "source_rows_all_geographies": source_rows,
            "source_block_group_rows": block_group_rows,
            "retained_crosswalk_block_groups": retained_rows,
            "missing_crosswalk_block_groups": len(geoids) - retained_rows,
            "selected_variables": variables,
            "missing_or_suppressed_selected_cells": missing_value_cells,
        }

    selected_columns: list[str] = []
    for table, variables in TABLES.items():
        selected_columns.extend(f'{table}."{variable}"' for variable in variables)
    join_sql = "SELECT g.geoid, " + ", ".join(selected_columns) + " FROM crosswalk_geoids g "
    for table in TABLES:
        join_sql += f"LEFT JOIN {table} ON {table}.geoid = g.geoid "
    join_sql += "ORDER BY g.geoid"

    output_path = args.derived_dir / "acs2024_crosswalk_block_group_characteristics.csv.gz"
    output_fields = ["geoid20", *[variable for variables in TABLES.values() for variable in variables]]
    with gzip.open(output_path, "wt", encoding="utf-8", newline="", compresslevel=6) as handle:
        writer = csv.writer(handle)
        writer.writerow(output_fields)
        for row in connection.execute(join_sql):
            writer.writerow(row)

    missing_by_table = {
        table: connection.execute(
            f"SELECT COUNT(*) FROM crosswalk_geoids g "
            f"LEFT JOIN {table} ON {table}.geoid=g.geoid WHERE {table}.geoid IS NULL"
        ).fetchone()[0]
        for table in TABLES
    }
    connection.close()

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "acs_product": "2020-2024 ACS 5-year Detailed Tables",
        "source_base_url": BASE_URL,
        "crosswalk_unique_2020_block_groups": len(geoids),
        "source_manifest": source_manifest,
        "table_audits": table_audits,
        "crosswalk_geoids_missing_by_table": missing_by_table,
        "output": str(output_path.resolve()),
        "output_sha256": sha256(output_path),
        "interpretation": (
            "Selected ACS estimates and margins of error for 2020 Census block "
            "groups used by EPA's CWS crosswalk. Negative ACS special values are "
            "stored as missing."
        ),
    }
    report_path = args.output_dir / "acs2024_crosswalk_block_group_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps({
        "crosswalk_block_groups": len(geoids),
        "missing_by_table": missing_by_table,
        "source_bytes": {table: item["bytes"] for table, item in source_manifest.items()},
    }, indent=2))


if __name__ == "__main__":
    main()
