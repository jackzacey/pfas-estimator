import importlib.util
from pathlib import Path
spec=importlib.util.spec_from_file_location('syr',Path(__file__).parents[1]/'scripts/22_build_syr4_records.py');s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
def test_nondetect_and_units():
 r=dict(SAMPLE_COLLECTION_DATE='01-JAN-19',SOURCE_TYPE_CODE='FN',SAMPLING_POINT_TYPE='EP',SAMPLE_TYPE_CODE='RT',DETECT='0',VALUE='',UNIT='UG/L',DETECTION_LIMIT_VALUE='500',DETECTION_LIMIT_UNIT='UG/L',WATER_FACILITY_ID='F',SAMPLING_POINT_ID='P',SIX_YEAR_ID='R',SAMPLE_ID='S')
 rec,e=s.record(r,'nitrate',2);assert e is None and rec[1]==0.5 and rec[2]=='<'
 r['DETECTION_LIMIT_VALUE']='0';assert s.record(r,'nitrate',2)[0][1] is None
 r.update(DETECT='1',VALUE='10',UNIT='MG/L');assert s.record(r,'nitrate',2)[0][1]==10
 assert s.record(r,'arsenic',2)[0][1]==10000
 r['SOURCE_TYPE_CODE']='RW';assert s.record(r,'arsenic',2)[1]=='sample_location'
 r.update(SOURCE_TYPE_CODE='',SAMPLING_POINT_TYPE='XX');assert s.record(r,'arsenic',2)[1]=='sample_location'
 r.update(SAMPLING_POINT_TYPE='EP',SAMPLE_TYPE_CODE='FB');assert s.record(r,'arsenic',2)[1]=='nonroutine'

if __name__=='__main__':
 test_nondetect_and_units(); print('SYR4 unit and eligibility checks passed.')
