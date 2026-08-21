#!/usr/bin/env python3
"""Focused regression tests for the regulatory rules and model estimator."""

from __future__ import annotations

import importlib.util
import math
import sys
import unittest
from pathlib import Path

import numpy as np
import pandas as pd


ROOT = Path(__file__).resolve().parents[1]


def load_script(filename: str, module_name: str):
    spec = importlib.util.spec_from_file_location(
        module_name, ROOT / "scripts" / filename
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {filename}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


regulatory = load_script("02_reconstruct_regulatory_averages.py", "regulatory")
models = load_script("12_run_primary_models.py", "models")


class RegulatoryRuleTests(unittest.TestCase):
    def test_below_reporting_limit_is_zero(self) -> None:
        self.assertEqual(regulatory.result_value("<", "0.002"), 0.0)

    def test_reported_detection_is_numeric(self) -> None:
        self.assertEqual(regulatory.result_value("=", "0.0061"), 0.0061)

    def test_monitoring_frequency_by_source(self) -> None:
        self.assertEqual(regulatory.expected_event_codes("GW"), ("SE1", "SE2"))
        self.assertEqual(
            regulatory.expected_event_codes("SW"),
            ("SE1", "SE2", "SE3", "SE4"),
        )
        self.assertEqual(
            regulatory.expected_event_codes("GU"),
            ("SE1", "SE2", "SE3", "SE4"),
        )

    def test_unrounded_regulatory_cutoffs(self) -> None:
        self.assertEqual(regulatory.AVERAGE_CUTOFFS["PFOA"], 0.00405)
        self.assertEqual(regulatory.AVERAGE_CUTOFFS["PFOS"], 0.00405)
        self.assertEqual(regulatory.AVERAGE_CUTOFFS["PFHxS"], 0.015)


class ModelEstimatorTests(unittest.TestCase):
    def test_binary_predictor_recovers_empirical_prevalence_ratio(self) -> None:
        # A log-link model with an intercept and one binary predictor is saturated:
        # exp(beta_1) must equal the ratio of the two empirical prevalences.
        exposed = np.repeat([0.0, 1.0], 100)
        outcome = np.concatenate([
            np.array([1.0] * 20 + [0.0] * 80),
            np.array([1.0] * 40 + [0.0] * 60),
        ])
        x = np.column_stack([np.ones(len(exposed)), exposed])
        clusters = np.repeat(np.arange(20), 10)
        fit = models.modified_poisson_clustered(x, outcome, clusters)
        self.assertTrue(fit["converged"])
        self.assertAlmostEqual(math.exp(fit["beta"][0]), 0.2, places=8)
        self.assertAlmostEqual(math.exp(fit["beta"][1]), 2.0, places=8)

    def test_benjamini_hochberg_is_monotone_and_bounded(self) -> None:
        raw = pd.Series([0.01, 0.04, 0.03, 0.20])
        adjusted = models.benjamini_hochberg(raw)
        self.assertTrue(((adjusted >= raw) & (adjusted <= 1)).all())
        ordered = pd.DataFrame({"raw": raw, "adjusted": adjusted}).sort_values("raw")
        self.assertTrue((ordered["adjusted"].diff().dropna() >= -1e-12).all())


if __name__ == "__main__":
    unittest.main()
