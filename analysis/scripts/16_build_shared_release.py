#!/usr/bin/env python3
"""Build frozen manuscript tables and website data from one analysis release."""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd


RELEASE_ID = "ucmr5-2026-01-15-analysis-v0.2"


def parse_args() -> argparse.Namespace:
    analysis_dir = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--systems",
        type=Path,
        default=analysis_dir / "outputs" / "ucmr5_system_analysis_with_demographics.csv",
    )
    parser.add_argument(
        "--locations",
        type=Path,
        default=analysis_dir / "outputs" / "epa_ucmr5_average_pfas_locations.csv",
    )
    parser.add_argument(
        "--zip-crosswalk",
        type=Path,
        default=Path(
            "/Users/jackzhang/Downloads/ucmr5-occurrence-data/UCMR5_ZIPCodes.txt"
        ),
    )
    parser.add_argument(
        "--outputs", type=Path, default=analysis_dir / "outputs"
    )
    parser.add_argument(
        "--release-dir",
        type=Path,
        default=analysis_dir / "exports" / "ucmr5_jan2026_v0_2",
    )
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def clean_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        if not math.isfinite(float(value)):
            return None
        return round(float(value), 8)
    if isinstance(value, (np.bool_, bool)):
        return bool(value)
    return value


def records(frame: pd.DataFrame) -> list[dict[str, Any]]:
    return [
        {key: clean_value(value) for key, value in row.items()}
        for row in frame.to_dict(orient="records")
    ]


def write_json(path: Path, value: Any) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False),
        encoding="utf-8",
    )


def median_iqr(values: pd.Series, percentage: bool = False) -> str:
    numeric = pd.to_numeric(values, errors="coerce").dropna()
    if percentage:
        numeric = numeric * 100
    if numeric.empty:
        return "—"
    median, q1, q3 = numeric.quantile([0.5, 0.25, 0.75])
    if percentage:
        return f"{median:.1f} [{q1:.1f}, {q3:.1f}]"
    return f"{median:,.0f} [{q1:,.0f}, {q3:,.0f}]"


def n_percent(mask: pd.Series, denominator: int) -> str:
    count = int(mask.fillna(False).sum())
    return f"{count:,} ({100 * count / denominator:.1f})"


def table1(system_frame: pd.DataFrame) -> pd.DataFrame:
    cohort = system_frame[
        (system_frame["primary_demographic_model_cohort"] == 1)
        & (pd.to_numeric(system_frame["population_served_count"], errors="coerce") >= 3300)
    ].copy()
    positive = cohort[cohort["any_system_above_mcl_comparison"] == 1]
    negative = cohort[cohort["any_system_above_mcl_comparison"] == 0]
    groups = [("Overall", cohort), ("Above benchmark", positive), ("Not above benchmark", negative)]
    rows: list[dict[str, str]] = []

    def add_row(label: str, formatter) -> None:
        row = {"Characteristic": label}
        for group_label, group in groups:
            row[group_label] = formatter(group)
        rows.append(row)

    add_row("Systems, No.", lambda group: f"{len(group):,}")
    add_row(
        "Population served, median [IQR]",
        lambda group: median_iqr(group["population_served_count"]),
    )
    for field, label in [
        ("pct_hispanic_preferred", "Hispanic population, median % [IQR]"),
        ("pct_nh_black_preferred", "Non-Hispanic Black population, median % [IQR]"),
        ("pct_nh_aian_preferred", "Non-Hispanic AIAN population, median % [IQR]"),
        ("pct_below_poverty_preferred", "Population below poverty, median % [IQR]"),
        ("pct_rural_preferred", "Rural population, median % [IQR]"),
    ]:
        add_row(label, lambda group, field=field: median_iqr(group[field], True))
    for value, label in [
        ("Ground water", "Ground-water source, No. (%)"),
        ("Surface water", "Surface-water source, No. (%)"),
        ("Surface water purchased", "Purchased surface-water source, No. (%)"),
    ]:
        add_row(
            label,
            lambda group, value=value: n_percent(
                group["primary_source_desc"] == value, len(group)
            ),
        )
    named_sources = {"Ground water", "Surface water", "Surface water purchased"}
    add_row(
        "Other source-water category, No. (%)",
        lambda group: n_percent(
            ~group["primary_source_desc"].isin(named_sources), len(group)
        ),
    )
    for value, label in [
        ("Local government", "Local-government ownership, No. (%)"),
        ("Private", "Private ownership, No. (%)"),
    ]:
        add_row(
            label,
            lambda group, value=value: n_percent(group["owner_desc"] == value, len(group)),
        )
    named_owners = {"Local government", "Private"}
    add_row(
        "Other or mixed ownership, No. (%)",
        lambda group: n_percent(~group["owner_desc"].isin(named_owners), len(group)),
    )
    add_row(
        "System-sourced service-area boundary, No. (%)",
        lambda group: n_percent(group["boundary_provenance"] == "System Sourced", len(group)),
    )
    add_row(
        "Connecticut older-vintage geography fallback, No. (%)",
        lambda group: n_percent(
            pd.to_numeric(group["demographic_ct_fallback_row_count"], errors="coerce").fillna(0) > 0,
            len(group),
        ),
    )
    return pd.DataFrame(rows)


