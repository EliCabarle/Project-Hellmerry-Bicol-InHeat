"""Push the static JSON outputs into Supabase `municipality_trends`.

Reads `output/narratives.json` (trend + danger-day numbers) and, when present,
`output/drivers.json` (RF/SHAP ranking) and `data/lst_means.csv` (MODIS LST per
municipality centroid), and upserts one row per municipality.

Conflict key is `(name, province)`, not `name`: 'Bato' and 'San Fernando' each
exist in two Region V provinces, so upserting on name alone overwrites one with
the other. Requires a unique constraint on that pair - see
`apps/api/migrations/0002_top_drivers.sql`.

Usage:
  python push_to_supabase.py            # needs SUPABASE_URL + SUPABASE_SERVICE_KEY in .env
  python push_to_supabase.py --dry-run  # print what would be written, no network
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

import pandas as pd
import numpy as np
import numbers
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

# fetch_lst_data.py writes this; missing file just means lst_mean_c stays null.
LST_CSV = BASE_DIR / "data" / "lst_means.csv"
LST_BY_KEY: dict[tuple[str, str], float | None] = (
    {
        (row.name, row.province): None if pd.isna(row.lst_mean_c) else float(row.lst_mean_c)
        for row in pd.read_csv(LST_CSV).itertuples()
    }
    if LST_CSV.exists()
    else {}
)


def load_output(name: str) -> dict:
    path = BASE_DIR / "output" / name
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}


def driver_index() -> dict[tuple[str, str], list[dict]]:
    """(name, province) -> top_drivers, empty when calculate_drivers.py has not run."""
    drivers = load_output("drivers.json")
    return {
        (row["name"], row["province"]): row["top_drivers"]
        for row in drivers.get("municipalities", [])
    }


def spatial_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> spatial driver features, empty when calculate_spatial_drivers.py has not run."""
    spatial = load_output("spatial_drivers.json")
    return {
        (row["name"], row["province"]): row
        for row in spatial.get("municipalities", [])
    }


def trends_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> trend fields from output/trends.json."""
    path = BASE_DIR / "output" / "trends.json"
    data = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return {
        (row["name"], row["province"]): {
            "p_value_fdr": row.get("p_value_fdr"),
            "significant_fdr": row.get("significant_fdr"),
            "slope_ci_bootstrap_low": row.get("slope_ci_bootstrap_low"),
            "slope_ci_bootstrap_high": row.get("slope_ci_bootstrap_high"),
            "significant_bootstrap": row.get("significant_bootstrap"),
        }
        for row in data.get("municipalities", [])
    }


def backtest_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> {rmse, mae} from output/backtest_results.json."""
    path = BASE_DIR / "output" / "backtest_results.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    index: dict[tuple[str, str], dict] = {}
    for split_name in ("split_short", "split_long"):
        for row in data.get(split_name, {}).get("per_municipality", []):
            key = (row["name"], row["province"])
            # Both splits carry the same municipality rmse/mae; keep the short split's.
            index.setdefault(
                key,
                {"backtest_rmse": row.get("rmse"), "backtest_mae": row.get("mae")},
            )
    return index


def forecast_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> 2050 forecast fields from output/forecast_2050.json."""
    path = BASE_DIR / "output" / "forecast_2050.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        (row["name"], row["province"]): {
            "forecast_2050_central_c": row.get("2050_central_c"),
            "forecast_2050_low_c": row.get("2050_low_c"),
            "forecast_2050_high_c": row.get("2050_high_c"),
            "forecast_2050_danger_days": row.get("projected_danger_days_2050"),
            "cmip6_2050_ssp245_c": row.get("cmip6_2050_ssp245_c"),
            "cmip6_2050_ssp585_c": row.get("cmip6_2050_ssp585_c"),
        }
        for row in data
    }


def population_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> population fields from data/population.csv."""
    path = BASE_DIR / "data" / "population.csv"
    if not path.exists():
        return {}
    import csv

    index: dict[tuple[str, str], dict] = {}
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            key = (row["name"], row["province"])
            index[key] = {
                "population_2020": (
                    int(round(float(row["population_2020"])))
                    if row.get("population_2020")
                    else None
                ),
                "population_density": (
                    float(row["population_density"])
                    if row.get("population_density")
                    else None
                ),
                "exposed_flag": row.get("exposed_flag", "").lower() == "true",
            }
    return index


def spatial_metadata() -> dict:
    """Model-level spatial CV metrics from output/spatial_drivers.json metadata."""
    path = BASE_DIR / "output" / "spatial_drivers.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        "spatial_r2_cv_mean": data.get("spatial_r2_cv_mean"),
    }


