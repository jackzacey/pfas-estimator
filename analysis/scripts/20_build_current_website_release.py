#!/usr/bin/env python3
"""Build a website-only final UCMR 5 release without modifying the research archive.

Input bytes are pinned. Decimal arithmetic classifies unrounded averages; displayed
averages use EPA's published significant digits, with half-up rounding. Published
July 2026 Table 4 totals are an external aggregate check, not row-level certification.
"""
import argparse
import csv
import hashlib
import importlib.util
import json
from collections import defaultdict
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RELEASE = 'ucmr5-final-aug2026-website-v1'
SUBDIR = 'analysis/exports/ucmr5_final_aug2026_v1'
CHEMICALS = ['PFOA', 'PFOS', 'PFHxS', 'PFNA', 'HFPO-DA', 'PFBS']
KEYS = ['pfoa', 'pfos', 'pfhxs', 'pfna', 'hfpo_da', 'hi']
CUTOFFS = [Decimal('.00405'), Decimal('.00405'), Decimal('.015'), Decimal('.015'), Decimal('.015')]
DENOMINATORS = {'PFHxS': Decimal('.010'), 'PFNA': Decimal('.010'), 'HFPO-DA': Decimal('.010'), 'PFBS': Decimal('2')}
# EPA July 2026 Table 4: S combines the published medium and small categories.
EXPECTED = {
    'pfoa': {'L': [4276, 472], 'S': [5852, 307]},
    'pfos': {'L': [4275, 523], 'S': [5852, 352]},
    'pfhxs': {'L': [4273, 40], 'S': [5852, 26]},
    'pfna': {'L': [4276, 3], 'S': [5852, 6]},
    'hfpo_da': {'L': [4277, 3], 'S': [5852, 5]},
    'hi': {'L': [4273, 45], 'S': [5850, 35]},
    'any': {'L': [4277, 662], 'S': [5852, 474]},
}
PINNED_ALL = '6cf16a9b1b71a1a3084e203ee46ed788b51edad31dc411805694ea74dfa8d061'

def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')

def rounded(value, digits):
    if value is None:
        return None
    if value == 0:
        return 0.0
    quantum = Decimal(1).scaleb(value.adjusted() - digits + 1)
    return float(value.quantize(quantum, rounding=ROUND_HALF_UP))

def expected_events(water):
    if water == 'GW':
        return ('SE1', 'SE2')
    if water in ('SW', 'GU', 'MX'):
        return ('SE1', 'SE2', 'SE3', 'SE4')
    raise ValueError(f'Unknown water type {water}')

def calculate(observations, water):
    expected = expected_events(water)
    means, detected, outcomes = {}, {}, []
    for i, chemical in enumerate(CHEMICALS):
        events = observations.get(chemical, {})
        full = all(code in events for code in expected)
        mean = sum((events[c][0] for c in expected), Decimal(0)) / len(expected) if full else None
        means[chemical] = mean
        detected[chemical] = full and any(events[c][1] for c in expected)
        if i < 5:
            outcomes.append([int(bool(events)), int(full), rounded(mean, 2 if i < 2 else 1),
                             int(mean is not None and mean >= CUTOFFS[i]),
                             str(mean) if mean is not None else None])
    hi_full = all(means[k] is not None for k in DENOMINATORS)
    hi = sum((means[k] / v for k, v in DENOMINATORS.items()), Decimal(0)) if hi_full else None
    components = sum(bool(detected[k]) for k in DENOMINATORS)
    outcomes.append([int(any(observations.get(k) for k in DENOMINATORS)), int(hi_full), rounded(hi, 1),
                     int(hi is not None and hi >= Decimal('1.5') and components >= 2),
                     str(hi) if hi is not None else None])
    return outcomes