def build_website_systems(system_frame: pd.DataFrame) -> pd.DataFrame:
    fields = [
        "pwsid", "ucmr_pws_name", "sdwis_state_code", "sdwis_epa_region",
        "pws_type_desc", "pws_activity_desc", "population_served_count",
        "primary_source_desc", "owner_desc", "sampling_location_count",
        "boundary_provenance", "service_area_type_desc",
        "pfoa_system_full_set", "pfoa_system_above_mcl_comparison", "pfoa_max_location_average",
        "pfos_system_full_set", "pfos_system_above_mcl_comparison", "pfos_max_location_average",
        "pfhxs_system_full_set", "pfhxs_system_above_mcl_comparison", "pfhxs_max_location_average",
        "pfna_system_full_set", "pfna_system_above_mcl_comparison", "pfna_max_location_average",
        "hfpo_da_system_full_set", "hfpo_da_system_above_mcl_comparison", "hfpo_da_max_location_average",
        "hi_system_full_set", "hi_system_above_mcl_comparison", "hi_max_location_average",
        "any_system_full_set", "any_system_above_mcl_comparison",
        "primary_occurrence_cohort", "primary_demographic_model_cohort",
        "pct_hispanic_preferred", "pct_nh_black_preferred", "pct_nh_aian_preferred",
        "pct_below_poverty_preferred", "pct_rural_preferred",
        "demographic_source_category", "cohort_exclusion_reasons",
    ]
    result = system_frame[fields].copy()
    result["primary_inferential_cohort"] = (
        (result["primary_demographic_model_cohort"] == 1)
        & (pd.to_numeric(result["population_served_count"], errors="coerce") >= 3300)
    ).astype(int)
    return result


