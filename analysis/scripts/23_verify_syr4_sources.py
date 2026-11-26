"""Independent check of retained result identities, units, bounds, years and raw fields."""
from pathlib import Path
from collections import defaultdict
from decimal import Decimal
from datetime import datetime
import json,csv,io,zipfile,hashlib
ROOT=Path(__file__).resolve().parents[2];D=ROOT/'data/syr4';S=Path('/Users/jackzhang/Downloads/PFAS Estimator - Arsenic and Nitrate EPA SYR4')
systems={}
for p in (D/'systems').glob('*.json'):systems.update(json.loads(p.read_text())['systems'])
result={}
for key,f in [('arsenic','SYR4_PhaseChem_1.zip'),('nitrate','SYR4_PhaseChem_4.zip')]:
 retained={row[7]:(id,row) for id,s in systems.items() for row in s[key]};seen=set();latest={};counts=defaultdict(int)
 with zipfile.ZipFile(S/f) as z,z.open('SUMMARY_ANALYTE_'+key.upper()+'.txt') as stream:
  for line,r in enumerate(csv.DictReader(io.TextIOWrapper(stream,encoding='cp1252'),delimiter='\t'),2):
   point_ok=r['SOURCE_TYPE_CODE']=='FN' or r['SAMPLING_POINT_TYPE'] in ('EP','DS')
   eligible=r['SOURCE_TYPE_CODE']!='RW' and point_ok and r['SAMPLE_TYPE_CODE'] in ('','RT')
   date=datetime.strptime(r['SAMPLE_COLLECTION_DATE'],'%d-%b-%y').date().isoformat()
   if eligible:
    latest[r['PWSID']]=max(latest.get(r['PWSID'],''),date[:4]);counts[(r['PWSID'],date[:4])]+=1
   if line not in retained:continue
   id,row=retained[line];assert eligible and id==r['PWSID'] and row[0]==date
   detect=r['DETECT']=='1';value=r['VALUE'] if detect else r['DETECTION_LIMIT_VALUE'];unit=(r['UNIT'] if detect else r['DETECTION_LIMIT_UNIT']).upper()
   expected=None
   if value and unit in ('UG/L','MG/L'):
    expected=float(Decimal(value)*(1000 if unit=='MG/L' else 1)/(1000 if key=='nitrate' else 1))
    if not detect and expected==0:expected=None
   assert row[1]==expected and row[2]==('=' if detect else '<'),(key,line,row[1],expected,r)
   assert row[5]==r['SIX_YEAR_ID'] and row[10:14]==[r['VALUE'],r['UNIT'],r['DETECTION_LIMIT_VALUE'],r['DETECTION_LIMIT_UNIT']]
   seen.add(line)
 assert len(seen)==len(retained)
 for id,s in systems.items():
  if not s[key]:continue
  assert all(row[0][:4]==latest[id] for row in s[key])
  assert len(s[key])==counts[(id,latest[id])]
 result[key]={'retained_rows_verified':len(seen),'retained_systems':sum(bool(s[key]) for s in systems.values()),'mismatches':0}
manifest=json.loads((D/'manifest.json').read_text())
for file,sha in manifest['files'].items():assert hashlib.sha256((D/file).read_bytes()).hexdigest()==sha
out=ROOT/'analysis/exports/syr4_source_verification.json';out.write_text(json.dumps(result,indent=2)+'\n');print(out);print(json.dumps(result))
