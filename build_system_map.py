#!/usr/bin/env python3
"""Freeze EPA service-area centroids joined by exact PWSID, never by ZIP/name.

Run --fetch once; rebuilding from --snapshot is offline and deterministic.
The snapshot and SDWIS CSV are reference inputs, never modified by this script.
"""
import argparse
import concurrent.futures
import csv
import hashlib
import json
import math
import ssl
import time
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LAYER = 'https://services.arcgis.com/cJ9YHowT8TU7DUyn/arcgis/rest/services/Water_System_Boundaries/FeatureServer/0'
LOOKUP = ROOT / 'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json'


def main():
    p = argparse.ArgumentParser(__doc__)
    p.add_argument('--snapshot', type=Path, required=True)
    p.add_argument('--cities', type=Path, required=True)
    p.add_argument('--fetch', action='store_true')
    p.add_argument('--resume', action='store_true', help='Reuse cached batches when resuming an interrupted fetch')
    args = p.parse_args()
    lookup = json.loads(LOOKUP.read_text())
    systems = {r[0]: dict(zip(lookup['columns'], r)) for r in lookup['systems']}
    if args.fetch:
        context = ssl.create_default_context(cafile='/etc/ssl/cert.pem')
        def batch(ids):
            cache = args.snapshot.parent / 'epa-batches' / (hashlib.sha256(','.join(ids).encode()).hexdigest() + '.json')
            if args.resume and cache.exists():
                return json.loads(cache.read_text())
            params = {'where': 'PWSID IN (' + ','.join("'" + i + "'" for i in ids) + ')',
                      'outFields': 'OBJECTID,PWSID,Symbology_Field,Area_SqKM',
                      'returnGeometry': 'false', 'returnCentroid': 'true', 'outSR': '4326', 'f': 'json'}
            url = LAYER + '/query?' + urllib.parse.urlencode(params)
            for attempt in range(4):
                try:
                    with urllib.request.urlopen(url, context=context, timeout=45) as response:
                        data = json.load(response)
                    if 'error' in data or data.get('exceededTransferLimit'):
                        raise ValueError(data)
                    if not isinstance(data.get('features'), list):
                        raise ValueError('EPA response has no feature list')
                    features = data['features']
                    if any(f['attributes']['PWSID'] not in ids for f in features):
                        raise ValueError('Unexpected system ID in EPA response')
                    cache.parent.mkdir(parents=True, exist_ok=True)
                    cache.write_text(json.dumps(features))
                    return features
                except Exception:
                    if attempt == 3:
                        raise
                    time.sleep(2 ** attempt)
        ids = sorted(systems)
        chunks = [ids[n:n + 75] for n in range(0, len(ids), 75)]
        features = []
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            for n, rows in enumerate(pool.map(batch, chunks), 1):
                features.extend(rows)
                print(f'EPA batches {n}/{len(chunks)}', flush=True)
        snapshot = {'retrieved_utc': datetime.now(timezone.utc).isoformat(), 'source': LAYER,
                    'features': sorted(features, key=lambda f: (f['attributes']['PWSID'], f['attributes']['OBJECTID']))}
        args.snapshot.parent.mkdir(parents=True, exist_ok=True)
        args.snapshot.write_text(json.dumps(snapshot, separators=(',', ':')) + '\n')
    snapshot = json.loads(args.snapshot.read_text())
    assert snapshot['source'] == LAYER
    with args.cities.open(newline='', encoding='utf-8-sig') as f:
        cities = {r['pwsid']: r.get('cities_served', '').strip() for r in csv.DictReader(f)}
    grouped = {}
    invalid = []
    for feature in snapshot['features']:
        a = feature['attributes']
        point = feature.get('centroid') or {}
        lon, lat = point.get('x'), point.get('y')
        if not isinstance(lon, (int, float)) or not isinstance(lat, (int, float)) or not math.isfinite(lon + lat) or not -180 <= lon <= 180 or not -85 <= lat <= 85:
            invalid.append(a['PWSID'])
            continue
        if a['PWSID'] in systems:
            grouped.setdefault(a['PWSID'], []).append(feature)
    locations = {}
    for pwsid, features in sorted(grouped.items()):
        # Multipart/duplicate records remain ONE marker. Choose the largest area,
        # deterministically, rather than averaging coordinates into an ocean.
        f = max(features, key=lambda f: (f['attributes'].get('Area_SqKM') or 0, -f['attributes']['OBJECTID']))
        a, point = f['attributes'], f['centroid']
        locations[pwsid] = [round(point['x'], 6), round(point['y'], 6), cities.get(pwsid, ''), a.get('Symbology_Field', ''), a['OBJECTID']]
    missing = sorted(set(systems) - locations.keys())
    output = {'release_id': lookup['release_id'], 'lookup_sha256': hashlib.sha256(LOOKUP.read_bytes()).hexdigest(),
              'source': LAYER, 'retrieved_utc': snapshot['retrieved_utc'], 'location_method': 'EPA service-area centroid; approximate, not a sampling site or exact service boundary',
              'city_source': 'Frozen EPA ECHO/SDWIS system metadata, August 12, 2026; communities served, not a marker address',
              'snapshot_sha256': hashlib.sha256(args.snapshot.read_bytes()).hexdigest(),
              'city_source_sha256': hashlib.sha256(args.cities.read_bytes()).hexdigest(),
              'columns': ['longitude', 'latitude', 'communities_served', 'boundary_source', 'boundary_objectid'],
              'locations': locations}
    audit = {'release_id': lookup['release_id'], 'systems': len(systems), 'mapped': len(locations),
             'unmapped': len(missing), 'missing_system_ids': missing, 'invalid_centroid_ids': sorted(set(invalid)),
             'multiple_geometry_ids': sorted(k for k, v in grouped.items() if len(v) > 1),
             'mapped_by_state': dict(sorted(Counter(systems[k]['sdwis_state_code'] for k in locations).items())),
             'unmapped_by_state': dict(sorted(Counter(systems[k]['sdwis_state_code'] for k in missing).items())),
             'boundary_sources': dict(Counter(row[3] for row in locations.values())),
             'with_reported_communities': sum(bool(row[2]) for row in locations.values())}
    (ROOT / 'data/system-map-locations.json').write_text(json.dumps(output, separators=(',', ':')) + '\n')
    (ROOT / 'data/system-map-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
    print(json.dumps({k: v for k, v in audit.items() if not isinstance(v, (list, dict))}, indent=2))


if __name__ == '__main__':
    main()