def main() -> None:
    args = parse_args()
    required_paths = [args.systems, args.locations, args.zip_crosswalk]
    required_paths.extend([
        args.outputs / "primary_spatial_hac_coefficients.csv",
        args.outputs / "primary_modified_poisson_coefficients.csv",
        args.outputs / "primary_model_audit.json",
        args.outputs / "primary_spatial_residual_diagnostics.json",
        args.outputs / "secondary_outcome_modified_poisson_coefficients.csv",
    ])
    for path in required_paths:
        if not path.is_file():
            raise FileNotFoundError(path)
    args.release_dir.mkdir(parents=True, exist_ok=True)

    systems = pd.read_csv(
        args.systems,
        dtype={"pwsid": str, "sdwis_state_code": str, "sdwis_epa_region": str},
        low_memory=False,
    )
    locations = pd.read_csv(args.locations, dtype={"pwsid": str}, low_memory=False)
    website_systems = build_website_systems(systems)

    zip_links: dict[str, list[str]] = defaultdict(list)
    valid_pwsids = set(systems["pwsid"].astype(str))
    with args.zip_crosswalk.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle, delimiter="\t")
        for row in reader:
            pwsid = str(row["PWSID"])
            zipcode = str(row["ZIPCODE"]).zfill(5)
            if pwsid in valid_pwsids:
                zip_links[zipcode].append(pwsid)
    zip_links = {
        zipcode: sorted(set(pwsids))
        for zipcode, pwsids in sorted(zip_links.items())
    }
    write_json(
        args.release_dir / "website_zip_to_monitored_systems.json",
        {"release_id": RELEASE_ID, "zip_to_pwsids": zip_links},
    )

    compact_columns = [
        "pwsid", "ucmr_pws_name", "sdwis_state_code", "population_served_count",
        "pws_type_desc", "pws_activity_desc", "primary_source_desc", "owner_desc",
        "sampling_location_count",
        "boundary_provenance", "any_system_full_set", "any_system_above_mcl_comparison",
        "pfoa_system_full_set", "pfoa_system_above_mcl_comparison", "pfoa_max_location_average",
        "pfos_system_full_set", "pfos_system_above_mcl_comparison", "pfos_max_location_average",
        "pfhxs_system_full_set", "pfhxs_system_above_mcl_comparison", "pfhxs_max_location_average",
        "pfna_system_full_set", "pfna_system_above_mcl_comparison", "pfna_max_location_average",
        "hfpo_da_system_full_set", "hfpo_da_system_above_mcl_comparison", "hfpo_da_max_location_average",
        "hi_system_full_set", "hi_system_above_mcl_comparison", "hi_max_location_average",
        "pct_hispanic_preferred", "pct_nh_black_preferred", "pct_nh_aian_preferred",
        "pct_below_poverty_preferred", "pct_rural_preferred",
        "primary_occurrence_cohort", "primary_inferential_cohort",
    ]
    compact_rows = [
        [clean_value(value) for value in row]
        for row in website_systems[compact_columns].itertuples(index=False, name=None)
    ]
    write_json(
        args.release_dir / "website_lookup_compact.json",
        {
            "release_id": RELEASE_ID,
            "columns": compact_columns,
            "systems": compact_rows,
            "zip_to_pwsids": zip_links,
        },
    )

    occurrence = systems[systems["primary_occurrence_cohort"] == 1].copy()
    state_rows: list[dict[str, Any]] = []
    for state, group in occurrence.groupby("sdwis_state_code", dropna=False):
        state_rows.append({
            "state": state,
            "eligible_cws_with_complete_monitoring": len(group),
            "above_any_april_2024_benchmark": int(group["any_system_above_mcl_comparison"].sum()),
            "above_pfoa": int(group["pfoa_system_above_mcl_comparison"].sum()),
            "above_pfos": int(group["pfos_system_above_mcl_comparison"].sum()),
            "above_pfhxs": int(group["pfhxs_system_above_mcl_comparison"].sum()),
            "above_pfna": int(group["pfna_system_above_mcl_comparison"].sum()),
            "above_hfpo_da": int(group["hfpo_da_system_above_mcl_comparison"].sum()),
            "above_hazard_index": int(group["hi_system_above_mcl_comparison"].sum()),
        })
    write_json(
        args.release_dir / "website_state_summary.json",
        {"release_id": RELEASE_ID, "states": state_rows},
    )

    table1_path = args.release_dir / "manuscript_table1.csv"
    table1(systems).to_csv(table1_path, index=False, quoting=csv.QUOTE_MINIMAL)

    spatial = pd.read_csv(args.outputs / "primary_spatial_hac_coefficients.csv")
    exposure_mask = spatial["term"].str.contains("proportion, per 10 percentage points", regex=False)
    table2 = spatial[(spatial["specification"] == "spatial_hac_250km") & exposure_mask].copy()
    table2 = table2[[
        "term", "prevalence_ratio", "confidence_interval_low",
        "confidence_interval_high", "p_value",
    ]]
    table2.to_csv(args.release_dir / "manuscript_table2.csv", index=False)

    state_clustered_sensitivities = pd.read_csv(
        args.outputs / "primary_modified_poisson_coefficients.csv"
    )
    state_clustered_sensitivities = state_clustered_sensitivities[
        state_clustered_sensitivities["term"].str.contains(
            "proportion, per 10 percentage points", regex=False
        )
    ].copy()
    spatial_sensitivities = spatial[exposure_mask].copy()
    spatial_sensitivities["specification"] = (
        "primary_census_preferred_weight:" + spatial_sensitivities["specification"]
    )
    sensitivity_columns = [
        "specification", "term", "prevalence_ratio", "confidence_interval_low",
        "confidence_interval_high", "p_value",
    ]
    pd.concat([
        state_clustered_sensitivities[sensitivity_columns],
        spatial_sensitivities[sensitivity_columns],
    ], ignore_index=True).to_csv(
        args.release_dir / "manuscript_primary_sensitivities.csv", index=False
    )

    secondary = pd.read_csv(
        args.outputs / "secondary_outcome_modified_poisson_coefficients.csv"
    )
    secondary[secondary["term"].str.contains(
        "proportion, per 10 percentage points", regex=False
    )].to_csv(args.release_dir / "manuscript_secondary_outcomes.csv", index=False)

    primary_audit = json.loads(
        (args.outputs / "primary_model_audit.json").read_text(encoding="utf-8")
    )
    spatial_audit = json.loads(
        (args.outputs / "primary_spatial_residual_diagnostics.json").read_text(encoding="utf-8")
    )
    demographic_cohort = systems[systems["primary_demographic_model_cohort"] == 1]
    primary_census = demographic_cohort[
        pd.to_numeric(demographic_cohort["population_served_count"], errors="coerce") >= 3300
    ]
    flow = pd.DataFrame([
        {"stage": "EPA average-export PWSs", "systems": len(systems)},
        {"stage": "Active CWSs with complete monitoring", "systems": int(systems["primary_occurrence_cohort"].sum())},
        {"stage": "Eligible demographic model sample", "systems": len(demographic_cohort)},
        {"stage": "Primary census-monitored inferential cohort (population ≥3300)", "systems": len(primary_census)},
        {"stage": "Primary outcome events", "systems": int(primary_census["any_system_above_mcl_comparison"].sum())},
    ])
    flow.to_csv(args.release_dir / "manuscript_cohort_flow.csv", index=False)

    outcome_fields = [
        ("PFOA", "pfoa_system_above_mcl_comparison"),
        ("PFOS", "pfos_system_above_mcl_comparison"),
        ("PFHxS", "pfhxs_system_above_mcl_comparison"),
        ("PFNA", "pfna_system_above_mcl_comparison"),
        ("HFPO-DA", "hfpo_da_system_above_mcl_comparison"),
        ("Hazard Index", "hi_system_above_mcl_comparison"),
        ("Any April 2024 comparison", "any_system_above_mcl_comparison"),
    ]
    outcome_counts = pd.DataFrame([
        {
            "outcome": label,
            "systems_meeting_comparison": int(primary_census[field].sum()),
            "systems_in_primary_cohort": len(primary_census),
            "percent": 100 * float(primary_census[field].mean()),
        }
        for label, field in outcome_fields
    ])
    outcome_counts.to_csv(
        args.release_dir / "manuscript_primary_outcome_counts.csv", index=False
    )

    pfoa_or_pfos = (
        occurrence["pfoa_system_above_mcl_comparison"].eq(1)
        | occurrence["pfos_system_above_mcl_comparison"].eq(1)
    )
    proposed_rescission_provisions = (
        occurrence["pfhxs_system_above_mcl_comparison"].eq(1)
        | occurrence["pfna_system_above_mcl_comparison"].eq(1)
        | occurrence["hfpo_da_system_above_mcl_comparison"].eq(1)
        | occurrence["hi_system_above_mcl_comparison"].eq(1)
    )
    policy_rows = []
    for label, mask in [
        ("Any April 2024 comparison", pfoa_or_pfos | proposed_rescission_provisions),
        ("PFOA or PFOS comparison", pfoa_or_pfos),
        ("PFHxS, PFNA, HFPO-DA, or Hazard Index comparison", proposed_rescission_provisions),
        ("Only a proposed-rescission provision", proposed_rescission_provisions & ~pfoa_or_pfos),
    ]:
        policy_rows.append({
            "scenario": label,
            "systems": int(mask.sum()),
            "systems_in_occurrence_cohort": len(occurrence),
            "summed_reported_population_served": int(
                pd.to_numeric(
                    occurrence.loc[mask, "population_served_count"], errors="coerce"
                ).fillna(0).sum()
            ),
        })
    pd.DataFrame(policy_rows).to_csv(
        args.release_dir / "manuscript_policy_scenario.csv", index=False
    )

    metadata = {
        "release_id": RELEASE_ID,
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "source_release": "EPA UCMR 5 results received through January 15, 2026",
        "rule_status_checked": "2026-08-14",
        "classification": (
            "EPA technical-assistance comparison based on UCMR 5 location annual averages; "
            "not a compliance determination"
        ),
        "zip_lookup_limitation": (
            "ZIP links are PWS-reported UCMR service ZIP associations. They identify potentially "
            "relevant monitored systems but do not establish household service or exposure."
        ),
        "primary_inferential_cohort": primary_audit["cohort_counts"]["primary_census"],
        "primary_estimator": (
            "Modified Poisson with EPA-region effects and 250-km Bartlett spatial-HAC covariance"
        ),
        "residual_moran_i_k8_pearson": spatial_audit["diagnostics"]["k_8"]["pearson_residual"],
        "thresholds_ug_l": {
            "pfoa_unrounded_comparison_cutoff": 0.00405,
            "pfos_unrounded_comparison_cutoff": 0.00405,
            "pfhxs_unrounded_comparison_cutoff": 0.015,
            "pfna_unrounded_comparison_cutoff": 0.015,
            "hfpo_da_unrounded_comparison_cutoff": 0.015,
            "hazard_index_unrounded_comparison_cutoff": 1.5,
        },
        "policy_context": (
            "The April 2024 rule remains the benchmark configuration used here. EPA proposed in "
            "May 2026 to rescind provisions specific to PFHxS, PFNA, HFPO-DA, and Hazard Index "
            "mixtures; that proposal is not treated as final."
        ),
        "website_counts": {
            "systems": len(website_systems),
            "official_average_locations": len(locations),
            "reported_zip_codes": len(zip_links),
        },
    }
    write_json(args.release_dir / "website_metadata.json", metadata)

    output_files = sorted(
        path for path in args.release_dir.iterdir()
        if path.is_file() and path.name != "release_manifest.json"
    )
    manifest = {
        "release_id": RELEASE_ID,
        "generated_utc": datetime.now(tz=timezone.utc).isoformat(),
        "inputs": {
            path.name: {"bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in required_paths
        },
        "artifacts": {
            path.name: {"bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in output_files
        },
        "interpretation": (
            "Manuscript tables and website data in this directory are generated from the same "
            "frozen analysis outputs. Manual recalculation is prohibited."
        ),
    }
    manifest_path = args.release_dir / "release_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote release to {args.release_dir}")
    print(json.dumps({
        "release_id": RELEASE_ID,
        "systems": len(website_systems),
        "locations": len(locations),
        "zip_codes": len(zip_links),
        "artifacts": len(output_files) + 1,
    }, indent=2))


if __name__ == "__main__":
    main()
