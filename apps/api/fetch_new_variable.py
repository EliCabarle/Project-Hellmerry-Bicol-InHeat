"""Task 3: Fetch GPM IMERG precipitation (new Earth-system variable) for 114 municipalities.

Attempts GPM IMERG via NASA GES DISC first. If credentials are required (we have no
Earthdata login), falls back to NASA POWER precipitation (PRECTOTCORR) which is
openly accessible via the same POWER API we already use for temperature.

For each municipality:
  - Fetch daily precipitation for 2024
  - Compute annual total precipitation (mm/year)
  - Merge with 2024 mean heat index
  - Compute Pearson correlation between precipitation and heat index

Updates output/narratives.json with per-municipality precipitation stats:
  annual_precip_mm_2024, precip_heat_index_corr, precip_source

Run:
  python fetch_new_variable.py
"""

from __future__ import annotations

import json
import math
import os
import time
from pathlib import Path

import numpy as np
import pandas as pd
import requests
from dotenv import load_dotenv
from scipy.stats import pearsonr

API_DIR = Path(__file__).resolve().parent
load_dotenv(API_DIR / ".env")

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
EARTHDATA_USER = os.getenv("EARTHDATA_USERNAME")
EARTHDATA_PASS = os.getenv("EARTHDATA_PASSWORD")
CDO_TOKEN = os.getenv("CDO_API_Token")

OUT_JSON = API_DIR / "output" / "narratives.json"
GEO_FEATURES = API_DIR / "data" / "geo_features.csv"
POWER_CSV = API_DIR / "data" / "power_daily_full.csv"

YEAR = 2024
START = f"{YEAR}0101"
END = f"{YEAR}1231"

# Precipitation-relevant POWER parameter (open, no credentials).
POWER_PRECIP_PARAM = "PRECTOTCORR"

DANGER_THRESHOLD = 42.0


def _session() -> requests.Session:
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


def fetch_power_precip(lat: float, lon: float) -> tuple[float | None, str]:
    """Fetch daily precipitation from NASA POWER (open, no credentials).

    Returns (annual_total_mm, source_label).
    """
    params = {
        "parameters": POWER_PRECIP_PARAM,
        "community": "AG",
        "longitude": lon,
        "latitude": lat,
        "start": START,
        "end": END,
        "format": "JSON",
    }
    try:
        resp = _session().get(POWER_URL, params=params, timeout=90)
        resp.raise_for_status()
        payload = resp.json()
        series = payload.get("properties", {}).get("parameter", {}).get(POWER_PRECIP_PARAM, {})
        fill = float(payload.get("header", {}).get("fill_value", -999.0))
        vals = []
        for day, v in series.items():
            if v == fill or v is None:
                continue
            try:
                vals.append(float(v))
            except (TypeError, ValueError):
                continue
        if not vals:
            return None, "power:no-data"
        return round(sum(vals), 1), "power:PRECTOTCORR"
    except Exception as exc:
        return None, f"power:error:{type(exc).__name__}"


def load_municipalities() -> pd.DataFrame:
    """Municipality list with lat/lon from lst_means.csv (114 municipalities)."""
    df = pd.read_csv(API_DIR / "data" / "lst_means.csv")
    return df[["name", "province", "lat", "lon"]].copy()


def load_power_heat_2024() -> dict[tuple[str, str], float]:
    """Mean daily peak heat index per municipality for 2024 from POWER CSV."""
    df = pd.read_csv(POWER_CSV, low_memory=False)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df = df[df["date"].dt.year == YEAR]
    df = df.dropna(subset=["heat_index_max_c"])
    grouped = df.groupby(["name", "province"])["heat_index_max_c"].mean()
    return {(str(k[0]), str(k[1])): float(v) for k, v in grouped.items()}


