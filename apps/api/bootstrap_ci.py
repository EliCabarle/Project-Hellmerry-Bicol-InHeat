"""Block-bootstrap confidence intervals for Theil-Sen trend slopes.

Loads output/trends.json and data/power_daily_full.csv. For each municipality,
reconstructs the 45-year annual mean heat index series, then block-bootstraps
(block size = 5 years, 1000 iterations) to compute a bias-corrected 95% CI on
the Theil-Sen slope. Flags significant_bootstrap = True if 0 is not in the CI.

Updates output/trends.json and output/narratives.json with:
  - slope_ci_bootstrap_low
  - slope_ci_bootstrap_high
  - significant_bootstrap (bool)

Usage:
  python bootstrap_ci.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import theilslopes

API_DIR = Path(__file__).resolve().parent
TRENDS_JSON = API_DIR / "output" / "trends.json"
NARRATIVES_JSON = API_DIR / "output" / "narratives.json"
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"

BLOCK_SIZE = 5
N_BOOTSTRAP = 1000
RANDOM_STATE = 42
ALPHA = 0.05


def load_annual_series() -> dict:
    """Reconstruct per-municipality annual mean heat index series from daily CSV."""
    df = pd.read_csv(POWER_CSV, encoding="utf-8")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["year"] = df["date"].dt.year
    df = df.dropna(subset=["heat_index_max_c", "year", "name", "province"])

    annual = (
        df.groupby(["name", "province", "year"], sort=False)
        .agg(mean_heat_index_c=("heat_index_max_c", "mean"))
        .reset_index()
    )

    series = {}
    for (name, province), group in annual.groupby(["name", "province"], sort=False):
        group = group.sort_values("year")
        series[(name, province)] = {
            "years": group["year"].to_numpy(dtype=float),
            "values": group["mean_heat_index_c"].to_numpy(dtype=float),
        }
    return series


def block_bootstrap_ci(years: np.ndarray, values: np.ndarray) -> dict:
    """Block-bootstrap BCa-style 95% CI on Theil-Sen slope.

    Resamples blocks of BLOCK_SIZE consecutive years with replacement,
    recomputes Theil-Sen slope for each bootstrap replicate, and returns the
    percentile 95% CI plus a significance flag.
    """
    n_years = len(values)
    n_blocks = int(np.ceil(n_years / BLOCK_SIZE))
    rng = np.random.default_rng(RANDOM_STATE)

    # Original Theil-Sen slope
    orig_slope, _, _, _ = theilslopes(values, years, alpha=0.95)
    orig_slope = float(orig_slope)

    # Block-bootstrap replicates
    slopes = []
    for _ in range(N_BOOTSTRAP):
        # Sample n_blocks blocks with replacement
        block_starts = rng.integers(0, max(1, n_years - BLOCK_SIZE + 1), size=n_blocks)
        boot_idx = []
        for bs in block_starts:
            end = min(bs + BLOCK_SIZE, n_years)
            boot_idx.extend(range(bs, end))
        boot_idx = boot_idx[:n_years]  # truncate to n_years
        boot_years = years[boot_idx]
        boot_values = values[boot_idx]
        if len(boot_years) < 2 or np.std(boot_years) == 0:
            slopes.append(np.nan)
            continue
        b_slope, _, _, _ = theilslopes(boot_values, boot_years, alpha=0.95)
        slopes.append(float(b_slope))

    slopes = np.array(slopes)
    valid = ~np.isnan(slopes)
    slopes_valid = slopes[valid]

    if len(slopes_valid) < 10:
        return {
            "slope_ci_bootstrap_low": None,
            "slope_ci_bootstrap_high": None,
            "significant_bootstrap": None,
            "orig_slope": orig_slope,
            "n_valid": int(valid.sum()),
        }

    # Percentile 95% CI
    ci_low = float(np.percentile(slopes_valid, 2.5))
    ci_high = float(np.percentile(slopes_valid, 97.5))
    significant = bool((ci_low > 0) or (ci_high < 0))

    return {
        "slope_ci_bootstrap_low": round(ci_low, 6),
        "slope_ci_bootstrap_high": round(ci_high, 6),
        "significant_bootstrap": significant,
        "orig_slope": round(orig_slope, 6),
        "n_valid": int(valid.sum()),
    }


def main() -> None:
    # Load trends.json
    with open(TRENDS_JSON, encoding="utf-8") as f:
        trends = json.load(f)
    muni_trends = trends["municipalities"]
    n_total = len(muni_trends)

    # Reconstruct annual series from daily CSV
    series = load_annual_series()
    original_significant = sum(1 for r in muni_trends if r.get("is_significant") is True)

    # Bootstrap each municipality
    bootstrap_significant = 0
    lost_significance = []
    results = {}

    for row in muni_trends:
        name = row["name"]
        province = row["province"]
        key = (name, province)

        if key not in series:
            row["slope_ci_bootstrap_low"] = None
            row["slope_ci_bootstrap_high"] = None
            row["significant_bootstrap"] = None
            results[key] = None
            continue

        s = series[key]
        if len(s["values"]) < 10:
            row["slope_ci_bootstrap_low"] = None
            row["slope_ci_bootstrap_high"] = None
            row["significant_bootstrap"] = None
            results[key] = None
            continue

        ci = block_bootstrap_ci(s["years"], s["values"])
        results[key] = ci
        row["slope_ci_bootstrap_low"] = ci["slope_ci_bootstrap_low"]
        row["slope_ci_bootstrap_high"] = ci["slope_ci_bootstrap_high"]
        row["significant_bootstrap"] = ci["significant_bootstrap"]

        if ci["significant_bootstrap"] is True:
            bootstrap_significant += 1
        if row.get("is_significant") is True and ci["significant_bootstrap"] is False:
            lost_significance.append(
                {"name": name, "province": province, "slope": row.get("slope_c_per_year")}
            )

    # Write trends.json
    Path(TRENDS_JSON).write_text(
        json.dumps(trends, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # Update narratives.json
    with open(NARRATIVES_JSON, encoding="utf-8") as f:
        narratives = json.load(f)
    n_index = {(r["name"], r["province"]): r for r in narratives["municipalities"]}
    for row in muni_trends:
        key = (row["name"], row["province"])
        if key in n_index:
            nrow = n_index[key]
            nrow.setdefault("trend", {})
            nrow["trend"]["slope_ci_bootstrap_low"] = row.get("slope_ci_bootstrap_low")
            nrow["trend"]["slope_ci_bootstrap_high"] = row.get(
                "slope_ci_bootstrap_high"
            )
            nrow["trend"]["significant_bootstrap"] = row.get(
                "significant_bootstrap"
            )
    Path(NARRATIVES_JSON).write_text(
        json.dumps(narratives, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    print(
        f"BOOTSTRAP DONE | Original: {original_significant}/{n_total} significant | "
        f"After bootstrap: {bootstrap_significant}/{n_total} significant"
    )
    print(f"Lost significance after bootstrap: {len(lost_significance)}")
    for item in lost_significance[:10]:
        print(f"  {item['name']} ({item['province']}): slope={item['slope']}")


if __name__ == "__main__":
    main()
