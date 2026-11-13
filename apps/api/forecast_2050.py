"""Forecast peak heat index to 2030, 2040, 2050 per municipality.

Loads output/trends.json (slope + CI per municipality) and output/narratives.json
(latest heat index per municipality), then linearly projects:

  central = latest_heat + slope * (target_year - 2025)
  low     = latest_heat + slope_ci_low * (target_year - 2025)
  high    = latest_heat + slope_ci_high * (target_year - 2025)

Also linearly extrapolates danger_days per year to 2050.

Outputs output/forecast_2050.json.

Usage:
  python forecast_2050.py
  python forecast_2050.py --out output/forecast_2050.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

API_DIR = Path(__file__).resolve().parent
TRENDS_JSON = API_DIR / "output" / "trends.json"
NARRATIVES_JSON = API_DIR / "output" / "narratives.json"
OUT_JSON = API_DIR / "output" / "forecast_2050.json"

BASE_YEAR = 2025
TARGET_YEARS = [2030, 2040, 2050]


def load_trends() -> dict:
    with open(TRENDS_JSON, encoding="utf-8") as f:
        payload = json.load(f)
    return {row["name"] + "||" + row["province"]: row for row in payload["municipalities"]}


def load_narratives() -> dict:
    with open(NARRATIVES_JSON, encoding="utf-8") as f:
        payload = json.load(f)
    return {row["name"] + "||" + row["province"]: row for row in payload["municipalities"]}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    trends = load_trends()
    narratives = load_narratives()

    results = []
    for key, trend in trends.items():
        name = trend["name"]
        province = trend["province"]
        narrative = narratives.get(key, {})
        latest = narrative.get("latest", {})
        latest_heat = latest.get("mean_heat_index_c")

        slope = trend.get("slope_c_per_year")
        slope_ci_low = trend.get("slope_ci_low")
        slope_ci_high = trend.get("slope_ci_high")
        if latest_heat is None or slope is None:
            continue

        row = {"name": name, "province": province}
        for year in TARGET_YEARS:
            delta = year - BASE_YEAR
            row[f"{year}_central_c"] = round(latest_heat + slope * delta, 2)
            row[f"{year}_low_c"] = round(latest_heat + slope_ci_low * delta, 2) if slope_ci_low is not None else None
            row[f"{year}_high_c"] = round(latest_heat + slope_ci_high * delta, 2) if slope_ci_high is not None else None

        # Project danger days per year for 2050 via linear extrapolation of the
        # annual danger_days trend (least-squares slope over the full record).
        series = trend.get("series", [])
        years = [s["year"] for s in series]
        danger = [s.get("danger_days", 0) for s in series]
        if len(years) >= 2:
            danger_slope = float(np_polyfit(years, danger)[0])
            row["projected_danger_days_2050"] = int(round(danger[-1] + danger_slope * (2050 - years[-1])))
        else:
            row["projected_danger_days_2050"] = None

        results.append(row)

    results.sort(key=lambda r: r["2050_central_c"], reverse=True)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(results, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {out} ({len(results)} municipalities)")

    print("\nTop 5 fastest-warming municipalities (2050 projected peak heat index):")
    print(f"{'#':<3} {'Municipality':<24} {'Province':<16} {'2050 central':>12} {'CI low':>8} {'CI high':>8}")
    for i, r in enumerate(results[:5], start=1):
        print(
            f"{i:<3} {r['name']:<24} {r['province']:<16} "
            f"{r['2050_central_c']:>12} {r['2050_low_c']:>8} {r['2050_high_c']:>8}"
        )


def np_polyfit(x, y):
    import numpy as np

    return np.polyfit(np.asarray(x, dtype=float), np.asarray(y, dtype=float), 1)


if __name__ == "__main__":
    main()
