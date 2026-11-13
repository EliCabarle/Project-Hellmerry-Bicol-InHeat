"""Volatility Engine: prove climate instability is growing faster than average warming.

For each of the 114 municipalities, computes:
- annual_peak_std: std of yearly max heat index (1981-2025)
- danger_days_var: variance of annual count of 42°C+ days
- p99_p50_gap: 99th pct of daily heat minus 50th pct
- rolling_5yr_vol: 5-year rolling std of annual peak heat (time series)
- vol_trend: Theil-Sen slope + p-value on the rolling_5yr_vol series

Output: output/volatility_analysis.json

Usage:
  python volatility_analysis.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import theilslopes
import pymannkendall as mk


def benjamini_hochberg(p_values: list) -> list:
    """FDR-adjusted q-values (Benjamini-Hochberg), same length/order as input."""
    p = np.asarray(p_values, dtype=float)
    n = len(p)
    order = np.argsort(p)
    ranked = p[order]
    q = ranked * n / (np.arange(n) + 1)
    q = np.minimum.accumulate(q[::-1])[::-1]
    q = np.clip(q, 0.0, 1.0)
    out = np.empty(n, dtype=float)
    out[order] = q
    return out.tolist()

API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
OUT_JSON = API_DIR / "output" / "volatility_analysis.json"
DANGER_THRESHOLD = 42.0


def main() -> None:
    print("Loading POWER daily data...")
    df = pd.read_csv(POWER_CSV, low_memory=False)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.dropna(subset=["date", "heat_index_max_c", "name", "province"])
    df["year"] = df["date"].dt.year
    print(f"  {len(df):,} daily rows, {df['name'].nunique()} municipalities")

    # Annual max heat per municipality-year
    annual_peak = (
        df.groupby(["name", "province", "year"])["heat_index_max_c"]
        .max()
        .reset_index()
        .rename(columns={"heat_index_max_c": "annual_peak_heat"})
    )

    # Annual danger day count per municipality-year
    df["is_danger"] = df["heat_index_max_c"] >= DANGER_THRESHOLD
    annual_danger = (
        df.groupby(["name", "province", "year"])["is_danger"]
        .sum()
        .reset_index()
        .rename(columns={"is_danger": "danger_days"})
    )

    # p99_p50_gap per municipality (all daily values)
    pct_gap = (
        df.groupby(["name", "province"])["heat_index_max_c"]
        .agg(lambda s: float(np.percentile(s, 99) - np.percentile(s, 50)))
        .reset_index()
        .rename(columns={"heat_index_max_c": "p99_p50_gap"})
    )

    results = []
    munis = sorted(df.groupby(["name", "province"]).groups.keys())
    print(f"Processing {len(munis)} municipalities...")

    for name, province in munis:
        m_peak = annual_peak[
            (annual_peak["name"] == name) & (annual_peak["province"] == province)
        ].sort_values("year")
        m_danger = annual_danger[
            (annual_danger["name"] == name) & (annual_danger["province"] == province)
        ].sort_values("year")

        years = m_peak["year"].to_numpy(dtype=float)
        peaks = m_peak["annual_peak_heat"].to_numpy(dtype=float)
        danger_counts = m_danger["danger_days"].to_numpy(dtype=float)

        # annual_peak_std
        annual_peak_std = float(np.std(peaks, ddof=1)) if len(peaks) > 1 else 0.0

        # danger_days_var
        danger_days_var = float(np.var(danger_counts, ddof=1)) if len(danger_counts) > 1 else 0.0

        # p99_p50_gap
        gap_row = pct_gap[
            (pct_gap["name"] == name) & (pct_gap["province"] == province)
        ]
        p99_p50_gap = float(gap_row["p99_p50_gap"].iloc[0]) if len(gap_row) else 0.0

        # rolling_5yr_vol: 5-year rolling std of annual peak heat
        if len(peaks) >= 5:
            roll = pd.Series(peaks).rolling(window=5, min_periods=5).std()
            valid = ~roll.isna()
            rolling_years = years[valid.to_numpy()]
            rolling_std = roll[valid].to_numpy()
            vol_series = [
                {"year": int(rolling_years[i]), "vol": float(rolling_std[i])}
                for i in range(len(rolling_std))
            ]
        else:
            vol_series = []

        # Theil-Sen trend on rolling_5yr_vol series
        if len(vol_series) >= 3:
            vol_years = np.array([v["year"] for v in vol_series], dtype=float)
            vol_values = np.array([v["vol"] for v in vol_series], dtype=float)
            slope, _intercept, low, high = theilslopes(vol_values, vol_years, alpha=0.95)
            mk_result = mk.hamed_rao_modification_test(vol_values, alpha=0.05)
            vol_trend_slope = float(slope)
            vol_trend_p = float(mk_result.p)
            vol_trend_significant = bool(mk_result.p < 0.05)
            vol_trend_direction = str(mk_result.trend)
        else:
            vol_trend_slope = None
            vol_trend_p = None
            vol_trend_significant = None
            vol_trend_direction = "not tested"

        results.append(
            {
                "name": name,
                "province": province,
                "annual_peak_std": round(annual_peak_std, 4),
                "danger_days_var": round(danger_days_var, 4),
                "p99_p50_gap": round(p99_p50_gap, 4),
                "rolling_5yr_vol_series": vol_series,
                "vol_trend": {
                    "slope": round(vol_trend_slope, 6) if vol_trend_slope is not None else None,
                    "p_value": round(vol_trend_p, 6) if vol_trend_p is not None else None,
                    "significant": vol_trend_significant,
                    "direction": vol_trend_direction,
                },
                "n_years": int(len(peaks)),
            }
        )

    # Apply Benjamini-Hochberg FDR correction across all 114 vol_trend p-values
    p_values = [
        r["vol_trend"]["p_value"]
        for r in results
        if r["vol_trend"]["p_value"] is not None
    ]
    q_values = benjamini_hochberg(p_values) if p_values else []
    q_iter = iter(q_values)
    for r in results:
        if r["vol_trend"]["p_value"] is not None:
            q = next(q_iter)
            r["vol_trend"]["fdr_q"] = round(float(q), 6)
            r["vol_trend"]["significant_fdr"] = bool(q < 0.05)
        else:
            r["vol_trend"]["fdr_q"] = None
            r["vol_trend"]["significant_fdr"] = None

    # Summary stats: raw significance and FDR-corrected significance
    sig_vol_raw = [r for r in results if r["vol_trend"]["significant"] is True]
    sig_vol_fdr = [r for r in results if r["vol_trend"]["significant_fdr"] is True]
    pos_vol = [r for r in results if r["vol_trend"]["direction"] == "increasing"]
    neg_vol = [r for r in results if r["vol_trend"]["direction"] == "decreasing"]

    payload = {
        "project": "Bicol In-Heat",
        "module": "volatility_analysis",
        "method": (
            "annual_peak_std: std of yearly max heat index; "
            "danger_days_var: variance of annual 42°C+ day count; "
            "p99_p50_gap: 99th-50th percentile daily heat gap; "
            "rolling_5yr_vol: 5-yr rolling std of annual peak heat; "
            "vol_trend: Theil-Sen + Hamed-Rao MK on rolling_5yr_vol series; "
            "fdr_q: Benjamini-Hochberg FDR q-value across all municipalities"
        ),
        "n_municipalities": len(results),
        "volatility_trend_summary": {
            "significant_increasing_raw": len(sig_vol_raw),
            "significant_increasing_fdr": len(sig_vol_fdr),
            "increasing": len(pos_vol),
            "decreasing": len(neg_vol),
            "share_significant_raw": round(len(sig_vol_raw) / len(results), 4),
            "share_significant_fdr": round(len(sig_vol_fdr) / len(results), 4),
        },
        "municipalities": results,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON} ({len(results)} municipalities)")
    print(f"Volatility increasing: {len(pos_vol)} | significant raw: {len(sig_vol_raw)} | significant FDR: {len(sig_vol_fdr)}")

    # Print Naga line as specified
    naga = next((r for r in results if r["name"] == "City of Naga" and r["province"] == "Camarines Sur"), None)
    if naga:
        vt = naga["vol_trend"]
        print(
            f'VOLATILITY DONE | Naga: peak_std={naga["annual_peak_std"]}, '
            f"vol_trend={vt['slope']:+.3f} (p={vt['p_value']}), "
            f"danger_var={naga['danger_days_var']}"
        )
    else:
        # Try "Naga" without "City of" prefix
        naga = next((r for r in results if r["name"] == "Naga"), None)
        if naga:
            vt = naga["vol_trend"]
            print(
                f'VOLATILITY DONE | Naga: peak_std={naga["annual_peak_std"]}, '
                f"vol_trend={vt['slope']:+.3f} (p={vt['p_value']}), "
                f"danger_var={naga['danger_days_var']}"
            )


if __name__ == "__main__":
    main()
