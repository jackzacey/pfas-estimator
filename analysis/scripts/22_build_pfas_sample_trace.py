#!/usr/bin/env python3
"""Expose the exact required-event inputs behind the frozen PFAS reconstruction.

The original PFAS values, classifications, research release, and ZIP links are
never modified. Every reconstructed location/outcome must match the frozen CSV.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = 'pfas-sample-trace-2026-11-23-v1'
spec = importlib.util.spec_from_file_location('final_builder', Path(__file__).with_name('20_build_current_website_release.py'))
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

def bucket(pwsid):
    result = 0
    for c in pwsid:
        result = (result * 31 + ord(c)) % 128
    return f'{result:02x}'

def build(source, output):
    if builder.digest(source) != builder.PINNED_ALL:
        raise ValueError('Not the pinned final EPA occurrence file')
    locations = {}
    observed = defaultdict(lambda: defaultdict(dict))
    count = 0
    with source.open(encoding='cp1252', newline='') as f:
        for line, r in enumerate(csv.DictReader(f, delimiter='\t'), 2):
            chem = r['Contaminant']
            if chem not in builder.CHEMICALS:
                continue
            key = (r['PWSID'], r['FacilityID'], r['SamplePointID'])
            if r['Units'] not in ('µg/L', 'ug/L') or r['AnalyticalResultsSign'] not in ('<', '='):
                raise ValueError('Unknown units/sign')
            value = Decimal(0) if r['AnalyticalResultsSign'] == '<' else Decimal(r['AnalyticalResultValue'])
            event = r['SampleEventCode']
            if event in observed[key][chem]:
                raise ValueError('Duplicate event needs explicit trace handling')
            observed[key][chem][event] = (value, r['AnalyticalResultsSign'] == '=')
            loc = locations.setdefault(key, {'facility': r['FacilityID'], 'point': r['SamplePointID'],
                'name': r['FacilityName'], 'point_name': r['SamplePointName'], 'water': r['FacilityWaterType'], 'samples': []})
            bound = Decimal(r['MRL']) if r['AnalyticalResultsSign'] == '<' else value
            loc['samples'].append([builder.CHEMICALS.index(chem), datetime.strptime(r['CollectionDate'], '%m/%d/%Y').date().isoformat(),
                event, r['AnalyticalResultsSign'], float(bound * 1000), float(value * 1000), r['SampleID'], line])
            count += 1
    frozen = ROOT / 'analysis/exports/ucmr5_final_aug2026_v1/website_location_averages.csv'
    checked = 0
    with frozen.open(newline='') as f:
        for r in csv.DictReader(f):
            key = (r['pwsid'], r['facility_id'], r['sample_point_id'])
            loc = locations[key]
            outcomes = builder.calculate(observed[key], loc['water'])
            for k, o in zip(builder.KEYS, outcomes):
                assert o[1] == int(r[k + '_full_set']), (key, k, 'completeness')
                for index, suffix in [(2, '_average_result'), (4, '_unrounded_average_result')]:
                    want = Decimal(r[k + suffix]) if r[k + suffix] else None
                    got = Decimal(str(o[index])) if o[index] is not None else None
                    assert want == got, (key, k, suffix)
                assert o[3] == int(r[k + '_above_mcl_comparison']), (key, k, 'classification')
                checked += 1
            loc['expected_events'] = builder.expected_events(loc['water'])
            loc['outcomes'] = outcomes
            loc['samples'].sort(key=lambda r: (r[0], r[1], r[2], r[6]))
    shards = defaultdict(lambda: defaultdict(list))
    for (pwsid, _, _), loc in sorted(locations.items()):
        shards[bucket(pwsid)][pwsid].append(loc)
    output.mkdir(parents=True, exist_ok=True)
    hashes = {}
    for key, systems in sorted(shards.items()):
        file = output / f'{key}.json'
        file.write_text(json.dumps({'release_id': RELEASE, 'systems': systems}, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')
        hashes[file.name] = builder.digest(file)
    report = {'release_id': RELEASE, 'pfas_release_id': builder.RELEASE,
        'source_sha256': builder.digest(source), 'frozen_location_csv_sha256': builder.digest(frozen),
        'chemicals': builder.CHEMICALS, 'outcomes': builder.KEYS,
        'sample_columns': ['chemical_index', 'collection_date', 'event', 'sign', 'reported_value_or_limit_ppt', 'averaging_input_ppt', 'sample_id', 'original_source_row'],
        'outcome_columns': ['present', 'complete', 'rounded_average_ug_l_or_hi', 'comparison_flag', 'unrounded_average_ug_l_or_hi'],
        'audit': {'source_samples': count, 'systems': sum(len(s) for s in shards.values()), 'locations': len(locations), 'outcomes_compared': checked, 'mismatches': 0},
        'period_rule': 'One required UCMR monitoring set per location and chemical, keyed by SE1/SE2 or SE1-SE4. Not regrouped by calendar year. Missing events do not become zeros; nondetects within present events use zero only for averaging. The location mean is not an average across the full 2023-2025 national collection window.',
        'files': hashes}
    (output / 'manifest.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report['audit']))
    print('Manifest SHA256:', builder.digest(output / 'manifest.json'))

if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--source', required=True, type=Path)
    p.add_argument('--output', type=Path, default=ROOT / 'data/pfas-sample-trace')
    a = p.parse_args()
    build(a.source, a.output)
