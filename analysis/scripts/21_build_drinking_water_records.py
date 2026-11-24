#!/usr/bin/env python3
"""Build dated lithium and lead/copper lookup records, separate from PFAS averages.

No household exposure estimates or new regulatory flags are calculated. ZIPs are
reported service associations, never mailing-address ZIPs or proximity matches.
"""
import argparse
import csv
import hashlib
import io
import json
from collections import Counter, defaultdict
from datetime import datetime
from decimal import Decimal, InvalidOperation
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]
RELEASE = 'drinking-water-2026-11-23-v1'
LI_HASH = '6cf16a9b1b71a1a3084e203ee46ed788b51edad31dc411805694ea74dfa8d061'

def sha(path):
    with Path(path).open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def bucket(pwsid):
    value = 0
    for c in pwsid:
        value = (value * 31 + ord(c)) % 128
    return f'{value:02x}'

def date(value):
    if not value:
        return None
    try:
        return datetime.strptime(value, '%m/%d/%Y').date().isoformat()
    except ValueError:
        return None

def concentration(value, multiplier=1):
    try:
        n = Decimal(value)
        return float(n * multiplier) if n.is_finite() and n >= 0 else None
    except InvalidOperation:
        return None

def lcr_record(row, source_row):
    """Blank source signs are retained as unspecified, not converted to detects."""
    sign = row['RESULT_SIGN_CODE'].strip()
    n = concentration(row['SAMPLE_MEASURE'], 1000)
    start, end = date(row['SAMPLING_START_DATE']), date(row['SAMPLING_END_DATE'])
    if row['UNIT_OF_MEASURE'] != 'mg/L' or sign not in ('', '=', '<', 'E', 'L') or n is None or not end or (start and start > end):
        return None
    return [start, end, n, '<' if sign in ('<', 'L') else '=' if sign in ('=', 'E') else '',
            row['SAMPLE_ID'], row['SAR_ID'], source_row]

def recent_periods(records, limit=5):
    """Keep all records in the latest periods, including conflicting values."""
    periods = sorted({(r[1], r[0] or '') for r in records}, reverse=True)[:limit]
    return sorted([r for r in records if (r[1], r[0] or '') in periods],
                  key=lambda r: (r[1], r[0] or '', r[4], r[5]), reverse=True)

