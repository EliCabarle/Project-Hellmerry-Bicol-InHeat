"""Correlate NOAA ONI with Bicol heat volatility and mean temperature.

Analysis A: Pearson correlation between annual ONI anomaly and annual mean
heat index across all 114 municipalities (1981-2025).
Analysis B: Pearson correlation between annual ONI anomaly and annual
heat-index volatility (std of daily heat index within each year).

Outputs output/enso_results.json.

Usage:
  python enso_correlation.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import pearsonr, linregress

API_DIR = Path(__file__).resolve().parent
ONI_CSV = API_DIR / "data" / "oni_annual.csv"
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
OUT_JSON = API_DIR / "output" / "enso_results.json"
# Committed copy: output/ is gitignored, so a deploy reads this one instead.
SNAPSHOT_JSON = API_DIR / "snapshots" / "enso_results.json"

TARGET = "heat_index_max_c"
START_YEAR = 1981
END_YEAR = 2025


def load_oni() -> pd.DataFrame:
    df = pd.read_csv(ONI_CSV)
    df = df[(df["year"] >= START_YEAR) & (df["year"] <= END_YEAR)]
    return df[["year", "oni_anomaly"]]


def load_annual_heat() -> pd.DataFrame:
    """Annual mean heat index and annual volatility per year (all municipalities)."""
    df = pd.read_csv(POWER_CSV, low_memory=False)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", TARGET])
    df["year"] = df["date"].dt.year
    df = df[(df["year"] >= START_YEAR) & (df["year"] <= END_YEAR)]

    # Annual mean heat index per municipality-year (114 values per year)
    annual_means_per_muni = (
        df.groupby(["year", "name"])[TARGET]
        .mean()
        .reset_index()
    )

    # Annual mean heat index across all municipalities (for Analysis A)
    annual_mean = (
        annual_means_per_muni.groupby("year")[TARGET]
        .mean()
        .reset_index()
        .rename(columns={TARGET: "annual_mean_heat"})
    )

    # Annual volatility: std of annual means across municipalities per year.
    # This removes within-year seasonality and captures interannual variability
    # across the 114 municipalities.
    annual_vol = (
        annual_means_per_muni.groupby("year")[TARGET]
        .std(ddof=1)
        .reset_index()
        .rename(columns={TARGET: "annual_volatility"})
    )

    return annual_mean.merge(annual_vol, on="year")


def main() -> None:
    oni = load_oni()
    heat = load_annual_heat()

    merged = oni.merge(heat, on="year")
    print(f"Merged ONI + heat data: {len(merged)} years ({merged['year'].min()}-{merged['year'].max()})")

    # Analysis A: ONI vs annual mean heat
    r_mean, p_mean = pearsonr(merged["oni_anomaly"], merged["annual_mean_heat"])
    reg_mean = linregress(merged["oni_anomaly"], merged["annual_mean_heat"])
    r2_mean = reg_mean.rvalue ** 2

    # Analysis B: ONI vs annual volatility
    r_vol, p_vol = pearsonr(merged["oni_anomaly"], merged["annual_volatility"])
    reg_vol = linregress(merged["oni_anomaly"], merged["annual_volatility"])
    r2_vol = reg_vol.rvalue ** 2

    interpretation = (
        "Positive ONI (El Niño) correlates with higher Bicol mean heat and volatility."
        if r_mean > 0 and r_vol > 0 else
        "Negative ONI (La Niña) correlates with higher Bicol mean heat and volatility."
        if r_mean < 0 and r_vol < 0 else
        "Mixed relationship: ONI correlates differently with mean heat vs volatility."
    )

    payload = {
        "project": "Bicol In-Heat",
        "module": "enso_correlation",
        "oni_source": "NOAA CPC Oceanic Niño Index (oni.ascii.txt)",
        "oni_url": "https://www.cpc.ncep.noaa.gov/data/indices/oni.ascii.txt",
        "n_years": int(len(merged)),
        "year_range": [int(merged["year"].min()), int(merged["year"].max())],
        "analysis_a_mean_heat": {
            "pearson_r": round(float(r_mean), 6),
            "p_value": round(float(p_mean), 6),
            "r_squared": round(float(r2_mean), 6),
            "slope": round(float(reg_mean.slope), 6),
            "intercept": round(float(reg_mean.intercept), 6),
            "significant": bool(p_mean < 0.05),
        },
        "analysis_b_volatility": {
            "pearson_r": round(float(r_vol), 6),
            "p_value": round(float(p_vol), 6),
            "r_squared": round(float(r2_vol), 6),
            "slope": round(float(reg_vol.slope), 6),
            "intercept": round(float(reg_vol.intercept), 6),
            "significant": bool(p_vol < 0.05),
        },
        "regression_formula": (
            f"annual_mean_heat = {reg_mean.slope:.4f} * ONI + {reg_mean.intercept:.4f}"
        ),
        "interpretation": interpretation,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_JSON}")
    SNAPSHOT_JSON.parent.mkdir(parents=True, exist_ok=True)
    SNAPSHOT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Wrote {SNAPSHOT_JSON}")
    print(
        f'ENSO CORRELATION DONE | Mean Heat r={r_mean:.4f} (p={p_mean:.4f}) | '
        f'Volatility r={r_vol:.4f} (p={p_vol:.4f})'
    )


if __name__ == "__main__":
    main()
