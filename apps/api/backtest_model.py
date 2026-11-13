"""Backtest the Random Forest heat-index model across two train/test splits.

Loads data/power_daily_full.csv, computes annual mean heat index per
municipality, trains a RandomForestRegressor on two historical splits, and
evaluates RMSE / MAE / direction accuracy / 2024 spike accuracy on the held-out
test years.

Outputs output/backtest_results.json.

Usage:
  python backtest_model.py
  python backtest_model.py --out output/backtest_results.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
OUT_JSON = API_DIR / "output" / "backtest_results.json"

FEATURES = [
    "u10m_ms",
    "v10m_ms",
    "lat",
    "lon",
    "elevation_m",
    "distance_to_coast_km",
    "ndvi_mean",
    "year",
]
TARGET = "heat_index_max_c"
N_ESTIMATORS = 200
RANDOM_STATE = 42

SPLITS = {
    "split_short": {"train_start": 1981, "train_end": 2019, "test_start": 2020, "test_end": 2025},
    "split_long": {"train_start": 1981, "train_end": 2010, "test_start": 2011, "test_end": 2025},
}


def load_annual() -> pd.DataFrame:
    """Daily CSV -> annual mean heat index + features per municipality-year."""
    df = pd.read_csv(POWER_CSV, encoding="utf-8")
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df["year"] = df["date"].dt.year
    df = df.dropna(subset=[TARGET, "year", "name", "province"])

    geo = pd.read_csv(GEO_CSV, encoding="utf-8")

    annual = (
        df.groupby(["name", "province", "year"], sort=False)
        .agg(
            heat_index_max_c=(TARGET, "mean"),
            u10m_ms=("u10m_ms", "mean"),
            v10m_ms=("v10m_ms", "mean"),
            lat=("lat", "first"),
            lon=("lon", "first"),
        )
        .reset_index()
    )
    annual = annual.merge(geo, on=["name", "province"], how="left")
    for col in ["elevation_m", "distance_to_coast_km", "ndvi_mean"]:
        annual[col] = annual[col].fillna(annual[col].median())
    annual = annual.dropna(subset=[TARGET] + FEATURES)
    return annual


def trend_sign(years: np.ndarray, values: np.ndarray) -> int:
    """Sign of the linear-regression slope (1 up, -1 down, 0 flat/insufficient)."""
    if len(years) < 2:
        return 0
    slope = float(np.polyfit(years.astype(float), values.astype(float), 1)[0])
    if slope > 0:
        return 1
    if slope < 0:
        return -1
    return 0


def run_split(annual: pd.DataFrame, split: dict) -> dict:
    train_start = split["train_start"]
    train_end = split["train_end"]
    test_start = split["test_start"]
    test_end = split["test_end"]

    train = annual[(annual["year"] >= train_start) & (annual["year"] <= train_end)].copy()
    test = annual[(annual["year"] >= test_start) & (annual["year"] <= test_end)].copy()

    X_train = train[FEATURES]
    y_train = train[TARGET]
    X_test = test[FEATURES]
    y_test = test[TARGET]

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1
    )
    model.fit(X_train, y_train)

    test = test.copy()
    test["predicted"] = model.predict(X_test)

    per_municipality = []
    for (name, province), group in test.groupby(["name", "province"], sort=False):
        actual = group[TARGET].to_numpy(dtype=float)
        pred = group["predicted"].to_numpy(dtype=float)
        years = group["year"].to_numpy()
        rmse = float(np.sqrt(np.mean((pred - actual) ** 2)))
        mae = float(np.mean(np.abs(pred - actual)))
        actual_sign = trend_sign(years, actual)
        pred_sign = trend_sign(years, pred)
        row2024 = group[group["year"] == 2024]
        pred_2024 = float(row2024["predicted"].iloc[0]) if len(row2024) else None
        actual_2024 = float(row2024[TARGET].iloc[0]) if len(row2024) else None
        per_municipality.append(
            {
                "name": name,
                "province": province,
                "rmse": round(rmse, 4),
                "mae": round(mae, 4),
                "actual_sign": actual_sign,
                "pred_sign": pred_sign,
                "2024_predicted": pred_2024,
                "2024_actual": actual_2024,
            }
        )

    rmse_mean = float(np.mean([r["rmse"] for r in per_municipality]))
    mae_mean = float(np.mean([r["mae"] for r in per_municipality]))
    dir_pairs = [r for r in per_municipality if r["actual_sign"] != 0 and r["pred_sign"] != 0]
    n_match = sum(1 for r in dir_pairs if r["actual_sign"] == r["pred_sign"])
    direction_accuracy = (n_match / len(dir_pairs) * 100) if dir_pairs else 0.0
    spike_rows = [
        r
        for r in per_municipality
        if r["2024_predicted"] is not None and r["2024_actual"] is not None
    ]
    spike_matched = sum(
        1 for r in spike_rows if abs(r["2024_predicted"] - r["2024_actual"]) <= 1.0
    )

    return {
        "rmse_mean": round(rmse_mean, 4),
        "mae_mean": round(mae_mean, 4),
        "direction_accuracy_pct": round(direction_accuracy, 2),
        "spike_2024_matched": int(spike_matched),
        "per_municipality": per_municipality,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    annual = load_annual()
    print(f"Annual dataset: {len(annual)} municipality-years, {annual['name'].nunique()} municipalities")

    results = {}
    for split_name, split in SPLITS.items():
        print(f"Running {split_name}: train {split['train_start']}-{split['train_end']}, test {split['test_start']}-{split['test_end']} ...")
        results[split_name] = run_split(annual, split)
        r = results[split_name]
        print(
            f"  {split_name}: RMSE={r['rmse_mean']} MAE={r['mae_mean']} "
            f"DirAcc={r['direction_accuracy_pct']}% Spike2024={r['spike_2024_matched']}/114"
        )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(results, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {out}")

    short = results["split_short"]
    print(
        f'BACKTEST DONE | RMSE={short["rmse_mean"]} | Direction={short["direction_accuracy_pct"]}% | '
        f'2024 match={short["spike_2024_matched"]}/114'
    )


if __name__ == "__main__":
    main()
