#!/usr/bin/env python3
"""Build website-only monitoring dates from the frozen UCMR 5 source.

The manuscript and system-level outcomes remain in the locked v0.2 release.
This additive sidecar gives the public lookup enough context to identify when
each water system's displayed annual average was sampled.
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


RELEASE_ID = "ucmr5-2026-01-15-analysis-v0.2"
DISPLAYED_PFAS = {"PFOA", "PFOS", "PFHxS", "PFNA", "HFPO-DA", "PFBS"}


def parse_args() -> argparse.Namespace:
    analysis_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--all",
        required=True,
        type=Path,
        dest="all_path",
        help="Frozen UCMR5_All.txt used for the January 2026 research release",
    )
    parser.add_argument(
        "--lookup",
        type=Path,
        default=analysis_dir
        / "exports"
        / "ucmr5_jan2026_v0_2"
        / "website_lookup_compact.json",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=analysis_dir
        / "exports"
        / "ucmr5_jan2026_v0_2"
        / "website_monitoring_periods.json",
    )
    return parser.parse_args()


def parse_date(value: str) -> datetime:
    return datetime.strptime(value.strip(), "%m/%d/%Y")


def main() -> None:
    args = parse_args()
    if not args.all_path.is_file():
        raise FileNotFoundError(args.all_path)
    if not args.lookup.is_file():
        raise FileNotFoundError(args.lookup)

    lookup = json.loads(args.lookup.read_text(encoding="utf-8"))
    if lookup.get("release_id") != RELEASE_ID:
        raise ValueError("Lookup file is not the expected frozen research release")

    pwsid_index = lookup["columns"].index("pwsid")
    published_pwsids = {str(row[pwsid_index]) for row in lookup["systems"]}
    dates: dict[str, set[datetime]] = defaultdict(set)
    events: dict[str, set[tuple[str, str, str, datetime]]] = defaultdict(set)

    with args.all_path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            pwsid = row["PWSID"].strip()
            if pwsid not in published_pwsids or row["Contaminant"].strip() not in DISPLAYED_PFAS:
                continue
            collected = parse_date(row["CollectionDate"])
            dates[pwsid].add(collected)
            events[pwsid].add(
                (
                    row["FacilityID"].strip(),
                    row["SamplePointID"].strip(),
                    row["SampleEventCode"].strip(),
                    collected,
                )
            )

    missing = sorted(published_pwsids - dates.keys())
    if missing:
        raise ValueError(f"Published systems without displayed-PFAS monitoring dates: {len(missing)}")

    rows = []
    for pwsid in sorted(published_pwsids):
        ordered = sorted(dates[pwsid])
        years = sorted({date.year for date in ordered})
        rows.append(
            [
                pwsid,
                ordered[0].date().isoformat(),
                ordered[-1].date().isoformat(),
                ",".join(str(year) for year in years),
                len(events[pwsid]),
            ]
        )

    payload = {
        "release_id": RELEASE_ID,
        "source": "Frozen EPA UCMR 5 occurrence records received through January 15, 2026",
        "columns": [
            "pwsid",
            "monitoring_start",
            "monitoring_end",
            "monitoring_years",
            "sampling_event_count",
        ],
        "systems": rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )
    print(f"Wrote {args.output} ({len(rows):,} systems)")


if __name__ == "__main__":
    main()
