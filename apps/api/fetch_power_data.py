"""Pull NASA POWER daily drivers for Bicol Region V municipalities -> daily CSV.

POWER is an open API: no credentials (CONCEPT §6a). `.env` is still loaded because
this directory is the only place server-side secrets may be read, and the same
process later gains Earthdata/Supabase work.

The felt metric is the PEAK daily heat index: Rothfusz on T2M_MAX + the RH at that
hour. RH2M is a daily mean and peaks overnight, so pairing it with T2M_MAX inflates
the index by ~3 C; RH is instead derived from T2MDEW, which is roughly conserved
through the day.

`nighttime_heat_index_c` applies the same Rothfusz call to T2M_MIN, with RH also
derived from T2MDEW - that is the overnight recovery the daily peak hides.

Verified 2026-11-03: POWER daily T2M/T2M_MAX/T2MDEW/RH2M/U10M/V10M start at 19810101
(CONCEPT §13 open fact "POWER daily start year (assumed 1981)" -> now confirmed).
T2M_MIN verified 2026-11-10: present from 19810101 for a Region V point.

Usage:
  python fetch_power_data.py
  python fetch_power_data.py --start 20150101 --end 20251231 --out data/test.csv
"""

from __future__ import annotations

import argparse
import json
import math
import time
from datetime import datetime
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

API_DIR = Path(__file__).resolve().parent
load_dotenv(API_DIR / ".env")

POWER_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMETERS = ("T2M", "T2M_MAX", "T2M_MIN", "T2MDEW", "RH2M", "U10M", "V10M")
START = "19810101"
END = "20251231"
OUT_CSV = API_DIR / "data" / "power_daily_full.csv"

# Load all 114 municipalities from the official GeoJSON.
# This replaces the former hardcoded 6-city test set.
GEOJSON_PATH = Path(__file__).resolve().parent.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
# encoding is load-bearing: without utf-8, Windows cp1252 turns 'Sagñay' into 'SagÃ±ay'.
with open(GEOJSON_PATH, encoding="utf-8") as gf:
    geojson = json.load(gf)


def _polygon_centroid(geom):
    """Compute centroid by averaging all coordinate points in a Polygon/MultiPolygon."""
    coords = geom["coordinates"]
    if geom["type"] == "MultiPolygon":
        coords = coords[0]
    ring = coords[0] if coords else []
    if not ring:
        return None
    sum_lon = 0.0
    sum_lat = 0.0
    count = 0
    for point in ring:
        if len(point) >= 2:
            sum_lon += point[0]
            sum_lat += point[1]
            count += 1
    if count == 0:
        return None
    return {"lon": sum_lon / count, "lat": sum_lat / count}


municipalities = []
for feat in geojson["features"]:
    props = feat["properties"]
    name = props.get("adm3_en") or props.get("NAME_4") or "Unknown"
    province = props.get("province") or props.get("ADM1_EN") or "Unknown"
    centroid = _polygon_centroid(feat["geometry"])
    if centroid:
        municipalities.append(
            {"name": name, "province": province, "lat": centroid["lat"], "lon": centroid["lon"]}
        )


def rh_from_dewpoint(t_c: float | None, td_c: float | None) -> float | None:
    """Relative humidity (%) at temperature t given dew point td (Magnus formula).

    Dew point barely moves during the day, so this recovers the RH at the hour of
    T2M_MAX instead of the overnight-heavy daily mean.
    """
    if t_c is None or td_c is None:
        return None
    es = 6.112 * math.exp(17.67 * t_c / (t_c + 243.5))  # saturation vapour pressure
    e = 6.112 * math.exp(17.67 * td_c / (td_c + 243.5))  # actual vapour pressure
    return min(100.0, 100.0 * e / es)


def heat_index_c(t2m_c: float | None, rh2m_pct: float | None) -> float | None:
    """Rothfusz heat index (NOAA/NWS) from a T and RH pair, returned in °C.

    Rothfusz is only fitted for T >= 80 F; below that NOAA falls back to the
    Steadman regression, which is what keeps a full-year mean from blowing up.

    Feeds the PEAK index when called with T2M_MAX, the nighttime index with T2M_MIN.
    """
    if t2m_c is None or rh2m_pct is None:
        return None
    if math.isnan(t2m_c) or math.isnan(rh2m_pct):
        return None
    t = t2m_c * 9 / 5 + 32  # Rothfusz coefficients are in Fahrenheit
    rh = rh2m_pct
    if t < 80:
        hi_f = 0.5 * (t + 61.0 + (t - 68.0) * 1.2 + rh * 0.094)
    else:
        hi_f = (
            -42.379
            + 2.04901523 * t
            + 10.14333127 * rh
            - 0.22475541 * t * rh
            - 6.83783e-3 * t * t
            - 5.481717e-2 * rh * rh
            + 1.22874e-3 * t * t * rh
            + 8.5282e-4 * t * rh * rh
            - 1.99e-6 * t * t * rh * rh
        )
        if rh < 13 and 80 <= t <= 112:  # low-humidity correction
            hi_f -= ((13 - rh) / 4) * math.sqrt((17 - abs(t - 95)) / 17)
        elif rh > 85 and 80 <= t <= 87:  # high-humidity correction
            hi_f += ((rh - 85) / 10) * ((87 - t) / 5)
    return (hi_f - 32) * 5 / 9