def morans_i_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> {morans_i_local, lisa_cluster} from output/morans_i.json."""
    path = BASE_DIR / "output" / "morans_i.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        (row["name"], row["province"]): {
            "morans_i_local": row.get("morans_i_local"),
            "lisa_cluster": row.get("lisa_cluster"),
        }
        for row in data.get("municipalities", [])
    }


def volatility_index() -> dict[tuple[str, str], dict]:
    """(name, province) -> volatility metrics from output/volatility_analysis.json."""
    path = BASE_DIR / "output" / "volatility_analysis.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        (row["name"], row["province"]): {
            "annual_peak_std": row.get("annual_peak_std"),
            "danger_days_var": row.get("danger_days_var"),
            "p99_p50_gap": row.get("p99_p50_gap"),
            "vol_trend_slope": row.get("vol_trend", {}).get("slope"),
            "vol_trend_p_value": row.get("vol_trend", {}).get("p_value"),
            "vol_trend_significant": row.get("vol_trend", {}).get("significant"),
            "vol_trend_direction": row.get("vol_trend", {}).get("direction"),
        }
        for row in data.get("municipalities", [])
    }


def enso_index() -> dict:
    """Read enso_results.json and return the model-level Pearson r for mean heat."""
    path = BASE_DIR / "output" / "enso_results.json"
    if not path.exists():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    return {
        "enso_heat_correlation": data.get("analysis_a_mean_heat", {}).get("pearson_r"),
    }


def build_record(
    city_data: dict,
    drivers: dict,
    spatial: dict,
    trends: dict,
    backtest: dict,
    forecast: dict,
    population: dict,
    spatial_meta: dict,
    morans_i: dict,
    volatility: dict,
    enso: dict,
) -> dict:
    trend = city_data.get("trend") or {}
    peak = city_data.get("peak_danger_days") or {}
    latest = city_data.get("latest") or {}
    key = (city_data.get("name"), city_data.get("province", ""))
    bt = backtest.get(key, {})
    fc = forecast.get(key, {})
    tf = trends.get(key, {})
    pop = population.get(key, {})
    return {
        "name": city_data.get("name"),
        "province": city_data.get("province", ""),
        "latitude": city_data.get("lat"),
        "longitude": city_data.get("lon"),
        # column is `slope`; the source key is slope_c_per_year
        "slope": trend.get("slope_c_per_year"),
        "slope_ci_low": trend.get("slope_ci_low"),
        "slope_ci_high": trend.get("slope_ci_high"),
        "p_value": trend.get("p_value"),
        "is_significant": trend.get("is_significant"),
        # Pettitt: year the regime shifted, and the p that makes it readable
        "change_point_year": trend.get("change_point_year"),
        "change_point_p": trend.get("change_point_p"),
        "top_drivers": drivers.get(key),
        "spatial_drivers": spatial.get(key),
        "lst_mean_c": LST_BY_KEY.get(key),
        # latest-year annual means of the daily peak and nighttime heat index
        "heat_index_max_c": latest.get("mean_heat_index_c"),
        "nighttime_heat_index_c": latest.get("nighttime_heat_index_c"),
        "total_danger_days_45y": city_data.get("total_danger_days_45y", 0),
        "peak_danger_year": peak.get("year"),
        "peak_danger_days": peak.get("days", 0),
        "narration_en": city_data.get("narration", {}).get("en"),
        "narration_fil": city_data.get("narration", {}).get("fil"),
        "series": city_data.get("series", []),
        # Backtest results
        "backtest_rmse": bt.get("backtest_rmse"),
        "backtest_mae": bt.get("backtest_mae"),
        # 2050 forecast
        "forecast_2050_central_c": fc.get("forecast_2050_central_c"),
        "forecast_2050_low_c": fc.get("forecast_2050_low_c"),
        "forecast_2050_high_c": fc.get("forecast_2050_high_c"),
        "forecast_2050_danger_days": fc.get("forecast_2050_danger_days"),
        "cmip6_2050_ssp245_c": fc.get("cmip6_2050_ssp245_c"),
        "cmip6_2050_ssp585_c": fc.get("cmip6_2050_ssp585_c"),
        # FDR correction
        "p_value_fdr": tf.get("p_value_fdr"),
        "significant_fdr": tf.get("significant_fdr"),
        # Bootstrap CI
        "slope_ci_bootstrap_low": tf.get("slope_ci_bootstrap_low"),
        "slope_ci_bootstrap_high": tf.get("slope_ci_bootstrap_high"),
        "significant_bootstrap": tf.get("significant_bootstrap"),
        # Population exposure
        "population_2020": pop.get("population_2020"),
        "population_density": pop.get("population_density"),
        "exposed_flag": pop.get("exposed_flag"),
        # Precipitation (Earth-system variable: annual 2024 total + heat-index correlation)
        "annual_precip_mm_2024": city_data.get("annual_precip_mm_2024"),
        "precip_heat_index_corr_2024": city_data.get("precip_heat_index_corr_2024"),
        # Spatial model CV (model-level, repeated per row)
        "spatial_r2_cv_mean": spatial_meta.get("spatial_r2_cv_mean"),
        # Moran's I / LISA
        "morans_i_local": morans_i.get(key, {}).get("morans_i_local"),
        "lisa_cluster": morans_i.get(key, {}).get("lisa_cluster"),
        # Volatility Engine
        "annual_peak_std": volatility.get(key, {}).get("annual_peak_std"),
        "danger_days_var": volatility.get(key, {}).get("danger_days_var"),
        "p99_p50_gap": volatility.get(key, {}).get("p99_p50_gap"),
        "vol_trend_slope": volatility.get(key, {}).get("vol_trend_slope"),
        "vol_trend_p_value": volatility.get(key, {}).get("vol_trend_p_value"),
        "vol_trend_significant": volatility.get(key, {}).get("vol_trend_significant"),
        "vol_trend_direction": volatility.get(key, {}).get("vol_trend_direction"),
        # ENSO / ONI (model-level, repeated per row)
        "enso_heat_correlation": enso.get("enso_heat_correlation"),
    }


def main(dry_run: bool) -> None:
    municipalities = load_output("narratives.json").get("municipalities", [])
    drivers = driver_index()
    spatial = spatial_index()
    trends = trends_index()
    backtest = backtest_index()
    forecast = forecast_index()
    population = population_index()
    spatial_meta = spatial_metadata()
    morans_i = morans_i_index()
    volatility = volatility_index()
    enso = enso_index()
    if not drivers:
        print("warning: output/drivers.json missing - top_drivers will be null")
    if not spatial:
        print("warning: output/spatial_drivers.json missing - spatial_drivers will be null")
    if not trends:
        print("warning: output/trends.json missing - p_value_fdr/significant_fdr will be null")
    if not backtest:
        print("warning: output/backtest_results.json missing - backtest_rmse/backtest_mae will be null")
    if not forecast:
        print("warning: output/forecast_2050.json missing - forecast_2050_* will be null")
    if not population:
        print("warning: data/population.csv missing - population_2020/exposed_flag will be null")
    if not spatial_meta:
        print("warning: output/spatial_drivers.json metadata missing - spatial_r2_cv_mean will be null")
    if not morans_i:
        print("warning: output/morans_i.json missing - morans_i_local/lisa_cluster will be null")
    if not volatility:
        print("warning: output/volatility_analysis.json missing - volatility fields will be null")
    if not LST_BY_KEY:
        print("warning: data/lst_means.csv missing - lst_mean_c will be null")

    client = None
    if not dry_run:
        from supabase import create_client  # imported here so --dry-run needs no deps

        client = create_client(
            os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY")
        )

    print(f"Found {len(municipalities)} municipalities. Pushing to Supabase...")
    success_count = 0
    MISSING_COLS = (
        "morans_i_local", "lisa_cluster",
        "annual_peak_std", "danger_days_var", "p99_p50_gap",
        "vol_trend_slope", "vol_trend_p_value", "vol_trend_significant", "vol_trend_direction",
        "enso_heat_correlation",
    )
    drop_cols = None  # None = unknown, True = schema lacks mi/vol columns
    for city_data in municipalities:
        record = build_record(
            city_data, drivers, spatial, trends, backtest, forecast,
            population, spatial_meta, morans_i, volatility, enso,
        )
        # Convert NaN floats (Python and numpy) to None for JSON compliance.
        record = {
            k: (None if isinstance(v, numbers.Real) and pd.isna(v) else v)
            for k, v in record.items()
        }
        # If we already learned the schema lacks mi/vol columns, strip them.
        if drop_cols is True:
            record = {k: v for k, v in record.items() if k not in MISSING_COLS}
        try:
            if dry_run:
                print(
                    f"[dry-run] {record['name']}|{record['province']} "
                    f"slope={record['slope']} drivers={len(record['top_drivers'] or [])} "
                    f"spatial={bool(record['spatial_drivers'])} "
                    f"backtest_rmse={record['backtest_rmse']} "
                    f"forecast_2050={record['forecast_2050_central_c']} "
                    f"fdr_sig={record['significant_fdr']} "
                    f"bootstrap_sig={record['significant_bootstrap']} "
                    f"pop={record['population_2020']} "
                    f"exposed={record['exposed_flag']}"
                )
            else:
                client.table("municipality_trends").upsert(
                    record, on_conflict="name,province"
                ).execute()
                print(f"Uploaded {record['name']}")
            success_count += 1
        except Exception as error:  # one bad row must not abort the rest
            msg = str(error)
            if drop_cols is None and any(c in msg for c in MISSING_COLS):
                # Schema lacks mi/vol columns (migration not applied yet).
                # Retry this row without them, then strip for all remaining rows.
                record_no_mi = {k: v for k, v in record.items() if k not in MISSING_COLS}
                try:
                    client.table("municipality_trends").upsert(
                        record_no_mi, on_conflict="name,province"
                    ).execute()
                    drop_cols = True
                    print(f"Uploaded {record['name']} (no mi/vol columns in schema)")
                    success_count += 1
                except Exception as retry_error:
                    drop_cols = True
                    print(f"Failed to upload {record['name']}: {retry_error}")
                continue
            print(f"Failed to upload {record['name']}: {error}")

    print(f"\nSuccessfully pushed {success_count}/{len(municipalities)} municipalities!")


if __name__ == "__main__":
    main(dry_run="--dry-run" in sys.argv)