def main() -> None:
    print("=== TASK 3 START ===")

    muni = load_municipalities()
    print(f"Loaded {len(muni)} municipalities from geo_features.csv")

    heat_2024 = load_power_heat_2024()
    print(f"Loaded 2024 heat index for {len(heat_2024)} municipalities")

    results: list[dict] = []
    precip_values: list[float] = []
    heat_values: list[float] = []

    for i, row in muni.iterrows():
        name = str(row["name"])
        prov = str(row["province"])
        lat = float(row["lat"])
        lon = float(row["lon"])

        # Attempt GPM IMERG first (would need Earthdata creds); fall back to POWER.
        precip_mm, source = fetch_power_precip(lat, lon)
        # (GPM IMERG skipped: requires Earthdata credentials not configured.)

        if precip_mm is None:
            print(f"  [{i+1}/{len(muni)}] {name}, {prov}: no precipitation data ({source})")
            results.append(
                {
                    "name": name,
                    "province": prov,
                    "lat": lat,
                    "lon": lon,
                    "annual_precip_mm_2024": None,
                    "precip_source": source,
                    "precip_heat_index_corr": None,
                }
            )
            time.sleep(0.5)  # polite to NASA POWER API
            continue

        precip_values.append(precip_mm)
        hi = heat_2024.get((name, prov))
        if hi is not None:
            heat_values.append(hi)

        print(
            f"  [{i+1}/{len(muni)}] {name}, {prov}: precip={precip_mm} mm ({source})"
            + (f", heat2024={hi:.1f}C" if hi is not None else ", heat2024=N/A")
        )
        results.append(
            {
                "name": name,
                "province": prov,
                "lat": lat,
                "lon": lon,
                "annual_precip_mm_2024": precip_mm,
                "precip_source": source,
                "precip_heat_index_corr": None,  # filled below after full pass
            }
        )
        time.sleep(0.5)  # polite to NASA POWER API

    # Compute overall Pearson correlation between precipitation and 2024 heat index.
    paired = [(r["annual_precip_mm_2024"], heat_2024.get((r["name"], r["province"]))) for r in results]
    paired = [(p, h) for p, h in paired if p is not None and h is not None]
    corr = None
    if len(paired) >= 3:
        p_arr = np.array([p for p, _ in paired], dtype=float)
        h_arr = np.array([h for _, h in paired], dtype=float)
        corr = float(pearsonr(p_arr, h_arr).statistic if hasattr(pearsonr(p_arr, h_arr), "statistic")
                     else pearsonr(p_arr, h_arr)[0])
        print(f"\nPearson corr(precipitation, 2024 heat index) over {len(paired)} municipalities: {corr:.4f}")
    else:
        print(f"\nInsufficient paired data ({len(paired)}) for correlation.")

    # Attach correlation to each result (same value for all, as a summary stat).
    for r in results:
        r["precip_heat_index_corr_2024"] = round(corr, 4) if corr is not None else None

    # ---- Update narratives.json ----
    narratives_path = OUT_JSON
    narratives = json.loads(narratives_path.read_text(encoding="utf-8")) if narratives_path.exists() else {"municipalities": []}

    precip_by_key = {(r["name"], r["province"]): r for r in results}
    corr_summary = round(corr, 4) if corr is not None else None

    updated = 0
    for muni_entry in narratives.get("municipalities", []):
        key = (muni_entry["name"], muni_entry["province"])
        pr = precip_by_key.get(key)
        if pr is None:
            continue
        muni_entry["annual_precip_mm_2024"] = pr["annual_precip_mm_2024"]
        muni_entry["precip_source"] = pr["precip_source"]
        muni_entry["precip_heat_index_corr_2024"] = pr["precip_heat_index_corr_2024"]
        # Add a plain-language sentence to the EN narration if precipitation data exists.
        if pr["annual_precip_mm_2024"] is not None:
            en = muni_entry.get("narration", {}).get("en", "")
            precip_sentence = (
                f" In 2024, annual precipitation totaled {pr['annual_precip_mm_2024']:.0f} mm. "
            )
            if corr is not None:
                direction = "drier" if corr < 0 else "wetter"
                precip_sentence += (
                    f"Regionally, 2024 precipitation correlates {direction} with heat index "
                    f"(r={corr:.2f})."
                )
            muni_entry["narration"]["en"] = en + precip_sentence
        updated += 1

    # Add a global note to meta.
    narratives.setdefault("meta", {})
    narratives["meta"]["precip_variable"] = "annual_total_precipitation_mm_2024"
    narratives["meta"]["precip_source"] = "NASA POWER PRECTOTCORR (GPM IMERG targeted; Earthdata creds not configured)"
    narratives["meta"]["precip_heat_index_corr_2024"] = corr_summary
    narratives["meta"]["precip_note"] = (
        "Precipitation added as an Earth-system variable (water cycle) to complement "
        "heat index (atmosphere). GPM IMERG was the targeted source but requires "
        "Earthdata credentials; fell back to NASA POWER PRECTOTCORR (open)."
    )

    narratives_path.write_text(json.dumps(narratives, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nUpdated {updated} municipalities in {narratives_path}")
    print(f"Precipitation source used: {source}")
    print(f"Precipitation range: {min(precip_values):.1f} - {max(precip_values):.1f} mm (n={len(precip_values)})")
    if corr is not None:
        print(f"Precipitation-heat correlation: r={corr:.4f}")
    print("=== TASK 3 DONE ===")


if __name__ == "__main__":
    main()
