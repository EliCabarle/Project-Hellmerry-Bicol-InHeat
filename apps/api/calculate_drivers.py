"""Random-Forest + SHAP driver ranking per municipality (CONCEPT §6c-3).

Reads the daily CSV from `fetch_power_data.py`, fits ONE RandomForestRegressor on
all municipalities and the full 45-year record (~1.9M rows), then ranks features
per municipality by mean |SHAP|. The model is scored on a held-out 20% test split,
so the reported R² is out-of-sample and not just how well 50 trees memorised the
training rows.

Why one global model: `lat`/`lon` are constant inside a municipality, so a
per-municipality model would see zero variance in its two geographic features and
could never rank them. A single model learns the regional relationship and SHAP
then attributes each municipality's predictions separately.

This is **association, not causation** (CONCEPT §10-7). U10M/V10M are wind and
lat/lon stand in for position/terrain until elevation and LST join the feature
set. Temperature and humidity - the physical drivers of heat index - are NOT
features here, so the model explains only part of the variance; `r2_test` is
reported for exactly that reason and must not be presented as forecast accuracy.

Usage:
  python calculate_drivers.py
  python calculate_drivers.py --csv data/power_daily_full.csv --out output/drivers.json
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import r2_score
from sklearn.model_selection import train_test_split

API_DIR = Path(__file__).resolve().parent
IN_CSV = API_DIR / "data" / "power_daily_full.csv"
OUT_JSON = API_DIR / "output" / "drivers.json"

FEATURES = ["u10m_ms", "v10m_ms", "lat", "lon"]
LABELS = {
    "u10m_ms": "Wind (east-west, U10M)",
    "v10m_ms": "Wind (north-south, V10M)",
    "lat": "Latitude",
    "lon": "Longitude",
}
TARGET = "heat_index_max_c"
TOP_N = 3
# SHAP over the full training window would need gigabytes; a random sample of the
# training rows is enough for a mean |SHAP| per municipality (~88 rows each of 114).
SHAP_SAMPLE_ROWS = 10_000
N_ESTIMATORS = 50
TEST_SIZE = 0.2


def build(frame: pd.DataFrame, window: dict | None = None) -> dict:
    missing = set(FEATURES + [TARGET, "name", "province"]) - set(frame.columns)
    if missing:
        raise ValueError(f"CSV is missing columns: {sorted(missing)}")

    frame = frame.dropna(subset=FEATURES + [TARGET])
    train, test = train_test_split(frame, test_size=TEST_SIZE, random_state=42)

    model = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        min_samples_leaf=20,
        n_jobs=-1,
        random_state=42,
    )
    print(f"Training Model on {len(train)} rows...")
    model.fit(train[FEATURES], train[TARGET])

    r2_train = float(model.score(train[FEATURES], train[TARGET]))
    r2_test = float(r2_score(test[TARGET], model.predict(test[FEATURES])))
    print(f"Out-of-Sample R²: {r2_test}")

    sample = train.sample(
        n=min(len(train), SHAP_SAMPLE_ROWS),
        random_state=42,
    )
    print("Calculating SHAP...")
    shap_values = np.abs(np.asarray(shap.TreeExplainer(model).shap_values(sample[FEATURES])))

    attribution = pd.DataFrame(shap_values, columns=FEATURES, index=sample.index)
    attribution["name"] = sample["name"]
    attribution["province"] = sample["province"]
    per_municipality = attribution.groupby(["name", "province"], sort=False)[
        FEATURES
    ].mean()

    municipalities = []
    for (name, province), importance in per_municipality.iterrows():
        total = float(importance.sum()) or 1.0
        ranked = importance.sort_values(ascending=False).head(TOP_N)
        municipalities.append(
            {
                "name": name,
                "province": province,
                "top_drivers": [
                    {
                        "feature": feature,
                        "label": LABELS[feature],
                        "mean_abs_shap": round(float(value), 4),
                        "share": round(float(value) / total, 3),
                    }
                    for feature, value in ranked.items()
                ],
            }
        )

    municipalities.sort(key=lambda row: (row["name"], row["province"]))

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "project": "Bicol In-Heat",
        "target": TARGET,
        "features": LABELS,
        "method": (
            f"RandomForestRegressor (n_estimators={N_ESTIMATORS}) fitted on an "
            f"80/20 train/test split of all municipalities; R2 reported on the "
            f"held-out {len(test)} rows; mean |SHAP| from shap.TreeExplainer over "
            f"{len(sample)} sampled training rows, ranked per municipality"
        ),
        "model": {
            "train_rows": int(len(train)),
            "test_rows": int(len(test)),
            "window": window,
            "shap_rows": int(len(sample)),
            "r2_train": round(r2_train, 4),
            "r2_test": round(r2_test, 4),
        },
        "disclaimer": (
            "Driver importance is association, not causation. Wind components and "
            "lat/lon are proxies - terrain and LST are not in the model yet. "
            "r2_test is the out-of-sample R2 on held-out days: it measures how much "
            "of the heat index these four features explain, not forecast accuracy."
        ),
        "municipalities": municipalities,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", default=str(IN_CSV))
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    print("Loading CSV...")
    frame = pd.read_csv(
        args.csv,
        usecols=["name", "province", "date", *FEATURES, TARGET],
    )
    print(f"  {len(frame)} rows")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce")
    start = frame["date"].min()
    end = frame["date"].max()
    print(f"Full record: {start.date()} .. {end.date()} ({len(frame)} rows)")

    payload = build(
        frame,
        {
            "start": str(start.date()),
            "end": str(end.date()),
        },
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(
        f"model: r2_train={payload['model']['r2_train']} "
        f"r2_test={payload['model']['r2_test']} "
        f"on {payload['model']['train_rows']} train / "
        f"{payload['model']['test_rows']} test rows"
    )
    for row in payload["municipalities"][:5]:
        drivers = ", ".join(d["label"] for d in row["top_drivers"])
        print(f"  {row['name']} ({row['province']}): {drivers}")
    print(f"wrote {len(payload['municipalities'])} municipalities -> {out}")


if __name__ == "__main__":
    main()
