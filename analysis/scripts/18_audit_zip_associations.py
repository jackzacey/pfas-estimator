#!/usr/bin/env python3
"""Screen ZIP associations for review, never infer service from state alone.

Uses the project's coarse 3-digit prefix table; flags are candidates, not
confirmed errors. Re-run after updating lookup data or reviewed exclusions.
"""
import argparse
import hashlib
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def audit(root=ROOT):
    release = json.loads((root / 'analysis/exports/ucmr5_jan2026_v0_2/website_lookup_compact.json').read_text())
    prefixes = json.loads((root / 'config/zip_to_state.json').read_text())
    overrides = json.loads((root / 'config/zip-audit-prefix-overrides.json').read_text())
    prefixes.update(overrides['prefix_states'])
    reviews = json.loads((root / 'config/zip-association-reviews.json').read_text())
    source = root / 'analysis/exports/ucmr5_jan2026_v0_2/website_lookup_compact.json'
    if hashlib.sha256(source.read_bytes()).hexdigest() != reviews['source_sha256']:
        raise ValueError('Review evidence must be rechecked for changed lookup data')
    if reviews['release_id'] != release['release_id']:
        raise ValueError('Review file is for a different release')
    removed = {(z, r['pwsid']) for r in reviews['reviews'] for z in r['excluded_zips']}
    systems = {r['pwsid']: r for values in release['systems'] for r in [dict(zip(release['columns'], values))]}
    rows = []
    for zip_code, ids in sorted(release['zip_to_pwsids'].items()):
        zip_state = prefixes.get(zip_code[:3])
        for pwsid in ids:
            system = systems[pwsid]
            if zip_state and zip_state != system['sdwis_state_code']:
                rows.append(dict(zip=zip_code, pwsid=pwsid, system_name=system['ucmr_pws_name'], prefix_state=zip_state,
                    system_state=system['sdwis_state_code'], boundary_provenance=system['boundary_provenance'],
                    decision='reviewed_exclusion' if (zip_code, pwsid) in removed else 'needs_review_retained'))
    return rows

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--update-pending', action='store_true', help='Refresh visible review flags without changing explicit exclusion decisions')
    args = parser.parse_args()
    rows = audit()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open('w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=['zip','pwsid','system_name','prefix_state','system_state','boundary_provenance','decision'], lineterminator='\n')
        writer.writeheader(); writer.writerows(rows)
    print(f'{len(rows)} review candidates; {sum(r["decision"] == "reviewed_exclusion" for r in rows)} reviewed exclusions')

    if args.update_pending:
        review_path = ROOT / 'config/zip-association-reviews.json'
        reviews = json.loads(review_path.read_text())
        pending = {}
        for row in rows:
            if row['decision'] == 'needs_review_retained':
                pending.setdefault(row['zip'], []).append(row['pwsid'])
        reviews['pending_associations'] = pending
        review_path.write_text(json.dumps(reviews, indent=2) + '\n')
