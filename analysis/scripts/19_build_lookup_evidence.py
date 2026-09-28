#!/usr/bin/env python3
"""Add website evidence without changing frozen outcomes. Inputs must match release hashes.
Dates describe occurrence records at the location, not a reconstructed EPA averaging set.
"""
import argparse, csv, hashlib, json
from collections import defaultdict
from datetime import datetime
from pathlib import Path

KEYS = ['pfoa','pfos','pfhxs','pfna','hfpo_da','hi']
NAMES = ['PFOA','PFOS','PFHxS','PFNA','HFPO-DA','PFBS']
RAW_HASH = '39ca7179d7d2ab682073104708721b4022ab9b66ff2a947910fde738c5febb1f'
def digest(p):
    with p.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
def build(locations, raw, release_dir, output):
    manifest=json.loads((release_dir/'release_manifest.json').read_text())
    assert digest(locations)==manifest['inputs'][locations.name]['sha256'], 'Location source checksum mismatch'
    assert digest(raw)==RAW_HASH, 'Occurrence source checksum mismatch'
    lookup_path=release_dir/'website_lookup_compact.json'
    lookup=json.loads(lookup_path.read_text())
    systems={str(r[0]):dict(zip(lookup['columns'],r)) for r in lookup['systems']}
    dates=defaultdict(set)
    with raw.open(encoding='utf-8-sig',errors='replace') as f:
        for r in csv.DictReader(f,delimiter='\t'):
            if r['Contaminant'] in NAMES:
                key=(r['PWSID'],r['FacilityID'],r['SamplePointID'],r['Contaminant'])
                dates[key].add(datetime.strptime(r['CollectionDate'],'%m/%d/%Y').date().isoformat())
    grouped=defaultdict(list)
    with locations.open(encoding='utf-8-sig',newline='') as f:
        for row_number,r in enumerate(csv.DictReader(f),start=2):
            outcomes=[]
            for k in KEYS:
                outcomes.append([int(r[k+'_record_present']),int(r[k+'_full_set'] or 0),float(r[k+'_average_result']) if r[k+'_average_result'] else None])
            periods=[]
            for name in NAMES:
                ds=sorted(dates.get((r['pwsid'],r['facility_id'],r['sample_point_id'],name),set()))
                periods.append([ds[0],ds[-1]] if ds else None)
            grouped[r['pwsid']].append([r['facility_id'],r['sample_point_id'],r['facility_name'],r['sample_point_name'],row_number,outcomes,periods])
    assert set(grouped)==set(systems), 'System coverage mismatch'
    for pwsid,rows in grouped.items():
        s=systems[pwsid]
        assert len(rows)==s['sampling_location_count']
        for i,k in enumerate(KEYS):
            vals=[r[5][i][2] for r in rows if r[5][i][2] is not None]
            assert (max(vals) if vals else None)==s[k+'_max_location_average'], (pwsid,k,'maximum')
            assert int(any(r[5][i][1] for r in rows))==s[k+'_system_full_set'], (pwsid,k,'completeness')
    payload={'release_id':lookup['release_id'],'lookup_sha256':digest(lookup_path),'source_sha256':digest(locations),'occurrence_sha256':RAW_HASH,'outcomes':KEYS,'date_chemicals':NAMES,'columns':['facility_id','sample_point_id','facility_name','sample_point_name','source_csv_line','outcomes_present_full_average','occurrence_date_ranges'],'date_scope':'Occurrence dates at this location and chemical; EPA export does not identify the exact records retained in its averaging set. These dates are context, not a reconstruction.','systems':dict(sorted(grouped.items()))}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(payload,ensure_ascii=False,separators=(',',':'),allow_nan=False))
    print(f'Validated {len(grouped)} systems; {sum(map(len,grouped.values()))} locations; {output.stat().st_size:,} bytes')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--locations',type=Path,required=True);p.add_argument('--raw',type=Path,required=True);p.add_argument('--release',type=Path,default=Path('analysis/exports/ucmr5_jan2026_v0_2'));p.add_argument('--output',type=Path,default=Path('data/lookup-evidence.json'));a=p.parse_args();build(a.locations,a.raw,a.release,a.output)
