"""Check clinically meaningful differences from the PFAS averaging pipeline."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('records', Path(__file__).parents[1] / 'scripts/21_build_drinking_water_records.py')
records = importlib.util.module_from_spec(spec)
spec.loader.exec_module(records)

class AdditionalRecordsTests(unittest.TestCase):
    def row(self, **updates):
        r = dict(SAMPLE_MEASURE='.009', UNIT_OF_MEASURE='mg/L', RESULT_SIGN_CODE='',
                 SAMPLING_START_DATE='01/01/2025', SAMPLING_END_DATE='06/30/2025', SAMPLE_ID='S1', SAR_ID='1')
        return {**r, **updates}

    def test_units_and_unspecified_sign(self):
        r = records.lcr_record(self.row(), 10)
        self.assertEqual(r[2], 9)
        self.assertEqual(r[3], '')
        self.assertEqual(r[6], 10)

    def test_less_than_preserved(self):
        self.assertEqual(records.lcr_record(self.row(RESULT_SIGN_CODE='<'), 2)[2:4], [9, '<'])

    def test_invalid_data_not_zero(self):
        for changes in [dict(SAMPLE_MEASURE=''), dict(SAMPLE_MEASURE='-1'), dict(SAMPLE_MEASURE='NaN'), dict(UNIT_OF_MEASURE='unknown'), dict(SAMPLING_END_DATE=''), dict(SAMPLING_START_DATE='12/31/2025')]:
            self.assertIsNone(records.lcr_record(self.row(**changes), 2))

    def test_recent_periods_preserve_differences(self):
        rr = [[f'{y}-01-01', f'{y}-06-30', y, '', 'a', '1', 2] for y in range(2010, 2026)]
        rr.append(['2025-01-01', '2025-06-30', 100, '<', 'b', '2', 3])
        chosen = records.recent_periods(rr)
        self.assertEqual(len(chosen), 6)
        self.assertEqual(sum(r[1] == '2025-06-30' for r in chosen), 2)
        self.assertFalse(any(r[1] < '2021' for r in chosen))

if __name__ == '__main__':
    unittest.main()
