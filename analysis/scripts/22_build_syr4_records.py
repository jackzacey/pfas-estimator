#!/usr/bin/env python3
"""Historical arsenic/nitrate, routine entry/distribution samples, latest sampled year.
Never substitutes nitrate-nitrite for nitrate. Raw/unknown sampling points excluded.
"""
import csv,io,json,zipfile,hashlib
from pathlib import Path
from datetime import datetime
from decimal import Decimal,InvalidOperation
from collections import Counter,defaultdict
ROOT=Path(__file__).resolve().parents[2]
SOURCE=Path('/Users/jackzhang/Downloads/PFAS Estimator - Arsenic and Nitrate EPA SYR4')
OUT=ROOT/'data/syr4';RELEASE='syr4-2012-2019-20261126-v1'
def bucket(s):
 n=0
 for c in s:n=(n*31+ord(c))%128
 return f'{n:02x}'
def number(v,u,key):
 try:
  d=Decimal(v)
  if not d.is_finite() or d<0:return None
  factor={'UG/L':Decimal(1),'MG/L':Decimal(1000)}.get(u.upper())
  if factor is None:return None
  return float(d*factor/(1000 if key=='nitrate' else 1))
 except InvalidOperation:return None
def record(r,key,line):
 try:d=datetime.strptime(r['SAMPLE_COLLECTION_DATE'],'%d-%b-%y').date().isoformat()
 except ValueError:return None,'date'
 if not '2012-01-01'<=d<='2019-12-31':return None,'date'
 if r['SOURCE_TYPE_CODE']=='RW' or (r['SOURCE_TYPE_CODE']!='FN' and r['SAMPLING_POINT_TYPE'] not in ('EP','DS')):return None,'sample_location'
 if r['SAMPLE_TYPE_CODE'] not in ('RT',''):return None,'nonroutine'
 sign={'0':'<','1':'='}.get(r['DETECT'])
 if not sign:return None,'sign'
 v=number(r['VALUE'],r['UNIT'],key) if sign=='=' else number(r['DETECTION_LIMIT_VALUE'],r['DETECTION_LIMIT_UNIT'],key)
 # Unknown/zero nondetect limits remain unknown, never numeric zeros.
 if sign=='=' and v is None:return None,'value'
 if sign=='<' and v==0:v=None
 return [d,v,sign,r['WATER_FACILITY_ID'],r['SAMPLING_POINT_ID'],r['SIX_YEAR_ID'],r['SAMPLE_ID'],line,r['SAMPLING_POINT_TYPE'],r['SOURCE_TYPE_CODE'],r['VALUE'],r['UNIT'],r['DETECTION_LIMIT_VALUE'],r['DETECTION_LIMIT_UNIT']],None

def build():
 systems={};audit={};sourcehash={}
 for key,archive,expected in [('arsenic','SYR4_PhaseChem_1.zip',452852),('nitrate','SYR4_PhaseChem_4.zip',1404609)]:
  p=SOURCE/archive;sourcehash[archive]=hashlib.sha256(p.read_bytes()).hexdigest();assert sourcehash[archive]=={'SYR4_PhaseChem_1.zip':'ba387c144950c6716dbfde4d85a09405e148a7df3a1a78027eff03f011220eaf','SYR4_PhaseChem_4.zip':'5b8726c9adee8fbfa0ca265393814439d0f5d1a552b7a88b0322d19ec9d738e0'}[archive];counts=Counter();ids=set()
  with zipfile.ZipFile(p) as z, z.open('SUMMARY_ANALYTE_'+key.upper()+'.txt') as f:
   for line,r in enumerate(csv.DictReader(io.TextIOWrapper(f,encoding='cp1252'),delimiter='\t'),2):
    counts['source_rows']+=1;ids.add(r['PWSID']);rec,err=record(r,key,line)
    if err:counts['excluded_'+err]+=1;continue
    counts['eligible_rows']+=1
    s=systems.setdefault(r['PWSID'],dict(id=r['PWSID'],name=r['SYSTEM_NAME'],state=r['STATE_CODE'],type=r['SYSTEM_TYPE'],arsenic=[],nitrate=[]))
    rows=s[key]
    if not rows or rec[0][:4]>rows[0][0][:4]:s[key]=[rec]
    elif rec[0][:4]==rows[0][0][:4]:rows.append(rec)
  assert counts['source_rows']==expected,(key,counts)
  counts['source_systems']=len(ids);counts['retained_systems']=sum(bool(s[key]) for s in systems.values());counts['retained_rows']=sum(len(s[key]) for s in systems.values());audit[key]=dict(counts)
 review=json.loads((ROOT/'analysis/exports/ucmr5_final_aug2026_v1/zip-association-reviews.json').read_text())
 excluded={(z,r['pwsid']) for r in review['reviews'] for z in r.get('excluded_zips',[])}|{(z,p) for z,ids in review['pending_associations'].items() for p in ids}
 zips=defaultdict(set)
 with zipfile.ZipFile('/Users/jackzhang/Downloads/SDWA_latest_downloads.zip') as z,z.open('SDWA_GEOGRAPHIC_AREAS.csv') as f:
  for r in csv.DictReader(io.TextIOWrapper(f,encoding='utf-8-sig')):
   p=r['PWSID'];code=r['ZIP_CODE_SERVED'].strip()
   if p in systems and len(code)==5 and code.isdigit() and (code,p) not in excluded:zips[code].add(p)
 lookup=json.loads((ROOT/'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json').read_text())
 for code,ids in lookup['zip_to_pwsids'].items():
  for p in ids:
   if p in systems and (code,p) not in excluded:zips[code].add(p)
 shards=defaultdict(dict)
 for p,s in sorted(systems.items()):
  for key in ('arsenic','nitrate'):s[key].sort(key=lambda r:(r[0],r[5]))
  shards[bucket(p)][p]=s
 files={}
 def write(name,data):
  p=OUT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(dict(release_id=RELEASE,**data),ensure_ascii=False,separators=(',',':'))+'\n');files[name]=hashlib.sha256(p.read_bytes()).hexdigest()
 for k,s in shards.items():write('systems/'+k+'.json',{'systems':s})
 write('index.json',{'zips':{z:sorted(ids) for z,ids in sorted(zips.items())},'systems':[[p,s['name'],s['state'],bool(s['arsenic']),bool(s['nitrate'])] for p,s in sorted(systems.items())]})
 sourcehash['sdwa_archive']=hashlib.sha256(Path('/Users/jackzhang/Downloads/SDWA_latest_downloads.zip').read_bytes()).hexdigest()
 sourcehash['reviewed_lookup']=hashlib.sha256((ROOT/'analysis/exports/ucmr5_final_aug2026_v1/website_lookup_compact.json').read_bytes()).hexdigest()
 sourcehash['zip_reviews']=hashlib.sha256((ROOT/'analysis/exports/ucmr5_final_aug2026_v1/zip-association-reviews.json').read_bytes()).hexdigest()
 write('manifest.json',{'source_hashes':sourcehash,'audit':audit,'files':files.copy(),'sample_years':[2012,2019],'policy':'Known finished water or EP/DS, excluding explicit raw water and known nonroutine samples; blank sample type is retained as unspecified; latest available calendar year per system/chemical. Unknown source type retained only at EP/DS. Finished-water records may have unknown point types. Nondetect uses detection-limit field, not blank VALUE. ZIPs are later reported service associations, not historic service-area proof.'})
 print(json.dumps({'audit':audit,'systems':len(systems),'zip_codes':len(zips),'manifest_sha':files['manifest.json']},indent=2))
if __name__=='__main__':build()