def build(ucmr, sdwa, output):
    if sha(ucmr / 'UCMR5_All.txt') != LI_HASH:
        raise ValueError('UCMR source differs from the verified final website release')
    systems = {}
    audit = Counter()
    snapshots = set()
    with zipfile.ZipFile(sdwa) as archive:
        def rows(name):
            with archive.open(name) as f:
                yield from csv.DictReader(io.TextIOWrapper(f, encoding='utf-8-sig'))
        for row in rows('SDWA_PUB_WATER_SYSTEMS.csv'):
            p = row['PWSID']
            if p in systems:
                raise ValueError(f'Duplicate system {p}')
            snapshots.add(row['SUBMISSIONYEARQUARTER'])
            systems[p] = dict(id=p, name=row['PWS_NAME'], state=row['STATE_CODE'],
                              active=row['PWS_ACTIVITY_CODE'], type=row['PWS_TYPE_CODE'],
                              wholesale=row['IS_WHOLESALER_IND'], lithium=[], lead=[], copper=[])
        for line, row in enumerate(rows('SDWA_LCR_SAMPLES.csv'), 2):
            audit['lcr_source_rows'] += 1
            if row['SUBMISSIONYEARQUARTER'] not in snapshots:
                raise ValueError('Snapshot mismatch')
            chemical = {'PB90': 'lead', 'CU90': 'copper'}.get(row['CONTAMINANT_CODE'])
            s = systems.get(row['PWSID'])
            if not s or not chemical:
                audit['lcr_unmatched_rows'] += 1
                continue
            rec = lcr_record(row, line)
            if rec is None:
                audit['lcr_invalid_or_undated_rows'] += 1
                continue
            s[chemical].append(rec)
            audit[f'{chemical}_valid_rows'] += 1
            audit['lcr_unspecified_sign_rows'] += rec[3] == ''
        if len(snapshots) != 1:
            raise ValueError('Expected one quarterly snapshot')
        # Active and inactive systems remain discoverable; each status is shown.
        for s in systems.values():
            for chemical in ('lead', 'copper'):
                s[chemical + '_periods'] = len({(r[0], r[1]) for r in s[chemical]})
                s[chemical] = recent_periods(s[chemical])
        with (ucmr / 'UCMR5_All.txt').open(encoding='cp1252', newline='') as f:
            for line, row in enumerate(csv.DictReader(f, delimiter='\t'), 2):
                if row['Contaminant'].lower() != 'lithium':
                    continue
                audit['lithium_source_rows'] += 1
                if row['Units'] not in ('µg/L', 'ug/L') or row['AnalyticalResultsSign'] not in ('=', '<'):
                    raise ValueError('Unexpected lithium units or analytical sign')
                sign = row['AnalyticalResultsSign']
                n = concentration(row['MRL'] if sign == '<' else row['AnalyticalResultValue'])
                d = date(row['CollectionDate'])
                if n is None or not d:
                    raise ValueError('Invalid lithium sample')
                s = systems.setdefault(row['PWSID'], dict(id=row['PWSID'], name=row['PWSName'],
                    state='', active='', type='', wholesale='', lithium=[], lead=[], copper=[]))
                s['lithium'].append([d, n, sign, row['FacilityID'], row['SamplePointID'],
                    row['SampleID'], row['SampleEventCode'], line])
        systems = {p: s for p, s in systems.items() if any(s[k] for k in ('lithium', 'lead', 'copper'))}
        zip_links = defaultdict(lambda: {'lithium': set(), 'lcr': set()})
        review = json.loads((ROOT / 'analysis/exports/ucmr5_final_aug2026_v1/zip-association-reviews.json').read_text())
        exclusions = {(z, r['pwsid']) for r in review['reviews'] for z in r.get('excluded_zips', [])}
        pending = {(z, p) for z, ids in review['pending_associations'].items() for p in ids}
        roles = review.get('association_roles', {})
        for row in rows('SDWA_GEOGRAPHIC_AREAS.csv'):
            p, z = row['PWSID'], row['ZIP_CODE_SERVED'].strip()
            if p in systems and len(z) == 5 and z.isdigit() and (z, p) not in exclusions | pending:
                if systems[p]['lead'] or systems[p]['copper']:
                    zip_links[z]['lcr'].add(p)
        with (ucmr / 'UCMR5_ZIPCodes.txt').open(encoding='cp1252', newline='') as f:
            for row in csv.DictReader(f, delimiter='\t'):
                p, z = row['PWSID'], row['ZIPCODE'].zfill(5)
                if p in systems and systems[p]['lithium'] and len(z) == 5 and z.isdigit() and (z, p) not in exclusions | pending:
                    zip_links[z]['lithium'].add(p)
        output.mkdir(parents=True, exist_ok=True)
        hashes = {}
        def write(name, data):
            path = output / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({'release_id': RELEASE, **data}, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
            hashes[name] = sha(path)
        shards = defaultdict(dict)
        for p, s in sorted(systems.items()):
            s['lithium'].sort(key=lambda r: (r[0], r[3], r[4], r[5]), reverse=True)
            shards[bucket(p)][p] = s
        for key, ss in sorted(shards.items()):
            write(f'systems/{key}.json', {'systems': ss})
        zip_shards = defaultdict(dict)
        for z, groups in sorted(zip_links.items()):
            zip_shards[z[:3]][z] = {k: sorted(v) for k, v in groups.items()}
        for key, zs in sorted(zip_shards.items()):
            write(f'zip/{key}.json', {'zips': zs})
        write('directory.json', {'systems': [[p, s['name'], s['state'], int(bool(s['lithium'])), int(bool(s['lead'] or s['copper']))] for p, s in sorted(systems.items())]})
        audit.update(systems=len(systems), lithium_systems=sum(bool(s['lithium']) for s in systems.values()),
                     lead_systems=sum(bool(s['lead']) for s in systems.values()), copper_systems=sum(bool(s['copper']) for s in systems.values()),
                     service_zip_codes=len(zip_links))
        manifest = {'release_id': RELEASE, 'sdwis_snapshot': next(iter(snapshots)), 'built_date': '2026-11-23',
            'sources': {'ucmr_all_sha256': sha(ucmr / 'UCMR5_All.txt'), 'ucmr_zip_sha256': sha(ucmr / 'UCMR5_ZIPCodes.txt'),
                        'sdwis_zip_sha256': sha(sdwa)}, 'audit': dict(audit),
            'lithium_columns': ['date', 'value_or_reporting_limit_ug_l', 'sign', 'facility_id', 'sample_point_id', 'sample_id', 'event', 'source_row'],
            'lcr_columns': ['period_start', 'period_end', 'reported_90th_percentile_ug_l', 'sign', 'sample_id', 'sar_id', 'source_row'],
            'rules': ['Lithium samples are not annual averages; nondetects retain reporting-limit bounds.',
                      'LCR mg/L converted exactly to ug/L (ppb); no recalculation of percentiles.',
                      'Most recent five dated periods per system/chemical; all rows retained within each period, even conflicting values.',
                      'Blank LCR analytical signs remain unspecified, not confirmed detects.',
                      'Only reported service ZIPs; no mailing-address ZIPs or proximity substitutions. Known pending/excluded associations omitted.',
                      'No action-level, compliance, household exposure, or safety classifications.'],
            'files': hashes}
        (output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
        print(json.dumps(manifest['audit'], indent=2))
        print('Manifest SHA256:', sha(output / 'manifest.json'))

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--ucmr', required=True, type=Path)
    p.add_argument('--sdwa', required=True, type=Path)
    p.add_argument('--output', type=Path, default=ROOT / 'data/drinking-water')
    a = p.parse_args()
    build(a.ucmr, a.sdwa, a.output)
