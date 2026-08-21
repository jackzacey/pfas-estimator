#!/usr/bin/env python3
"""Evaluate spatial autocorrelation in the primary model residuals."""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


def load_model_module(analysis_dir: Path):
    path = analysis_dir / "scripts" / "12_run_primary_models.py"
    spec = importlib.util.spec_from_file_location("primary_models", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["primary_models"] = module
    spec.loader.exec_module(module)
    return module


def parse_args() -> argparse.Namespace:
    analysis_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_with_demographics.csv",
    )
    parser.add_argument(
        "--centroids",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_service_area_centroids.csv",
    )
    parser.add_argument(
        "--output-dir", type=Path, default=analysis_dir / "outputs"
    )
    parser.add_argument("--permutations", type=int, default=999)
    parser.add_argument("--seed", type=int, default=20260814)
    return parser.parse_args()


def unit_sphere(longitude: np.ndarray, latitude: np.ndarray) -> np.ndarray:
    lon = np.deg2rad(longitude)
    lat = np.deg2rad(latitude)
    cos_lat = np.cos(lat)
    return np.column_stack([
        cos_lat * np.cos(lon),
        cos_lat * np.sin(lon),
        np.sin(lat),
    ])


def nearest_neighbors(coordinates: np.ndarray, k: int, chunk_size: int = 256) -> np.ndarray:
    n = len(coordinates)
    if k >= n:
        raise ValueError("k must be smaller than the number of observations")
    neighbors = np.empty((n, k), dtype=np.int32)
    for start in range(0, n, chunk_size):
        stop = min(start + chunk_size, n)
        similarity = coordinates[start:stop] @ coordinates.T
        rows = np.arange(stop - start)
        similarity[rows, np.arange(start, stop)] = -np.inf
        candidates = np.argpartition(similarity, -k, axis=1)[:, -k:]
        neighbors[start:stop] = candidates
    return neighbors


def moran_i(values: np.ndarray, neighbors: np.ndarray) -> float:
    centered = values - values.mean()
    denominator = float(centered @ centered)
    if denominator <= 0:
        raise ValueError("Moran's I requires nonconstant values")
    lag = centered[neighbors].mean(axis=1)
    return float((centered @ lag) / denominator)


def permutation_test(
    values: np.ndarray,
    neighbors: np.ndarray,
    permutations: int,
    rng: np.random.Generator,
) -> dict[str, Any]:
    observed = moran_i(values, neighbors)
    expected = -1.0 / (len(values) - 1)
    permuted = np.empty(permutations, dtype=float)
    for index in range(permutations):
        permuted[index] = moran_i(rng.permutation(values), neighbors)
    extreme = np.abs(permuted - expected) >= abs(observed - expected)
    return {
        "moran_i": observed,
        "randomization_expected_i": expected,
        "two_sided_permutation_p": float((extreme.sum() + 1) / (permutations + 1)),
        "permutations": permutations,
        "permuted_mean": float(permuted.mean()),
        "permuted_standard_deviation": float(permuted.std(ddof=1)),
    }


def main() -> None:
    args = parse_args()
    analysis_dir = Path(__file__).resolve().parents[1]
    models = load_model_module(analysis_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    frame = pd.read_csv(
        args.data,
        dtype={"pwsid": str, "sdwis_state_code": str, "sdwis_epa_region": str},
        low_memory=False,
    )
    centroids = pd.read_csv(args.centroids, dtype={"pwsid": str})
    frame = frame.merge(
        centroids[["pwsid", "longitude", "latitude"]],
        on="pwsid",
        how="left",
        validate="one_to_one",
    )
    exposure_stems = [stem for stem, _ in models.EXPOSURES]
    required = [
        "any_system_above_mcl_comparison",
        "longitude",
        "latitude",
        *models.required_columns("preferred", exposure_stems, True),
    ]
    cohort = frame[
        (frame["primary_demographic_model_cohort"] == 1)
        & (pd.to_numeric(frame["population_served_count"], errors="coerce") >= 3300)
    ].dropna(subset=required).copy()
    x, names = models.design_matrix(cohort, "preferred", exposure_stems, True)
    y = pd.to_numeric(
        cohort["any_system_above_mcl_comparison"], errors="raise"
    ).to_numpy(dtype=float)
    fit = models.modified_poisson_clustered(
        x, y, cohort["sdwis_state_code"].astype(str).to_numpy()
    )
    if not fit["converged"]:
        raise RuntimeError("Primary model did not converge")
    mu = np.exp(np.clip(x @ fit["beta"], -20, 20))
    response_residual = y - mu
    pearson_residual = response_residual / np.sqrt(np.maximum(mu, 1e-12))

    coordinates = unit_sphere(
        cohort["longitude"].to_numpy(dtype=float),
        cohort["latitude"].to_numpy(dtype=float),
    )
    maximum_k = 12
    neighbor_matrix = nearest_neighbors(coordinates, maximum_k)
    rng = np.random.default_rng(args.seed)
    diagnostics: dict[str, Any] = {}
    for k in (4, 8, 12):
        neighbors = neighbor_matrix[:, :k]
        diagnostics[f"k_{k}"] = {
            "raw_binary_outcome": permutation_test(
                y, neighbors, args.permutations, rng
            ),
            "response_residual": permutation_test(
                response_residual, neighbors, args.permutations, rng
            ),
            "pearson_residual": permutation_test(
                pearson_residual, neighbors, args.permutations, rng
            ),
        }

    residual_output = cohort[[
        "pwsid", "sdwis_state_code", "sdwis_epa_region", "longitude", "latitude",
    ]].copy()
    residual_output["observed_outcome"] = y
    residual_output["fitted_mean"] = mu
    residual_output["response_residual"] = response_residual
    residual_output["pearson_residual"] = pearson_residual
    residual_path = args.output_dir / "primary_model_spatial_residuals.csv"
    residual_output.to_csv(residual_path, index=False)

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "cohort_systems": len(cohort),
        "outcome_events": int(y.sum()),
        "coordinate_definition": "ArcGIS polygon centroid in WGS84",
        "neighbor_definition": "k-nearest polygon centroids on a unit sphere; row-standardized weights",
        "model": {
            "terms": names,
            "clusters": fit["clusters"],
            "condition_number": fit["condition_number"],
            "fitted_min": fit["fitted_min"],
            "fitted_max": fit["fitted_max"],
        },
        "seed": args.seed,
        "diagnostics": diagnostics,
        "interpretation_rule": (
            "A small permutation p-value indicates residual geographic structure under the "
            "specified centroid-neighbor definition; it is not evidence of a causal spatial process."
        ),
    }
    report_path = args.output_dir / "primary_spatial_residual_diagnostics.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {residual_path}")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
