"""Boundary cases independent of the full-release aggregate counts."""
import importlib.util
import csv
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path

spec=importlib.util.spec_from_file_location('final_release',Path(__file__).resolve().parents[1]/'scripts/20_build_current_website_release.py')
release=importlib.util.module_from_spec(spec);spec.loader.exec_module(release)

def obs(values):
    return {c:{'SE1':(Decimal(str(v)),v>0),'SE2':(Decimal(str(v)),v>0)} for c,v in values.items()}

class FinalReleaseRules(unittest.TestCase):
    def test_pfoa_rounding_boundary(self):
        self.assertEqual(release.calculate(obs({'PFOA':.004049}),'GW')[0][3],0)
        at=release.calculate(obs({'PFOA':.00405}),'GW')[0]
        self.assertEqual(at[3],1);self.assertEqual(at[2],.0041)

    def test_single_digit_boundary(self):
        self.assertEqual(release.calculate(obs({'PFHxS':.014999}),'GW')[2][3],0)
        at=release.calculate(obs({'PFHxS':.015}),'GW')[2]
        self.assertEqual(at[3],1);self.assertEqual(at[2],.02)

    def test_incomplete_is_missing_not_zero(self):
        o=obs({'PFOS':.008});del o['PFOS']['SE2']
        self.assertEqual(release.calculate(o,'GW')[1],[1,0,None,0,None])
        self.assertEqual(release.calculate({},'GW')[1],[0,0,None,0,None])

    def test_ground_vs_surface_monitoring(self):
        self.assertEqual(release.calculate(obs({'PFOS':.008}),'GW')[1][1],1)
        self.assertEqual(release.calculate(obs({'PFOS':.008}),'SW')[1][1],0)

    def test_hi_needs_two_detected_components(self):
        one=obs({'PFHxS':.02,'PFNA':0,'HFPO-DA':0,'PFBS':0})
        self.assertEqual(release.calculate(one,'GW')[5][3],0)
        two=obs({'PFHxS':.01,'PFNA':.005,'HFPO-DA':0,'PFBS':0})
        self.assertEqual(release.calculate(two,'GW')[5][3],1)
        self.assertEqual(release.calculate(two,'GW')[5][2],2.0)

    def test_hi_record_present_with_missing_component(self):
        # The EPA table retains an unavailable HI row when a component record
        # is absent; record presence and complete monitoring are different.
        incomplete=obs({'PFNA':0,'HFPO-DA':0,'PFBS':0})
        self.assertEqual(release.calculate(incomplete,'GW')[5],[1,0,None,0,None])

    def test_official_disagreement_blocks_release(self):
        location={'pwsid':'TEST','facility_id':'001','sample_point_id':'EP'}
        for k in release.KEYS:
            for field,value in [('record_present',0),('full_set',0),('above_mcl_comparison',0),('average_result',None)]:
                location[k+'_'+field]=value
        location.update(pfoa_record_present=1,pfoa_full_set=1,pfoa_above_mcl_comparison=1,pfoa_average_result=.0041)
        row={'PWS ID':'TEST','Facility ID':'001','Sample Point ID':'EP','Contaminant':'PFOA','Location Has a Full Set of Results':'Y','Average > MCL':'Y','Average Result':'.0041'}
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'official.tsv'
            def save():
                with path.open('w',newline='') as f:
                    w=csv.DictWriter(f,fieldnames=list(row),delimiter='\t');w.writeheader();w.writerow(row)
            save();self.assertEqual(release.validate_official(path,[location])['mismatches'],0)
            row['Average Result']='.0042';save()
            with self.assertRaisesRegex(ValueError,'EPA row mismatches'):release.validate_official(path,[location])

if __name__=='__main__':unittest.main()
