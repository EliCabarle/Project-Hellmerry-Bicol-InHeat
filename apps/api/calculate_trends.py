"""Annual peak heat-index trends per municipality: Theil-Sen + Modified Mann-Kendall.

Reads the CSV from `fetch_power_data.py`, averages the daily PEAK heat index
(T2M_MAX + dew-point-derived RH) per year, then runs the tests CONCEPT §6c-2
names as "significant" (alpha = 0.05): Theil-Sen slope with a 95% confidence
interval, the Hamed-Rao Modified Mann-Kendall test (which corrects the variance
for autocorrelation, so a serially correlated series is not called significant
for free), and the Pettitt test for the year the regime shifted.

Each series point also carries the annual mean nighttime heat index (Rothfusz on
T2M_MIN, same dew-point RH), so the overnight recovery the peak hides stays visible
without changing the trend that is tested.

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

import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy.stats import theilslopes

API_DIR = Path(__file__).resolve().parent
IN_CSV = API_DIR / "data" / "power_daily_full.csv"
OUT_JSON = API_DIR / "output" / "trends.json"
ALPHA = 0.05
DANGER_C = 42.0  # PAGASA Danger band floor (CONCEPT §6c-4) - drives danger-day counts
CSV_COLUMNS = {
    "name",
    "province",
    "lat",
    "lon",
    "date",
    "heat_index_max_c",
    "nighttime_heat_index_c",
}


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
    frame["nighttime_heat_index_c"] = pd.to_numeric(
        frame["nighttime_heat_index_c"], errors="coerce"
    )
    # dropna is on the peak only: a missing T2M_MIN must not delete a valid day
    frame = frame.dropna(subset=["date", "heat_index_max_c", "name"])
    frame["year"] = frame["date"].dt.year

    return (
        frame.groupby(["name", "province", "lat", "lon", "year"], dropna=False)
        .agg(
            mean_heat_index_c=("heat_index_max_c", "mean"),
            mean_nighttime_heat_index_c=("nighttime_heat_index_c", "mean"),
            n_days=("heat_index_max_c", "count"),
            danger_days=("heat_index_max_c", lambda s: int((s >= DANGER_C).sum())),
        )
        .reset_index()
    )


def pettitt_change_point(
    values: np.ndarray, years: np.ndarray
) -> tuple[int | None, float | None]:
    """Pettitt (1979) single change-point test -> (first year of new regime, p).

    U(t) sums the signs of all earlier-vs-later pairs; its absolute maximum marks
    the split. `pymannkendall` 1.4.3 ships no `pettitt_test`, so the ~10 lines of
    the statistic live here rather than pulling in another package.

    Caveat: a smooth monotone trend also minimises p with the split near the middle,
    so read `change_point_year` as "strongest step/level change", not proof of a
    regime switch.
    """
    n = len(values)
    if n < 3:
        return None, None
    sign = np.sign(values[:, None] - values[None, :])
    u = np.abs([sign[: t + 1, t + 1 :].sum() for t in range(n - 1)])
    # split after index t; +1 reports the year the series actually steps up/down
    year = int(years[int(np.argmax(u)) + 1])
    p = min(1.0, 2.0 * float(np.exp(-6.0 * u.max() ** 2 / (n**3 + n**2))))
    return year, p


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
        "slope": None,
        "slope_ci_low": None,
        "slope_ci_high": None,
        "p_value": None,
        "change_point_year": None,
        "change_point_p": None,
        "is_significant": False,
        "alpha": ALPHA,
        "trend_direction": "not tested",
        # same numbers under the names the PWA/narrative builder and the
        # Supabase `slope` column already read - dropping them breaks both
        "slope_c_per_year": None,
        "slope_ci95": None,
        "sample": {"n_years": int(len(values)), "n_days": int(group["n_days"].sum())},
        "series": [
            {
                "year": int(r["year"]),
                "mean_heat_index_c": round(float(r["mean_heat_index_c"]), 3),
                # NaN never reaches JSON: an all-missing year stays null
                "mean_nighttime_heat_index_c": (
                    None
                    if pd.isna(r["mean_nighttime_heat_index_c"])
                    else round(float(r["mean_nighttime_heat_index_c"]), 3)
                ),
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
    # Hamed-Rao variance correction: iid assumption understates p on autocorrelated series
    result = mk.hamed_rao_modification_test(values, alpha=ALPHA)
    change_year, change_p = pettitt_change_point(values, years)

    row.update(
        slope=round(float(slope), 6),
        slope_ci_low=round(float(low_slope), 6),
        slope_ci_high=round(float(high_slope), 6),
        p_value=float(result.p),
        change_point_year=change_year,
        change_point_p=None if change_p is None else round(change_p, 6),
        is_significant=bool(result.p < ALPHA),
        trend_direction=str(result.trend),
        slope_c_per_year=round(float(slope), 6),
        slope_ci95=[round(float(low_slope), 6), round(float(high_slope), 6)],
    )
    return row


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(IN_CSV))
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    # encoding is load-bearing: the CSV holds 'Sagñay' as UTF-8, and without this
    # Windows cp1252 reads it back as 'SagÃ±ay'.
    frame = pd.read_csv(args.csv, encoding="utf-8")
    annual = annual_means(frame)

    # Group by (name, province): 'Bato' and 'San Fernando' each exist in two
    # Region V provinces. Bare-name grouping silently merges them -> 112 of 114.
    rows = [
        trend_for(group)
        for _, group in annual.groupby(["name", "province"], sort=False)
    ]

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": "Bicol In-Heat",
        "variable": (
            "annual mean daily peak heat index (Rothfusz, POWER T2M_MAX + RH derived "
            "from T2MDEW), with annual mean nighttime heat index (Rothfusz, T2M_MIN)"
        ),
        "units": "degrees Celsius",
        "method": (
            "Theil-Sen slope (95% CI) + Hamed-Rao Modified Mann-Kendall + "
            "Pettitt change-point test"
        ),
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
    # compact on purpose: narratives.json ships to the PWA, indentation is dead weight
    out.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    for row in rows:
        # province in the label: two 'Bato's and two 'San Fernando's exist
        label = f"{row['name']}, {row['province']}"
        if row["slope"] is None:
            print(f"[{label}] trend not computable - {row['note']}")
            continue
        print(
            f"[{label}] slope={row['slope']:+.3f} "
            f"(95% CI: {row['slope_ci_low']:+.3f} to {row['slope_ci_high']:+.3f})"
            f" | Change Point: {row['change_point_year']}"
            f" (p={row['change_point_p']:.3f})"
            f"  mk_p={row['p_value']:.3g}"
            f" {'significant' if row['is_significant'] else 'not significant'}"
            f"  n={row['sample']['n_years']}y/{row['sample']['n_days']}d"
            f"  danger_days({row['series'][-1]['year']})="
            f"{row['series'][-1]['danger_days']}"
        )
    print(f"wrote {len(rows)} municipalities -> {out}")


if __name__ == "__main__":
    main()
