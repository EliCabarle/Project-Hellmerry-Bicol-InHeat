"""Annual peak heat-index trends per municipality: Theil-Sen + Mann-Kendall.

Reads the CSV from `fetch_power_data.py`, averages the daily PEAK heat index
(T2M_MAX + dew-point-derived RH) per year, then runs the two tests CONCEPT §6c-2
names as "significant" (alpha = 0.05).

Non-significant trends are still written out: significance is a flag, not a filter
(CONCEPT §6c-7).

Note: the statistical math normally lives in `core/`, which is still empty and owned
by another agent. This module keeps a local copy so the pipeline is runnable; switch
to `core` imports once that engine lands.

Usage:
  python calculate_trends.py
  python calculate_trends.py --csv data/test.csv --out output/trends.json
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import pymannkendall as mk
from scipy.stats import theilslopes

API_DIR = Path(__file__).resolve().parent
IN_CSV = API_DIR / "data" / "power_daily.csv"
OUT_JSON = API_DIR / "output" / "trends.json"
ALPHA = 0.05
DANGER_C = 42.0  # PAGASA Danger band floor (CONCEPT §6c-4) - drives danger-day counts
CSV_COLUMNS = {"name", "province", "lat", "lon", "date", "heat_index_max_c"}


def annual_means(frame: pd.DataFrame) -> pd.DataFrame:
    """Daily rows -> per municipality-year: mean peak HI, sample size, danger days.

    `danger_days` counts days whose peak heat index reaches the Danger band, the
    exceedance the ranking screen sorts on. Count per year, not a rate: 365 vs 366
    days is not a meaningful difference.
    """
    frame = frame.copy()
    missing = CSV_COLUMNS - set(frame.columns)
    if missing:
        raise ValueError(f"CSV is missing columns: {sorted(missing)}")

    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    frame["heat_index_max_c"] = pd.to_numeric(
        frame["heat_index_max_c"], errors="coerce"
    )
    frame = frame.dropna(subset=["date", "heat_index_max_c", "name"])
    frame["year"] = frame["date"].dt.year

    return (
        frame.groupby(["name", "province", "lat", "lon", "year"], dropna=False)
        .agg(
            mean_heat_index_c=("heat_index_max_c", "mean"),
            n_days=("heat_index_max_c", "count"),
            danger_days=("heat_index_max_c", lambda s: int((s >= DANGER_C).sum())),
        )
        .reset_index()
    )


def trend_for(group: pd.DataFrame) -> dict:
    group = group.sort_values("year")
    years = group["year"].to_numpy(dtype=float)
    values = group["mean_heat_index_c"].to_numpy(dtype=float)
    first = group.iloc[0]

    row = {
        "name": first["name"],
        "province": first["province"],
        "lat": float(first["lat"]),
        "lon": float(first["lon"]),
        "slope_c_per_year": None,
        "slope_ci95": None,
        "p_value": None,
        "is_significant": False,
        "alpha": ALPHA,
        "trend_direction": "not tested",
        "sample": {"n_years": int(len(values)), "n_days": int(group["n_days"].sum())},
        "series": [
            {
                "year": int(r["year"]),
                "mean_heat_index_c": round(float(r["mean_heat_index_c"]), 3),
                "danger_days": int(r["danger_days"]),
                "n_days": int(r["n_days"]),
            }
            for _, r in group.iterrows()
        ],
    }

    if len(values) < 3:
        row["note"] = "fewer than 3 annual values - trend not computable"
        return row

    slope, _intercept, low_slope, high_slope = theilslopes(values, years, alpha=0.95)
    result = mk.original_test(values)

    row.update(
        slope_c_per_year=round(float(slope), 6),
        slope_ci95=[round(float(low_slope), 6), round(float(high_slope), 6)],
        p_value=float(result.p),
        is_significant=bool(result.p < ALPHA),
        trend_direction=str(result.trend),
    )
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(IN_CSV))
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    frame = pd.read_csv(args.csv)
    annual = annual_means(frame)

    rows = [trend_for(group) for _, group in annual.groupby("name", sort=False)]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": "Bicol In-Heat",
        "variable": "annual mean daily peak heat index (Rothfusz, POWER T2M_MAX + RH derived from T2MDEW)",
        "units": "degrees Celsius",
        "method": "Theil-Sen slope + Mann-Kendall original_test",
        "alpha": ALPHA,
        "danger_threshold_c": DANGER_C,
        "source_csv": Path(args.csv).name,
        "period": {
            "start": frame["date"].min(),
            "end": frame["date"].max(),
        },
        "municipalities": rows,
    }

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    for row in rows:
        slope = "-" if row["slope_c_per_year"] is None else f"{row['slope_c_per_year']:+.4f}"
        p = "-" if row["p_value"] is None else f"{row['p_value']:.4f}"
        flag = "significant" if row["is_significant"] else "not significant"
        last = row["series"][-1]
        print(
            f"{row['name']:<10} {slope:>9} degC/yr  p={p:<8} {flag}"
            f"  n={row['sample']['n_years']}y/{row['sample']['n_days']}d"
            f"  danger_days({last['year']})={last['danger_days']}"
        )
    print(f"wrote {len(rows)} municipalities -> {out}")


if __name__ == "__main__":
    main()