def fetch_municipality(
    session: requests.Session, mun: dict, start: str, end: str
) -> list[dict]:
    """One POWER daily request -> one row per day. Raises on bad payload."""
    params = {
        "parameters": ",".join(PARAMETERS),
        "community": "AG",
        "longitude": mun["lon"],
        "latitude": mun["lat"],
        "start": start,
        "end": end,
        "format": "JSON",
    }
    response = session.get(POWER_URL, params=params, timeout=180)
    response.raise_for_status()
    payload = response.json()

    if not payload.get("properties", {}).get("parameter"):
        raise RuntimeError(
            f"POWER returned no data for {mun['name']}: {payload.get('messages')}"
        )

    series = payload["properties"]["parameter"]
    fill = float(payload.get("header", {}).get("fill_value", -999.0))

    rows = []
    skipped = 0
    for day in sorted(series["T2M_MAX"]):

        def value(param: str) -> float | None:
            v = series.get(param, {}).get(day, fill)
            return None if v == fill else v

        t2m_max = value("T2M_MAX")
        t2m_min = value("T2M_MIN")
        t2mdew = value("T2MDEW")
        rh2m = value("RH2M")
        rh_peak = rh_from_dewpoint(t2m_max, t2mdew)
        if t2m_max is None or rh2m is None or rh_peak is None:
            skipped += 1  # never let POWER's fill value reach the mean
            continue

        rows.append(
            {
                "name": mun["name"],
                "province": mun["province"],
                "lat": mun["lat"],
                "lon": mun["lon"],
                "date": datetime.strptime(day, "%Y%m%d").date().isoformat(),
                "t2m_c": value("T2M"),
                "t2m_max_c": t2m_max,
                "t2m_min_c": t2m_min,
                "t2mdew_c": t2mdew,
                "rh2m_pct": rh2m,
                "u10m_ms": value("U10M"),
                "v10m_ms": value("V10M"),
                "heat_index_max_c": heat_index_c(t2m_max, rh_peak),
                # None when T2M_MIN is missing; the peak row is still valid
                "nighttime_heat_index_c": heat_index_c(
                    t2m_min, rh_from_dewpoint(t2m_min, t2mdew)
                ),
            }
        )

    print(f"{mun['name']:<10} {len(rows):>6} days, {skipped} skipped (fill value)")
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--start", default=START, help="YYYYMMDD (default 19810101)")
    parser.add_argument("--end", default=END, help="YYYYMMDD (default 20251231)")
    parser.add_argument("--out", default=str(OUT_CSV), help="output CSV path")
    args = parser.parse_args()

    session = requests.Session()
    session.mount(
        "https://",
        HTTPAdapter(
            max_retries=Retry(
                total=3, backoff_factor=2, status_forcelist=[429, 500, 502, 503, 504]
            )
        ),
    )

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    # Resume: skip municipalities already in the CSV. A 114 x 45-year pull is
    # ~30 min of network, so a crash must not cost the whole run.
    done: set[tuple[str, str]] = set()
    if out.exists() and out.stat().st_size:
        existing = pd.read_csv(out, usecols=["name", "province"])
        done = {tuple(r) for r in existing.drop_duplicates().itertuples(index=False)}
        print(f"resuming: {len(done)} municipalities already in {out.name}")

    failures: list[str] = []
    for i, mun in enumerate(municipalities, 1):
        key = (mun["name"], mun["province"])
        if key in done:
            continue
        try:
            rows = fetch_municipality(session, mun, args.start, args.end)
        except Exception as exc:  # one bad LGU must not kill a 30-min pull
            failures.append(f"{key[0]}|{key[1]}: {exc}")
            print(f"[{i}/{len(municipalities)}] FAILED {key[0]}|{key[1]}: {exc}")
            continue
        # append per municipality so memory stays flat across ~1.9M rows
        pd.DataFrame(rows).to_csv(
            out,
            mode="a",
            header=not out.exists() or out.stat().st_size == 0,
            index=False,
            encoding="utf-8",
        )
        time.sleep(1.5)  # prevent NASA POWER API rate-limit

    if failures:
        print(f"\n{len(failures)} municipalities failed:")
        for item in failures:
            print("  -", item)
        raise SystemExit(1)
    print(f"wrote {out}")


if __name__ == "__main__":
    main()