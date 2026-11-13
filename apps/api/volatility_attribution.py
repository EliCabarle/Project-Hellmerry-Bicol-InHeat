"""Volatility Attribution: does NDVI drive volatility more than it drives mean warming?

Trains two Random Forest models:
1. Predict annual_peak_std (volatility) from geography + wind features
2. Predict mean warming slope (slope_c_per_year) from same features

Compares SHAP feature importances between the two models to answer:
  Does vegetation (NDVI) drive volatility more than it drives the mean?

Output: output/volatility_attribution.json

Usage:
  python volatility_attribution.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
import shap
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split

API_DIR = Path(__file__).resolve().parent
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
VOLATILITY_JSON = API_DIR / "output" / "volatility_analysis.json"
TRENDS_JSON = API_DIR / "output" / "trends.json"
OUT_JSON = API_DIR / "output" / "volatility_attribution.json"

FEATURES = ["elevation_m", "distance_to_coast_km", "ndvi_mean", "mean_wind_speed"]
LABELS = {
    "elevation_m": "Elevation (m)",
    "distance_to_coast_km": "Distance to coast (km)",
    "ndvi_mean": "Mean NDVI (vegetation)",
    "mean_wind_speed": "Mean wind speed (m/s)",
}
RANDOM_STATE = 42
N_ESTIMATORS = 100
SHAP_SAMPLE = 100


def compute_mean_wind_speed() -> pd.DataFrame:
    """Mean wind speed per municipality from u10m/v10m components."""
    df = pd.read_csv(POWER_CSV, usecols=["name", "province", "u10m_ms", "v10m_ms"])
    df = df.dropna(subset=["u10m_ms", "v10m_ms"])
    df["wind_speed_ms"] = np.sqrt(df["u10m_ms"] ** 2 + df["v10m_ms"] ** 2)
    mw = (
        df.groupby(["name", "province"], sort=False)["wind_speed_ms"]
        .mean()
        .reset_index()
        .rename(columns={"wind_speed_ms": "mean_wind_speed"})
    )
    return mw


def shap_importances(model, X: pd.DataFrame) -> dict[str, float]:
    """Mean |SHAP| per feature using TreeExplainer on a sample."""
    sample = X.sample(n=min(len(X), SHAP_SAMPLE), random_state=RANDOM_STATE)
    explainer = shap.TreeExplainer(model)
    shap_vals = np.abs(np.asarray(explainer.shap_values(sample[FEATURES])))
    imp = pd.DataFrame(shap_vals, columns=FEATURES).mean()
    return {f: float(imp[f]) for f in FEATURES}


def main() -> None:
    # --- Load volatility metrics ---
    vol = json.loads(VOLATILITY_JSON.read_text(encoding="utf-8"))
    vol_by_key = {
        (r["name"], r["province"]): r for r in vol["municipalities"]
    }

    # --- Load mean warming slope ---
    trends = json.loads(TRENDS_JSON.read_text(encoding="utf-8"))
    slope_by_key = {
        (r["name"], r["province"]): float(r["slope_c_per_year"])
        for r in trends["municipalities"]
        if r.get("slope_c_per_year") is not None
    }

    # --- Load geography features ---
    geo = pd.read_csv(GEO_CSV, encoding="utf-8")

    # --- Compute mean wind speed ---
    wind = compute_mean_wind_speed()

    # --- Merge everything ---
    df = geo.merge(wind, on=["name", "province"], how="left")
    df["annual_peak_std"] = [
        vol_by_key.get((r["name"], r["province"]), {}).get("annual_peak_std")
        for _, r in df.iterrows()
    ]
    df["mean_slope"] = [
        slope_by_key.get((r["name"], r["province"]))
        for _, r in df.iterrows()
    ]

    df = df.dropna(subset=FEATURES + ["annual_peak_std", "mean_slope"])
    print(f"Municipalities with complete data: {len(df)}")

    X = df[FEATURES]

    # --- Model 1: predict annual_peak_std (volatility) ---
    y_vol = df["annual_peak_std"]
    X_train_v, X_test_v, y_train_v, y_test_v = train_test_split(
        X, y_vol, test_size=0.2, random_state=RANDOM_STATE
    )
    rf_vol = RandomForestRegressor(
        n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1
    )
    rf_vol.fit(X_train_v, y_train_v)
    r2_vol_test = float(rf_vol.score(X_test_v, y_test_v))
    r2_vol_train = float(rf_vol.score(X_train_v, y_train_v))
    print(f"Volatility RF: train R²={r2_vol_train:.4f}, test R²={r2_vol_test:.4f}")

    # --- Model 2: predict mean warming slope ---
    y_slope = df["mean_slope"]
    X_train_s, X_test_s, y_train_s, y_test_s = train_test_split(
        X, y_slope, test_size=0.2, random_state=RANDOM_STATE
    )
    rf_slope = RandomForestRegressor(
        n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=-1
    )
    rf_slope.fit(X_train_s, y_train_s)
    r2_slope_test = float(rf_slope.score(X_test_s, y_test_s))
    r2_slope_train = float(rf_slope.score(X_train_s, y_train_s))
    print(f"Mean-slope RF: train R²={r2_slope_train:.4f}, test R²={r2_slope_test:.4f}")

    # --- SHAP importances ---
    shap_vol = shap_importances(rf_vol, X)
    shap_slope = shap_importances(rf_slope, X)

    total_vol = sum(shap_vol.values()) or 1.0
    total_slope = sum(shap_slope.values()) or 1.0
    share_vol = {f: shap_vol[f] / total_vol for f in FEATURES}
    share_slope = {f: shap_slope[f] / total_slope for f in FEATURES}

    ndvi_vol_share = share_vol["ndvi_mean"]
    ndvi_slope_share = share_slope["ndvi_mean"]
    ndvi_drives_volatility_more = ndvi_vol_share > ndvi_slope_share

    print("\nSHAP importance comparison:")
    for f in FEATURES:
        print(
            f"  {LABELS[f]:<28} vol={shap_vol[f]:.4f} ({share_vol[f]:.3f}) | "
            f"slope={shap_slope[f]:.4f} ({share_slope[f]:.3f})"
        )
    print(
        f"\nNDVI share: volatility={ndvi_vol_share:.3f} | mean slope={ndvi_slope_share:.3f}"
    )
    print(f"NDVI drives volatility more than mean: {ndvi_drives_volatility_more}")

    payload = {
        "project": "Bicol In-Heat",
        "module": "volatility_attribution",
        "n_municipalities": int(len(df)),
        "features": FEATURES,
        "feature_labels": LABELS,
        "model_volatility": {
            "target": "annual_peak_std",
            "r2_train": round(r2_vol_train, 4),
            "r2_test": round(r2_vol_test, 4),
        },
        "model_mean_slope": {
            "target": "slope_c_per_year",
            "r2_train": round(r2_slope_train, 4),
            "r2_test": round(r2_slope_test, 4),
        },
        "shap_importance_volatility": {f: round(shap_vol[f], 6) for f in FEATURES},
        "shap_importance_mean_slope": {f: round(shap_slope[f], 6) for f in FEATURES},
        "shap_share_volatility": {f: round(share_vol[f], 6) for f in FEATURES},
        "shap_share_mean_slope": {f: round(share_slope[f], 6) for f in FEATURES},
        "key_finding": {
            "ndvi_share_volatility": round(ndvi_vol_share, 6),
            "ndvi_share_mean_slope": round(ndvi_slope_share, 6),
            "ndvi_drives_volatility_more": bool(ndvi_drives_volatility_more),
            "interpretation": (
                "Vegetation (NDVI) is a stronger driver of heat-index volatility than of mean warming"
                if ndvi_drives_volatility_more else
                "Vegetation (NDVI) is NOT a stronger driver of heat-index volatility than of mean warming"
            ),
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {OUT_JSON}")


if __name__ == "__main__":
    main()
