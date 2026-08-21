#!/usr/bin/env python3
"""Compute Conley-style spatial-HAC uncertainty for the primary model.

This script requires SciPy for the spherical neighbor search and sparse weight
matrix. Coefficients are identical to the primary modified-Poisson model; only
the sandwich covariance changes. Bartlett kernels at 100, 250, and 500 km are
reported so inference does not rest on one distance cutoff.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import sparse
from scipy.spatial import cKDTree


EARTH_RADIUS_KM = 6371.0088


def load_model_module(analysis_dir: Path):
    path = analysis_dir / "scripts" / "12_run_primary_models.py"
    spec = importlib.util.spec_from_file_location("primary_models_hac", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules["primary_models_hac"] = module
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


def spatial_hac_standard_errors(
    scores: np.ndarray,
    bread_inverse: np.ndarray,
    coordinates: np.ndarray,
    cutoff_km: float,
) -> tuple[np.ndarray, int]:
    chord_cutoff = 2 * math.sin(cutoff_km / (2 * EARTH_RADIUS_KM))
    pairs = cKDTree(coordinates).query_pairs(
        chord_cutoff, output_type="ndarray"
    )
    chord_distance = np.linalg.norm(
        coordinates[pairs[:, 0]] - coordinates[pairs[:, 1]], axis=1
    )
    distance_km = 2 * EARTH_RADIUS_KM * np.arcsin(
        np.minimum(chord_distance / 2, 1)
    )
    pair_weights = 1 - distance_km / cutoff_km
    n = len(scores)
    rows = np.concatenate([np.arange(n), pairs[:, 0], pairs[:, 1]])
    columns = np.concatenate([np.arange(n), pairs[:, 1], pairs[:, 0]])
    weights = np.concatenate([np.ones(n), pair_weights, pair_weights])
    spatial_weights = sparse.coo_matrix(
        (weights, (rows, columns)), shape=(n, n)
    ).tocsr()
    meat = scores.T @ (spatial_weights @ scores)
    variance = bread_inverse @ meat @ bread_inverse
    # HC1-style finite-sample correction; negligible here but stated explicitly.
    p = scores.shape[1]
    if n > p:
        variance *= n / (n - p)
    return np.sqrt(np.maximum(np.diag(variance), 0)), len(pairs)


def coefficient_rows(
    specification: str,
    names: list[str],
    beta: np.ndarray,
    standard_errors: np.ndarray,
    cutoff_km: float | None,
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    for name, coefficient, standard_error in zip(names, beta, standard_errors):
        z = coefficient / standard_error if standard_error > 0 else float("nan")
        p_value = math.erfc(abs(z) / math.sqrt(2)) if math.isfinite(z) else None
        rows.append({
            "specification": specification,
            "cutoff_km": cutoff_km,
            "term": name,
            "log_prevalence_ratio": coefficient,
            "robust_standard_error": standard_error,
            "prevalence_ratio": math.exp(coefficient),
            "confidence_interval_low": math.exp(coefficient - 1.96 * standard_error),
            "confidence_interval_high": math.exp(coefficient + 1.96 * standard_error),
            "z": z,
            "p_value": p_value,
        })
    return rows


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
    y = cohort["any_system_above_mcl_comparison"].to_numpy(dtype=float)
    fit = models.modified_poisson_clustered(
        x, y, cohort["sdwis_state_code"].astype(str).to_numpy()
    )
    if not fit["converged"]:
        raise RuntimeError("Primary model did not converge")
    beta = fit["beta"]
    mu = np.exp(np.clip(x @ beta, -20, 20))
    scores = x * (y - mu)[:, None]
    bread_inverse = np.linalg.pinv(x.T @ (x * mu[:, None]))
    coordinates = unit_sphere(
        cohort["longitude"].to_numpy(dtype=float),
        cohort["latitude"].to_numpy(dtype=float),
    )

    rows = coefficient_rows(
        "state_clustered", names, beta, fit["standard_errors"], None
    )
    pair_counts: dict[str, int] = {}
    for cutoff in (100.0, 250.0, 500.0):
        standard_errors, pair_count = spatial_hac_standard_errors(
            scores, bread_inverse, coordinates, cutoff
        )
        pair_counts[str(int(cutoff))] = pair_count
        rows.extend(coefficient_rows(
            f"spatial_hac_{int(cutoff)}km",
            names,
            beta,
            standard_errors,
            cutoff,
        ))
    output_path = args.output_dir / "primary_spatial_hac_coefficients.csv"
    pd.DataFrame(rows).to_csv(output_path, index=False)
    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "cohort_systems": len(cohort),
        "outcome_events": int(y.sum()),
        "coefficient_model": (
            "Modified Poisson adjusted for five community characteristics, log2 population "
            "served, source, ownership, and EPA-region effects"
        ),
        "spatial_covariance": (
            "Conley-style sandwich covariance using great-circle centroid distance, a "
            "Bartlett kernel, and n/(n-p) finite-sample correction"
        ),
        "primary_spatial_cutoff_km": 250,
        "sensitivity_cutoffs_km": [100, 500],
        "nonself_neighbor_pairs": pair_counts,
        "state_clustered_comparator_clusters": fit["clusters"],
        "coefficient_invariance_check": (
            "All covariance specifications use the identical coefficient vector."
        ),
    }
    report_path = args.output_dir / "primary_spatial_hac_audit.json"
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"Wrote {output_path}")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