def validate_official(path, locations):
    """Require exact row-level agreement and distinguish absent from incomplete."""
    mapping=dict(zip(['PFOA','PFOS','PFHxS','PFNA','HFPO-DA','Hazard Index (HI)'],KEYS))
    local={(r['pwsid'],r['facility_id'],r['sample_point_id']):r for r in locations}
    seen=set(); mismatches=[]
    with path.open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f,delimiter='\t')
        required={'PWS ID','Facility ID','Sample Point ID','Contaminant','Location Has a Full Set of Results','Average > MCL','Average Result'}
        if not required.issubset(reader.fieldnames or []):raise ValueError('Not an EPA average-results export')
        for e in reader:
            key=(e['PWS ID'],e['Facility ID'],e['Sample Point ID']);k=mapping[e['Contaminant']]
            if (*key,k) in seen:raise ValueError('Duplicate EPA location/outcome')
            seen.add((*key,k));r=local.get(key)
            if r is None:raise ValueError(f'EPA location missing from reconstruction: {key}')
            full=e['Location Has a Full Set of Results']
            if full not in ('Y','N'):raise ValueError('Unknown EPA completeness flag')
            expected={'record_present':1,'full_set':int(full=='Y'),'above_mcl_comparison':int(e['Average > MCL']=='Y'),
                      'average_result':None if e['Average Result'] in ('N/A','-','') else Decimal(e['Average Result'])}
            for field,v in expected.items():
                actual=r[k+'_'+field]
                actual=Decimal(str(actual)) if actual is not None else None
                if actual!=v:mismatches.append({'key':key,'chemical':k,'field':field,'ours':str(actual),'epa':str(v)})
    absent=[]
    for key,r in local.items():
        for k in KEYS:
            if (*key,k) not in seen:
                if r[k+'_record_present']:mismatches.append({'key':key,'chemical':k,'field':'record_present','ours':1,'epa':'absent'})
                absent.append([*key,k])
    if mismatches:raise ValueError(f'{len(mismatches)} EPA row mismatches; first examples: {mismatches[:5]}')
    return {'official_rows':len(seen),'locations':len(local),'mismatches':0,'absent_outcomes_in_both_sources':absent,'source_sha256':digest(path),'source':'EPA Data Finder Average PFAS Results; unfiltered anonymous public export, October 19, 2026'}

