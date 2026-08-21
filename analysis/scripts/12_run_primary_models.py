#!/usr/bin/env python3
"""Run prespecified AJPH-oriented descriptive and modified-Poisson models.

The primary inferential cohort is limited to active community water systems
serving at least 3,300 people. UCMR 5 attempted a census of those systems. The
systems serving fewer than 3,300 people were selected with a population-
weighted stratified design, but EPA does not publish row-level analysis
weights. They are therefore retained only in explicitly unweighted sensitivity
and descriptive analyses rather than mixed into the primary census cohort.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


EXPOSURES = [
    ("pct_hispanic", "Hispanic proportion, per 10 percentage points"),
    ("pct_nh_black", "Non-Hispanic Black proportion, per 10 percentage points"),
    ("pct_nh_aian", "Non-Hispanic AIAN proportion, per 10 percentage points"),
    ("pct_below_poverty", "Below-poverty proportion, per 10 percentage points"),
    ("pct_rural", "Rural proportion, per 10 percentage points"),
]

OUTCOMES = [
    ("any_system_above_mcl_comparison", "Any April 2024 PFAS benchmark comparison"),
    ("pfoa_system_above_mcl_comparison", "PFOA benchmark comparison"),
    ("pfos_system_above_mcl_comparison", "PFOS benchmark comparison"),
    ("pfhxs_system_above_mcl_comparison", "PFHxS benchmark comparison"),
    ("pfna_system_above_mcl_comparison", "PFNA benchmark comparison"),
    ("hfpo_da_system_above_mcl_comparison", "HFPO-DA benchmark comparison"),
    ("hi_system_above_mcl_comparison", "Hazard Index benchmark comparison"),
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    analysis_dir = Path(__file__).resolve().parents[1]
    parser.add_argument(
        "--data",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_with_demographics.csv",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=analysis_dir / "outputs",
    )
    return parser.parse_args()


def modified_poisson_clustered(
    x: np.ndarray,
    y: np.ndarray,
    clusters: np.ndarray,
    max_iter: int = 200,
    tolerance: float = 1e-9,
) -> dict[str, Any]:
    """Fit a Poisson log-link mean model with cluster-robust variance."""
    beta = np.zeros(x.shape[1], dtype=float)
    converged = False
    iterations = 0
    for iterations in range(1, max_iter + 1):
        eta = np.clip(x @ beta, -20, 20)
        mu = np.exp(eta)
        score = x.T @ (y - mu)
        hessian = x.T @ (x * mu[:, None])
        try:
            step = np.linalg.solve(hessian, score)
        except np.linalg.LinAlgError:
            step = np.linalg.pinv(hessian) @ score
        candidate = beta + step
        current_objective = float(np.sum(y * eta - mu))
        for _ in range(25):
            candidate_eta = np.clip(x @ candidate, -20, 20)
            candidate_mu = np.exp(candidate_eta)
            candidate_objective = float(np.sum(y * candidate_eta - candidate_mu))
            if candidate_objective >= current_objective - 1e-10:
                break
            step *= 0.5
            candidate = beta + step
        if np.max(np.abs(candidate - beta)) < tolerance:
            beta = candidate
            converged = True
            break
        beta = candidate

    eta = np.clip(x @ beta, -20, 20)
    mu = np.exp(eta)
    bread_inverse = np.linalg.pinv(x.T @ (x * mu[:, None]))
    unique_clusters = np.unique(clusters)
    meat = np.zeros((x.shape[1], x.shape[1]), dtype=float)
    residual = y - mu
    for cluster in unique_clusters:
        mask = clusters == cluster
        cluster_score = x[mask].T @ residual[mask]
        meat += np.outer(cluster_score, cluster_score)
    variance = bread_inverse @ meat @ bread_inverse
    n, p = x.shape
    g = len(unique_clusters)
    if g > 1 and n > p:
        variance *= (g / (g - 1)) * ((n - 1) / (n - p))
    standard_errors = np.sqrt(np.maximum(np.diag(variance), 0))
    return {
        "beta": beta,
        "standard_errors": standard_errors,
        "converged": converged,
        "iterations": iterations,
        "n": n,
        "p": p,
        "clusters": g,
        "fitted_min": float(mu.min()),
        "fitted_max": float(mu.max()),
        "condition_number": float(np.linalg.cond(x)),
    }


def source_group(value: str) -> str:
    value = str(value or "").upper()
    if value.startswith("SW"):
        return "Surface water"
    if value.startswith("GU"):
        return "Groundwater under influence"
    if value.startswith("GW"):
        return "Groundwater"
    return "Other/unknown"


def owner_group(value: str) -> str:
    value = str(value or "").strip()
    allowed = {
        "Private", "Local government", "State or Territorial Government",
        "Federal government", "Tribal Government", "Public/Private",
    }
    return value if value in allowed else "Other/unknown"


def add_dummies(
    columns: list[np.ndarray],
    names: list[str],
    series: pd.Series,
    prefix: str,
    reference: str,
) -> None:
    categories = sorted(str(value) for value in series.dropna().unique())
    if reference not in categories and categories:
        reference = categories[0]
    for category in categories:
        if category == reference:
            continue
        vector = (series.astype(str) == category).astype(float).to_numpy()
        if 0 < vector.sum() < len(vector):
            columns.append(vector)
            names.append(f"{prefix}: {category} vs {reference}")


def design_matrix(
    frame: pd.DataFrame,
    suffix: str,
    exposure_stems: list[str],
    include_system_covariates: bool,
) -> tuple[np.ndarray, list[str]]:
    columns: list[np.ndarray] = [np.ones(len(frame))]
    names = ["Intercept"]
    exposure_labels = dict(EXPOSURES)
    for stem in exposure_stems:
        values = pd.to_numeric(frame[f"{stem}_{suffix}"], errors="coerce").to_numpy(dtype=float)
        columns.append(values * 10.0)
        names.append(exposure_labels[stem])

    if include_system_covariates:
        population = pd.to_numeric(frame["population_served_count"], errors="coerce").to_numpy(dtype=float)
        columns.append(np.log2(np.maximum(population, 1)))
        names.append("Population served, per doubling")
        add_dummies(
            columns, names, frame["primary_source_code"].map(source_group),
            "Source", "Groundwater",
        )
        add_dummies(
            columns, names, frame["owner_desc"].map(owner_group),
            "Ownership", "Private",
        )
        add_dummies(
            columns, names, frame["sdwis_epa_region"].astype(str),
            "EPA region", "01",
        )
    return np.column_stack(columns), names


def required_columns(suffix: str, exposure_stems: list[str], include_system: bool) -> list[str]:
    required = [f"{stem}_{suffix}" for stem in exposure_stems]
    if include_system:
        required.extend([
            "population_served_count", "primary_source_code", "owner_desc",
            "sdwis_epa_region", "sdwis_state_code",
        ])
    else:
        required.append("sdwis_state_code")
    return required


def fit_model(
    frame: pd.DataFrame,
    outcome: str,
    suffix: str,
    exposure_stems: list[str],
    include_system_covariates: bool,
) -> tuple[pd.DataFrame, dict[str, Any]]:
    required = [outcome, *required_columns(suffix, exposure_stems, include_system_covariates)]
    model_frame = frame.dropna(subset=required).copy()
    y = pd.to_numeric(model_frame[outcome], errors="raise").to_numpy(dtype=float)
    events = int(y.sum())
    non_events = int(len(y) - events)
    if events < 20 or non_events < 20:
        return pd.DataFrame(), {
            "modeled": False,
            "reason": "Fewer than 20 events or non-events",
            "n": len(y),
            "outcome_events": events,
            "outcome_prevalence": float(y.mean()) if len(y) else None,
        }
    x, names = design_matrix(
        model_frame, suffix, exposure_stems, include_system_covariates
    )
    fit = modified_poisson_clustered(
        x,
        y,
        model_frame["sdwis_state_code"].astype(str).to_numpy(),
    )
    if not fit["converged"]:
        diagnostics = {
            key: value for key, value in fit.items()
            if key not in {"beta", "standard_errors"}
        }
        diagnostics.update({
            "modeled": False,
            "reason": "Modified-Poisson model did not converge",
            "outcome_events": events,
            "outcome_prevalence": float(y.mean()),
        })
        return pd.DataFrame(), diagnostics
    rows: list[dict[str, Any]] = []
    for name, beta, standard_error in zip(names, fit["beta"], fit["standard_errors"]):
        z = beta / standard_error if standard_error > 0 else float("nan")
        p_value = math.erfc(abs(z) / math.sqrt(2)) if math.isfinite(z) else None
        rows.append({
            "term": name,
            "log_prevalence_ratio": beta,
            "robust_standard_error": standard_error,
            "prevalence_ratio": math.exp(beta),
            "confidence_interval_low": math.exp(beta - 1.96 * standard_error),
            "confidence_interval_high": math.exp(beta + 1.96 * standard_error),
            "z": z,
            "p_value": p_value,
        })
    diagnostics = {
        key: value for key, value in fit.items()
        if key not in {"beta", "standard_errors"}
    }
    diagnostics.update({
        "modeled": True,
        "outcome_events": events,
        "outcome_prevalence": float(y.mean()),
    })
    return pd.DataFrame(rows), diagnostics


def descriptive_quartiles(frame: pd.DataFrame, suffix: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for stem, label in EXPOSURES:
        field = f"{stem}_{suffix}"
        values = pd.to_numeric(frame[field], errors="coerce")
        try:
            quartile = pd.qcut(values, 4, labels=False, duplicates="drop") + 1
        except ValueError:
            continue
        for group in sorted(int(value) for value in quartile.dropna().unique()):
            subset = frame[quartile == group]
            outcome = pd.to_numeric(subset["any_system_above_mcl_comparison"], errors="coerce")
            rows.append({
                "exposure": label,
                "quartile": group,
                "n_systems": len(subset),
                "exposure_min": float(values[quartile == group].min()),
                "exposure_max": float(values[quartile == group].max()),
                "above_2024_configuration": int(outcome.sum()),
                "prevalence": float(outcome.mean()),
            })
    return rows


def benjamini_hochberg(values: pd.Series) -> pd.Series:
    """Return monotone Benjamini-Hochberg adjusted p-values."""
    result = pd.Series(np.nan, index=values.index, dtype=float)
    valid = values.dropna().astype(float).sort_values()
    if valid.empty:
        return result
    m = len(valid)
    adjusted = valid.to_numpy() * m / np.arange(1, m + 1)
    adjusted = np.minimum.accumulate(adjusted[::-1])[::-1]
    result.loc[valid.index] = np.minimum(adjusted, 1.0)
    return result


def write_rows(path: Path, rows: list[dict[str, Any]]) -> None:
    if not rows:
        raise RuntimeError(f"No rows generated for {path}")
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def cohort_summary(frame: pd.DataFrame) -> dict[str, Any]:
    outcome = pd.to_numeric(frame["any_system_above_mcl_comparison"], errors="coerce")
    return {
        "systems": len(frame),
        "events": int(outcome.sum()),
        "prevalence": float(outcome.mean()),
    }


def main() -> None:
    args = parse_args()
    if not args.data.is_file():
        raise FileNotFoundError(args.data)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    frame = pd.read_csv(
        args.data,
        dtype={"pwsid": str, "sdwis_state_code": str, "sdwis_epa_region": str},
        low_memory=False,
    )
    base = frame[frame["primary_demographic_model_cohort"] == 1].copy()
    latest = frame[frame["latest_only_demographic_sensitivity_cohort"] == 1].copy()
    census = base[pd.to_numeric(base["population_served_count"], errors="coerce") >= 3300].copy()
    census_latest = latest[pd.to_numeric(latest["population_served_count"], errors="coerce") >= 3300].copy()
    sampled_small = base[pd.to_numeric(base["population_served_count"], errors="coerce") < 3300].copy()
    census_system_sourced = census[census["boundary_provenance"] == "System Sourced"].copy()

    all_exposure_stems = [stem for stem, _ in EXPOSURES]
    specifications = [
        ("primary_census_preferred_weight", census, "preferred"),
        ("area_weight_census_sensitivity", census, "area"),
        ("latest_only_census_sensitivity", census_latest, "preferred"),
        ("all_monitored_unweighted_sensitivity", base, "preferred"),
        ("system_sourced_boundary_census_sensitivity", census_system_sourced, "preferred"),
    ]
    coefficient_frames: list[pd.DataFrame] = []
    diagnostics: dict[str, Any] = {}
    for specification, cohort, suffix in specifications:
        fitted, audit = fit_model(
            cohort,
            "any_system_above_mcl_comparison",
            suffix,
            all_exposure_stems,
            True,
        )
        diagnostics[specification] = audit
        if not fitted.empty:
            fitted.insert(0, "specification", specification)
            coefficient_frames.append(fitted)
    coefficients = pd.concat(coefficient_frames, ignore_index=True)
    coefficients_path = args.output_dir / "primary_modified_poisson_coefficients.csv"
    coefficients.to_csv(coefficients_path, index=False)

    staged_frames: list[pd.DataFrame] = []
    staged_audit: dict[str, Any] = {}
    for stem, label in EXPOSURES:
        for stage, include_system in [("unadjusted", False), ("system_adjusted", True)]:
            key = f"{stage}:{stem}"
            fitted, audit = fit_model(
                census,
                "any_system_above_mcl_comparison",
                "preferred",
                [stem],
                include_system,
            )
            staged_audit[key] = audit
            if not fitted.empty:
                fitted = fitted[fitted["term"] == label].copy()
                fitted.insert(0, "exposure", stem)
                fitted.insert(0, "stage", stage)
                staged_frames.append(fitted)
    joint, joint_audit = fit_model(
        census,
        "any_system_above_mcl_comparison",
        "preferred",
        all_exposure_stems,
        True,
    )
    staged_audit["joint_full"] = joint_audit
    if not joint.empty:
        joint = joint[joint["term"].isin(dict(EXPOSURES).values())].copy()
        reverse_labels = {label: stem for stem, label in EXPOSURES}
        joint.insert(0, "exposure", joint["term"].map(reverse_labels))
        joint.insert(0, "stage", "joint_full")
        staged_frames.append(joint)
    staged = pd.concat(staged_frames, ignore_index=True)
    staged_path = args.output_dir / "primary_staged_exposure_models.csv"
    staged.to_csv(staged_path, index=False)

    influence_frames: list[pd.DataFrame] = []
    influence_audit: dict[str, Any] = {}
    influence_subsets: list[tuple[str, str, pd.DataFrame]] = []
    for region in sorted(census["sdwis_epa_region"].astype(str).unique()):
        influence_subsets.append((
            "leave_one_epa_region_out",
            f"excluded_region_{region}",
            census[census["sdwis_epa_region"].astype(str) != region].copy(),
        ))
    source_stratum = census["primary_source_code"].map(
        lambda value: (
            "surface_or_influence"
            if str(value).upper().startswith(("SW", "GU", "MX"))
            else "groundwater"
        )
    )
    for category in sorted(source_stratum.unique()):
        influence_subsets.append((
            "source_water_stratum",
            category,
            census[source_stratum == category].copy(),
        ))
    size_stratum = pd.cut(
        pd.to_numeric(census["population_served_count"], errors="coerce"),
        bins=[3299, 9999, 49999, float("inf")],
        labels=["3300_to_9999", "10000_to_49999", "50000_plus"],
    )
    for category in size_stratum.dropna().unique():
        influence_subsets.append((
            "population_size_stratum",
            str(category),
            census[size_stratum == category].copy(),
        ))
    for analysis_type, category, subset in influence_subsets:
        key = f"{analysis_type}:{category}"
        fitted, audit = fit_model(
            subset,
            "any_system_above_mcl_comparison",
            "preferred",
            all_exposure_stems,
            True,
        )
        influence_audit[key] = audit
        if not fitted.empty:
            fitted = fitted[fitted["term"].isin(dict(EXPOSURES).values())].copy()
            fitted.insert(0, "category", category)
            fitted.insert(0, "analysis_type", analysis_type)
            influence_frames.append(fitted)
    influence = pd.concat(influence_frames, ignore_index=True)
    influence_path = args.output_dir / "primary_influence_and_stratified_models.csv"
    influence.to_csv(influence_path, index=False)

    secondary_frames: list[pd.DataFrame] = []
    secondary_audit: dict[str, Any] = {}
    for outcome, outcome_label in OUTCOMES[1:]:
        fitted, audit = fit_model(
            census, outcome, "preferred", all_exposure_stems, True
        )
        secondary_audit[outcome] = audit
        if not fitted.empty:
            fitted.insert(0, "outcome_label", outcome_label)
            fitted.insert(0, "outcome", outcome)
            secondary_frames.append(fitted)
    secondary = pd.concat(secondary_frames, ignore_index=True)
    exposure_labels = set(dict(EXPOSURES).values())
    exposure_mask = secondary["term"].isin(exposure_labels)
    secondary["fdr_adjusted_p_value"] = np.nan
    secondary.loc[exposure_mask, "fdr_adjusted_p_value"] = benjamini_hochberg(
        secondary.loc[exposure_mask, "p_value"]
    )
    secondary_path = args.output_dir / "secondary_outcome_modified_poisson_coefficients.csv"
    secondary.to_csv(secondary_path, index=False)

    quartile_rows = descriptive_quartiles(census, "preferred")
    quartiles_path = args.output_dir / "primary_outcome_by_demographic_quartile.csv"
    write_rows(quartiles_path, quartile_rows)

    correlation = census[[f"{stem}_preferred" for stem in all_exposure_stems]].corr()
    correlation.index = all_exposure_stems
    correlation.columns = all_exposure_stems
    correlation_path = args.output_dir / "primary_exposure_correlation_matrix.csv"
    correlation.to_csv(correlation_path, index_label="exposure")

    occurrence = frame[frame["primary_occurrence_cohort"] == 1].copy()
    pfoa_pfos = (
        (occurrence["pfoa_system_above_mcl_comparison"] == 1)
        | (occurrence["pfos_system_above_mcl_comparison"] == 1)
    )
    other_2024 = (
        (occurrence["pfhxs_system_above_mcl_comparison"] == 1)
        | (occurrence["pfna_system_above_mcl_comparison"] == 1)
        | (occurrence["hfpo_da_system_above_mcl_comparison"] == 1)
        | (occurrence["hi_system_above_mcl_comparison"] == 1)
    )
    any_2024 = occurrence["any_system_above_mcl_comparison"] == 1
    policy_only = other_2024 & ~pfoa_pfos
    population = pd.to_numeric(occurrence["population_served_count"], errors="coerce").fillna(0)
    policy_summary = {
        "occurrence_cohort_systems": len(occurrence),
        "systems_above_any_april_2024_configuration": int(any_2024.sum()),
        "systems_above_pfoa_or_pfos_comparison": int(pfoa_pfos.sum()),
        "systems_above_hfpoda_pfhxs_pfna_or_hi_comparison": int(other_2024.sum()),
        "systems_identified_only_by_hfpoda_pfhxs_pfna_or_hi": int(policy_only.sum()),
        "reported_population_served_by_systems_above_any_2024_configuration": float(population[any_2024].sum()),
        "reported_population_served_by_systems_identified_only_by_other_2024_provisions": float(population[policy_only].sum()),
        "population_note": (
            "Sum of system-reported population-served counts; not a de-duplicated "
            "count of unique people and potentially includes wholesale overlap."
        ),
    }

    report = {
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "primary_outcome": "Any EPA-derived location-average comparison above the April 2024 PFAS NPDWR configuration",
        "primary_inferential_cohort": (
            "Active community water systems serving at least 3,300 people with complete "
            "EPA-derived averages and eligible service-area demographics"
        ),
        "sampling_design_reason": (
            "UCMR 5 monitored all eligible PWSs serving at least 3,300 people. The smaller-system "
            "sample used a population-weighted stratified design, but public row-level analysis "
            "weights were not identified; those systems are not mixed into primary inference."
        ),
        "estimator": "Modified Poisson with state-clustered sandwich variance",
        "joint_adjustment": (
            "Hispanic, non-Hispanic Black, non-Hispanic AIAN, poverty, rurality, log2 "
            "population served, source-water group, ownership group, and EPA-region effects"
        ),
        "cohort_counts": {
            "primary_census": cohort_summary(census),
            "all_monitored_demographic_sample": cohort_summary(base),
            "sampled_systems_below_3300": cohort_summary(sampled_small),
            "latest_only_primary_census": cohort_summary(census_latest),
            "system_sourced_boundary_primary_census": cohort_summary(census_system_sourced),
        },
        "diagnostics": diagnostics,
        "staged_model_diagnostics": staged_audit,
        "influence_and_stratified_diagnostics": influence_audit,
        "secondary_outcome_diagnostics": secondary_audit,
        "secondary_model_rule": (
            "Compound-specific models require at least 20 events and 20 non-events; "
            "Benjamini-Hochberg FDR is applied across all modeled secondary-outcome "
            "community-characteristic coefficients."
        ),
        "policy_summary": policy_summary,
        "interpretation": (
            "Cross-sectional ecological associations, not individual exposure, "
            "causal effects, disease risk, or compliance determinations."
        ),
    }
    report_path = args.output_dir / "primary_model_audit.json"
    report_path.write_text(json.dumps(report, indent=2, sort_keys=True), encoding="utf-8")

    print(f"Wrote {coefficients_path}")
    print(f"Wrote {staged_path}")
    print(f"Wrote {influence_path}")
    print(f"Wrote {secondary_path}")
    print(f"Wrote {quartiles_path}")
    print(f"Wrote {correlation_path}")
    print(f"Wrote {report_path}")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