def build(raw, sdwis_zip, output, epa_averages):
    source = raw / 'UCMR5_All.txt'
    if digest(source) != PINNED_ALL:
        raise ValueError('Source changed: review the new release before updating its pinned hash')
    old_dir = ROOT / 'analysis/exports/ucmr5_jan2026_v0_2'
    old = json.loads((old_dir / 'website_lookup_compact.json').read_text())
    old_systems = {r[0]: dict(zip(old['columns'], r)) for r in old['systems']}
    spec = importlib.util.spec_from_file_location('sdwis_reader', ROOT / 'analysis/scripts/05_link_sdwis_system_metadata.py')
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    sdwis, _, _ = module.read_sdwis(sdwis_zip)
    metadata, observations, dates, system_events, sizes, periods = {}, defaultdict(lambda: defaultdict(dict)), defaultdict(set), defaultdict(set), {}, defaultdict(set)
    sample_detections = defaultdict(list)
    source_rows, target_rows, duplicate_rows, extra_events = 0, 0, 0, 0
    with source.open(encoding='cp1252', newline='') as f:
        for source_line, r in enumerate(csv.DictReader(f, delimiter='\t'), start=2):
            source_rows += 1
            if r['Contaminant'] not in CHEMICALS:
                continue
            target_rows += 1
            if r['Units'] not in ('µg/L', 'ug/L'):
                raise ValueError(f"Unsupported units: {r['Units']!r}")
            key = (r['PWSID'], r['FacilityID'], r['SamplePointID'])
            meta = {k: r[k] for k in ['PWSName', 'FacilityName', 'SamplePointName', 'FacilityWaterType', 'Size', 'State', 'Region']}
            if key in metadata and metadata[key] != meta:
                raise ValueError(f'Conflicting location metadata: {key}')
            metadata[key] = meta
            sign = r['AnalyticalResultsSign']
            if sign not in ('<', '='):
                raise ValueError(f'Unknown analytical sign: {sign}')
            value = Decimal(0) if sign == '<' else Decimal(r['AnalyticalResultValue'])
            if not value.is_finite() or value < 0:
                raise ValueError('Invalid concentration')
            code, chem = r['SampleEventCode'], r['Contaminant']
            pair = (value, sign == '=')
            existing = observations[key][chem].get(code)
            if existing is not None:
                if existing != pair:
                    raise ValueError(f'Conflicting event; cannot choose silently: {key}, {chem}, {code}')
                duplicate_rows += 1
            observations[key][chem][code] = pair
            extra_events += code not in expected_events(r['FacilityWaterType'])
            date = datetime.strptime(r['CollectionDate'], '%m/%d/%Y').date().isoformat()
            if chem in CHEMICALS[:5] and sign == '=' and value > 0:
                sample_detections[key].append([CHEMICALS.index(chem), float(value * 1000), date, r['SampleID'], code, source_line])
            dates[(*key, chem)].add(date)
            periods[r['PWSID']].add(date)
            system_events[r['PWSID']].add((key[1], key[2], code, date))
            sizes[r['PWSID']] = r['Size']
    if extra_events:
        raise ValueError(f'{extra_events} unexpected event codes need review')

    systems, evidence, location_rows = {}, defaultdict(list), []
    for row_number, key in enumerate(sorted(metadata), start=2):
        pwsid, facility, point = key; meta = metadata[key]
        if pwsid not in systems:
            s = {c: None for c in old['columns']}
            prior, official = old_systems.get(pwsid, {}), sdwis.get(pwsid, {})
            # Historical boundary provenance is context, never proof of household service.
            for c in ['boundary_provenance', 'pct_hispanic_preferred', 'pct_nh_black_preferred', 'pct_nh_aian_preferred', 'pct_below_poverty_preferred', 'pct_rural_preferred']:
                s[c] = prior.get(c)
            for c in ['pws_type_desc', 'pws_activity_desc', 'primary_source_desc', 'owner_desc']:
                s[c] = official.get(c) or None
            s.update(pwsid=pwsid, ucmr_pws_name=meta['PWSName'], sdwis_state_code=official.get('state_code') or meta['State'],
                     population_served_count=int(official['population_served_count']) if official.get('population_served_count') else None,
                     sampling_location_count=0, primary_inferential_cohort=0)
            for k in KEYS:
                s[k+'_system_full_set'] = 0; s[k+'_system_above_mcl_comparison'] = 0; s[k+'_max_location_average'] = None
            systems[pwsid] = s
        s = systems[pwsid]; s['sampling_location_count'] += 1
        outcomes = calculate(observations[key], meta['FacilityWaterType'])
        row = {'pwsid':pwsid, 'facility_id':facility, 'sample_point_id':point, 'facility_name':meta['FacilityName'], 'sample_point_name':meta['SamplePointName']}
        for k, o in zip(KEYS, outcomes):
            s[k+'_system_full_set'] |= o[1]; s[k+'_system_above_mcl_comparison'] |= o[3]
            if o[2] is not None:
                prev = s[k+'_max_location_average']; s[k+'_max_location_average'] = max(prev, o[2]) if prev is not None else o[2]
            for suffix, v in zip(['record_present','full_set','average_result','above_mcl_comparison','unrounded_average_result'],o):
                row[k+'_'+suffix] = v
        ps = []
        for chem in CHEMICALS:
            ds = sorted(dates.get((*key,chem),set())); ps.append([ds[0],ds[-1]] if ds else None)
        # Keep every raw detection at a location whose chemical annual average
        # is incomplete; never substitute a sample value for that average.
        samples = [d for d in sample_detections[key] if not outcomes[d[0]][1]]
        evidence[pwsid].append([facility,point,meta['FacilityName'],meta['SamplePointName'],row_number,[o[:3] for o in outcomes],ps,samples])
        location_rows.append(row)
    row_validation=validate_official(epa_averages,location_rows)
    for s in systems.values():
        s['any_system_full_set'] = int(any(s[k+'_system_full_set'] for k in KEYS))
        s['any_system_above_mcl_comparison'] = int(any(s[k+'_system_above_mcl_comparison'] for k in KEYS))
        s['primary_occurrence_cohort'] = int(s['pws_type_desc']=='Community water system' and s['pws_activity_desc']=='Active' and s['any_system_full_set'])

    counts = {k:{size:[0,0] for size in ('L','S')} for k in [*KEYS,'any']}
    for s in systems.values():
        for k in counts:
            counts[k][sizes[s['pwsid']]][0] += s[k+'_system_full_set']
            counts[k][sizes[s['pwsid']]][1] += s[k+'_system_above_mcl_comparison']
    if counts != EXPECTED:
        raise ValueError(f'EPA final summary disagreement: {counts}')
    links = defaultdict(set)
    with (raw/'UCMR5_ZIPCodes.txt').open(encoding='cp1252',newline='') as f:
        for r in csv.DictReader(f,delimiter='\t'):
            z = r['ZIPCODE'].zfill(5)
            if r['PWSID'] in systems and len(z)==5 and z.isdigit(): links[z].add(r['PWSID'])
    links = {z:sorted(v) for z,v in sorted(links.items())}
    output.mkdir(parents=True,exist_ok=True)
    lookup = {'release_id':RELEASE,'columns':old['columns'],'systems':[[s[c] for c in old['columns']] for _,s in sorted(systems.items())],'zip_to_pwsids':links}
    write(output/'website_lookup_compact.json',lookup)
    write(output/'website_zip_to_monitored_systems.json',{'release_id':RELEASE,'zip_to_pwsids':links})
    loc_path=output/'website_location_averages.csv'
    with loc_path.open('w',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(location_rows[0]));w.writeheader();w.writerows(location_rows)
    write(output/'lookup-evidence.json',{'release_id':RELEASE,'lookup_sha256':digest(output/'website_lookup_compact.json'),'source_sha256':digest(loc_path),'occurrence_sha256':digest(source),'outcomes':KEYS,'date_chemicals':CHEMICALS,'columns':['facility_id','sample_point_id','facility_name','sample_point_name','source_csv_line','outcomes_present_full_average','occurrence_date_ranges','incomplete_annual_sample_detections'],'sample_detection_columns':['chemical_index','concentration_ppt','collection_date','sample_id','sample_event','occurrence_source_csv_line'],'sample_detection_scope':'Positive reported samples for the five displayed individual PFAS at locations without a complete chemical annual average. All matching source rows retained, including any duplicate source records; not annual averages or state monitoring.','date_scope':'Dates of final UCMR source records at each location and chemical.','systems':dict(sorted(evidence.items()))})
    write(output/'website_monitoring_periods.json',{'release_id':RELEASE,'columns':['pwsid','monitoring_start','monitoring_end','monitoring_years','sampling_event_count'],'systems':[[i,min(periods[i]),max(periods[i]),','.join(sorted({d[:4] for d in periods[i]})),len(system_events[i])] for i in sorted(systems)]})
    summaries=[]
    for state in sorted({s['sdwis_state_code'] for s in systems.values() if s['primary_occurrence_cohort']}):
        group=[s for s in systems.values() if s['sdwis_state_code']==state and s['primary_occurrence_cohort']]
        row={'state':state,'eligible_cws_with_complete_monitoring':len(group),'above_any_april_2024_benchmark':sum(s['any_system_above_mcl_comparison'] for s in group)}
        row.update({('above_hazard_index' if k=='hi' else 'above_'+k):sum(s[k+'_system_above_mcl_comparison'] for s in group) for k in KEYS});summaries.append(row)
    write(output/'website_state_summary.json',{'release_id':RELEASE,'states':summaries})
    # Carry only the explicit geographic exclusion decision, and re-screen every
    # association in the new source. No old pending inventory is silently trusted.
    reviews=json.loads((ROOT/'config/zip-association-reviews.json').read_text())
    exclusions={(z,r['pwsid']) for r in reviews['reviews'] for z in r['excluded_zips']}
    prefixes=json.loads((ROOT/'config/zip_to_state.json').read_text());prefixes.update(json.loads((ROOT/'config/zip-audit-prefix-overrides.json').read_text())['prefix_states'])
    pending={}
    for z,ids in links.items():
        flagged=[i for i in ids if (z,i) not in exclusions and prefixes.get(z[:3]) and prefixes[z[:3]]!=systems[i]['sdwis_state_code']]
        if flagged: pending[z]=flagged
    reviews.update(release_id=RELEASE,source_sha256=digest(output/'website_lookup_compact.json'),pending_associations=pending,
                   recheck_note='2026-10-19: prior Kohala Ranch mainland exclusion retained; all new-source links re-screened. Same-state links remain unverified.')
    write(output/'zip-association-reviews.json',reviews)
    meta={'release_id':RELEASE,'source_release':'EPA final UCMR 5 dataset, released August 2026; downloaded October 19, 2026',
          'metadata_snapshot':'EPA ECHO/SDWIS system attributes downloaded August 12, 2026; historical demographics and boundary context remain from the January research archive.',
          'classification':'Location averages reconstructed from final EPA occurrence records and matched exactly to the official Data Finder averages, completeness, and comparison flags. Technical comparisons only, not compliance determinations.',
          'row_level_data_finder_validation':row_validation,
          'website_counts':{'systems':len(systems),'official_average_locations':len(metadata),'reported_zip_codes':len(links),'eligible_cws':sum(s['primary_occurrence_cohort'] for s in systems.values()),'above_cws':sum(s['any_system_above_mcl_comparison'] for s in systems.values() if s['primary_occurrence_cohort'])},
          'research_archive_release':old['release_id'],'thresholds_ug_l':dict(zip(KEYS,[float(v) for v in CUTOFFS]+[1.5]))}
    write(output/'website_metadata.json',meta)
    changed=[]
    for i,s in sorted(systems.items()):
        prior=old_systems.get(i)
        if prior is None: changed.append({'pwsid':i,'field':'system','old':None,'new':s['ucmr_pws_name']});continue
        for k in ['sampling_location_count','any_system_full_set','any_system_above_mcl_comparison',*[k+suffix for k in KEYS for suffix in ['_system_full_set','_system_above_mcl_comparison','_max_location_average']]]:
            if prior.get(k)!=s[k]: changed.append({'pwsid':i,'field':k,'old':prior.get(k),'new':s[k]})
    write(output/'release_diff.json',{'old_release':old['release_id'],'new_release':RELEASE,'new_systems':sorted(systems.keys()-old_systems.keys()),'removed_systems':sorted(old_systems.keys()-systems.keys()),'changes':changed})
    audit={'release_id':RELEASE,'source_rows':source_rows,'target_rows':target_rows,'duplicate_event_rows_collapsed':duplicate_rows,'conflicting_events':0,'unexpected_events':0,'external_count_check':{'source':'EPA July 2026 Data Summary, Table 4, p12','actual':counts,'expected':EXPECTED,'exact_match_all_28_counts':counts==EXPECTED},'zip_associations_needing_review':sum(map(len,pending.values())),'website_counts':meta['website_counts'],'row_level_export_verified':True,'row_level_comparison':row_validation}
    write(output/'validation_report.json',audit)
    inputs=[source,raw/'UCMR5_ZIPCodes.txt',raw/'UCMR5_AddtlDataElem.txt',raw/'UCMR5_DataSummary_Jul2026_508.pdf',sdwis_zip,epa_averages]
    write(output/'release_manifest.json',{'release_id':RELEASE,'inputs':{p.name:{'sha256':digest(p),'bytes':p.stat().st_size} for p in inputs},'artifacts':{p.name:{'sha256':digest(p),'bytes':p.stat().st_size} for p in sorted(output.iterdir()) if p.is_file() and p.name!='release_manifest.json'}})
    print(json.dumps(audit,indent=2))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--raw',type=Path,required=True);p.add_argument('--sdwis-zip',type=Path,required=True);p.add_argument('--epa-averages',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/SUBDIR);a=p.parse_args();build(a.raw,a.sdwis_zip,a.output,a.epa_averages)
