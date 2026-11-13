"""Validate NASA POWER-derived heat index against NOAA CDO ground-truth stations.

Reads `CDO_API_TOKEN` from `apps/api/.env`, queries the NOAA Climate Data Online
(v2) API for GHCND stations near Legazpi (Albay), Naga (Camarines Sur) and
Virac (Catanduanes), pulls daily TMAX/TMIN for 2024, computes a Rothfusz heat
index (dewpoint estimated from TMIN), and compares it to the POWER-derived
heat index in `data/power_daily_full.csv`.

Outputs `output/cdo_validation.json`:
    {"Legazpi": {"bias": X, "rmse": Y, "station_id": "Z", "n": N}, ...}

Bias / RMSE are POWER minus station (°C). On 429/400 API errors or a missing
token, logs the error and exits gracefully without crashing.
"""

from __future__ import annotations

import json
import math
import os
import sys
import time
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv

API_DIR = Path(__file__).resolve().parent
load_dotenv(API_DIR / ".env")

CDO_TOKEN = os.getenv("CDO_API_TOKEN")
CDO_BASE = "https://www.ncei.noaa.gov/cdo-web/api/v2"
HEADERS = {"token": CDO_TOKEN} if CDO_TOKEN else {}

TARGETS = [
    {"name": "Legazpi", "province": "Albay", "lat": 13.1391, "lon": 123.7438},
    {"name": "Naga", "province": "Camarines Sur", "lat": 13.6232, "lon": 123.2522},
    {"name": "Virac", "province": "Catanduanes", "lat": 13.5763, "lon": 124.2446},
]

START = "2024-01-01"
END = "2024-12-31"
DATA_TYPES = "TMAX,TMIN,AWND"
OUT_JSON = API_DIR / "output" / "cdo_validation.json"

# CDO stores temperature in tenths of degrees Celsius.
TENTHS = 10.0


def die(msg: str) -> None:
    """Log a non-fatal error and exit gracefully (no crash)."""
    print(f"[CDO VALIDATION] {msg}")
    sys.exit(0)


def cdo_get(endpoint: str, params: dict) -> dict | None:
    """GET a CDO v2 endpoint; return None on 429/400/missing-token."""
    if not CDO_TOKEN:
        print("[CDO VALIDATION] CDO_API_TOKEN not set in .env - skipping CDO validation.")
        return None
    try:
        resp = requests.get(
            f"{CDO_BASE}/{endpoint}",
            headers=HEADERS,
            params=params,
            timeout=60,
        )
    except requests.RequestException as exc:
        print(f"[CDO VALIDATION] request error for {endpoint}: {exc}")
        return None
    if resp.status_code == 401:
        print("[CDO VALIDATION] 401 Unauthorized - check CDO_API_TOKEN in .env")
        return None
    if resp.status_code == 429:
        print("[CDO VALIDATION] 429 Too Many Requests - backing off per constraints")
        return None
    if resp.status_code == 400:
        print(f"[CDO VALIDATION] 400 Bad Request for {endpoint}: {resp.text[:200]}")
        return None
    if resp.status_code >= 400:
        print(f"[CDO VALIDATION] HTTP {resp.status_code} for {endpoint}: {resp.text[:200]}")
        return None
    return resp.json()


def find_stations() -> dict:
    """Find one GHCND station per target municipality near its coordinates."""
    results: dict[str, dict] = {}
    for target in TARGETS:
        name = target["name"]
        params = {
            "datasetid": "GHCND",
            "limit": 10,
            "extent": f"{target['lat'] - 0.5},{target['lon'] - 0.5},"
                      f"{target['lat'] + 0.5},{target['lon'] + 0.5}",
        }
        data = cdo_get("stations", params)
        if not data or "results" not in data or not data["results"]:
            print(f"[CDO VALIDATION] no GHCND station found near {name} ({target['province']})")
            continue
        # Pick the closest station by straight-line distance.
        best = None
        best_dist = float("inf")
        for st in data["results"]:
            slat = st.get("latitude")
            slon = st.get("longitude")
            if slat is None or slon is None:
                continue
            dist = ((slat - target["lat"]) ** 2 + (slon - target["lon"]) ** 2) ** 0.5
            if dist < best_dist:
                best_dist = dist
                best = st
        if best:
            results[name] = {
                "province": target["province"],
                "station_id": best.get("id"),
                "name": best.get("name"),
                "lat": best.get("latitude"),
                "lon": best.get("longitude"),
                "dist_deg": round(best_dist, 4),
            }
            print(
                f"[CDO VALIDATION] {name}: station {best.get('id')} "
                f"({best.get('name')}) {best_dist:.3f} deg away"
            )
    return results


def fetch_daily(station_id: str) -> pd.DataFrame | None:
    """Fetch daily GHCND TMAX/TMIN/AWND for one station, 2024."""
    all_rows: list[dict] = []
    offset = 1
    limit = 1000
    while True:
        params = {
            "datasetid": "GHCND",
            "stationid": station_id,
            "startdate": START,
            "enddate": END,
            "datatypeid": DATA_TYPES,
            "limit": limit,
            "offset": offset,
        }
        data = cdo_get("data", params)
        if not data or "results" not in data:
            break
        results = data["results"]
        if not results:
            break
        all_rows.extend(results)
        meta = data.get("metadata", {}).get("resultset", {})
        count = meta.get("count", 0)
        if offset + limit >= count:
            break
        offset += limit
        time.sleep(0.2)  # be polite to the API
    if not all_rows:
        return None
    df = pd.DataFrame(all_rows)
    # Pivot wide: one row per date, columns per datatype.
    df = df.dropna(subset=["date", "datatype", "value"])
    piv = df.pivot_table(index="date", columns="datatype", values="value", aggfunc="first")
    piv = piv.reset_index()
    piv["date"] = pd.to_datetime(piv["date"]).dt.date
    for col in ("TMAX", "TMIN"):
        if col in piv.columns:
            piv[col] = pd.to_numeric(piv[col], errors="coerce") / TENTHS
    if "AWND" in piv.columns:
        piv["AWND"] = pd.to_numeric(piv["AWND"], errors="coerce") / TENTHS
    return piv


def rh_from_dewpoint(t_c: float | None, td_c: float | None) -> float | None:
    """Relative humidity (%) at temperature t given dew point td (Magnus)."""
    if t_c is None or td_c is None:
        return None
    try:
        es = 6.112 * math.exp(17.67 * t_c / (t_c + 243.5))
        e = 6.112 * math.exp(17.67 * td_c / (td_c + 243.5))
        return min(100.0, max(0.0, 100.0 * e / es))
    except (ValueError, OverflowError):
        return None


def heat_index_c(t2m_c: float | None, rh_pct: float | None) -> float | None:
    """Rothfusz heat index (°C) from temperature + RH (mirrors fetch_power_data.py)."""
    if t2m_c is None or rh_pct is None:
        return None
    if math.isnan(t2m_c) or math.isnan(rh_pct):
        return None
    t = t2m_c * 9 / 5 + 32
    rh = rh_pct
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
        if rh < 13 and 80 <= t <= 112:
            hi_f -= ((13 - rh) / 4) * math.sqrt((17 - abs(t - 95)) / 17)
        elif rh > 85 and 80 <= t <= 87:
            hi_f += ((rh - 85) / 10) * ((87 - t) / 5)
    return (hi_f - 32) * 5 / 9


def station_heat_index(station_df: pd.DataFrame) -> pd.DataFrame:
    """Compute Rothfusz heat index per day: dewpoint estimated from TMIN."""
    rows = []
    for _, r in station_df.iterrows():
        tmax = r.get("TMAX")
        tmin = r.get("TMIN")
        # dewpoint ≈ overnight minimum (standard approximation)
        dew = tmin if pd.notna(tmin) else None
        rh = rh_from_dewpoint(tmax, dew) if (pd.notna(tmax) and dew is not None) else None
        hi = heat_index_c(tmax, rh) if pd.notna(tmax) else None
        rows.append({"date": r["date"], "station_heat_index_c": hi})
    return pd.DataFrame(rows)


def _norm(s: str) -> str:
    """Lowercase, strip, remove common prefixes/suffixes for name matching."""
    s = str(s).strip().lower()
    for prefix in ("city of ", "municipality of "):
        if s.startswith(prefix):
            s = s[len(prefix):]
    return s


def load_power(name: str, province: str) -> pd.DataFrame:
    """Load POWER rows for one municipality, year 2024.

    Matches by substring on the municipality name (e.g. target "Legazpi" matches
    POWER's "City of Legazpi") and exact province, since POWER stores formal names
    like "City of Legazpi" / "City of Naga".
    """
    df = pd.read_csv(
        API_DIR / "data" / "power_daily_full.csv",
        usecols=["name", "province", "date", "heat_index_max_c"],
        low_memory=False,
    )
    target = _norm(name)
    prov = _norm(province)
    mask = (
        df["province"].map(_norm).eq(prov)
        & df["name"].map(_norm).apply(lambda n: target in n or n in target)
    )
    sub = df[mask].copy()
    sub = sub[sub["date"].str.startswith("2024")]
    sub["date"] = pd.to_datetime(sub["date"]).dt.date
    sub = sub.dropna(subset=["heat_index_max_c"])
    return sub


def metrics(errors: list[float]) -> dict:
    if not errors:
        return {"bias": None, "rmse": None, "n": 0}
    e = pd.Series(errors).dropna().astype(float)
    if len(e) == 0:
        return {"bias": None, "rmse": None, "n": 0}
    return {
        "bias": round(float(e.mean()), 4),
        "rmse": round(float((e ** 2).mean() ** 0.5), 4),
        "n": int(len(e)),
    }


def main() -> None:
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    results: dict[str, dict] = {}

    if not CDO_TOKEN:
        print("[CDO VALIDATION] CDO_API_TOKEN not set in .env - cannot query NOAA CDO.")
        for target in TARGETS:
            results[target["name"]] = {
                "error": "token not configured",
                "province": target["province"],
                "station_id": None,
                "bias": None,
                "rmse": None,
                "n": 0,
            }
        _write_and_update(results)
        return

    stations = find_stations()
    if not stations:
        print("[CDO VALIDATION] No CDO stations found for any Bicol target municipality.")
        for target in TARGETS:
            results[target["name"]] = {
                "error": "no station found",
                "province": target["province"],
                "station_id": None,
                "bias": None,
                "rmse": None,
                "n": 0,
            }
        _write_and_update(results)
        return

    for target in TARGETS:
        name = target["name"]
        province = target["province"]
        st = stations.get(name)
        if not st:
            print(f"[CDO VALIDATION] no GHCND station found near {name} ({province})")
            results[name] = {
                "error": "no station found",
                "province": province,
                "station_id": None,
                "bias": None,
                "rmse": None,
                "n": 0,
            }
            continue
        station_df = fetch_daily(st["station_id"])
        if station_df is None or station_df.empty:
            print(f"[CDO VALIDATION] no daily data for {name} ({st['station_id']})")
            results[name] = {
                "error": "no daily data",
                "province": province,
                "station_id": st["station_id"],
                "bias": None,
                "rmse": None,
                "n": 0,
            }
            continue
        hi_df = station_heat_index(station_df)
        power_df = load_power(name, province)
        if power_df.empty:
            print(f"[CDO VALIDATION] no POWER data for {name}, {province} in 2024")
            results[name] = {
                "error": "no POWER data",
                "province": province,
                "station_id": st["station_id"],
                "bias": None,
                "rmse": None,
                "n": 0,
            }
            continue
        merged = hi_df.merge(power_df, on="date", how="inner")
        if merged.empty:
            print(f"[CDO VALIDATION] no overlapping dates for {name}")
            results[name] = {
                "error": "no overlapping dates",
                "province": province,
                "station_id": st["station_id"],
                "bias": None,
                "rmse": None,
                "n": 0,
            }
            continue
        errors = (merged["heat_index_max_c"] - merged["station_heat_index_c"]).tolist()
        m = metrics(errors)
        results[name] = {
            "province": province,
            "station_id": st["station_id"],
            "station_name": st["name"],
            "station_lat": st["lat"],
            "station_lon": st["lon"],
            "station_dist_deg": st["dist_deg"],
            "bias": m["bias"],
            "rmse": m["rmse"],
            "n": m["n"],
            "note": "bias/rmse = POWER - CDO station (°C), 2024 daily",
        }
        print(
            f"[CDO VALIDATION] {name}: bias={m['bias']} rmse={m['rmse']} "
            f"n={m['n']} (station {st['station_id']})"
        )

    _write_and_update(results)


def _write_and_update(results: dict[str, dict]) -> None:
    """Write cdo_validation.json and update VALIDATION.md."""
    OUT_JSON.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[CDO VALIDATION] wrote {len(results)} entries -> {OUT_JSON}")

    validation_md = API_DIR / "VALIDATION.md"
    if validation_md.exists():
        text = validation_md.read_text(encoding="utf-8")
        success = [(k, v) for k, v in results.items() if v.get("rmse") is not None]
        if success:
            lines = []
            for k, v in success:
                lines.append(
                    f"Validated against NOAA CDO station {v['station_id']} "
                    f"({v['station_name']}, {v['province']}). "
                    f"RMSE = {v['rmse']}°C, Bias = {v['bias']}°C (2024, n={v['n']})."
                )
            block = "\n".join(lines)
            marker = "## 3. Hold-out validation (PAGASA)"
            if marker in text:
                insert_at = text.index(marker)
                text = (
                    text[:insert_at]
                    + "## 2b. Ground-truth validation (NOAA CDO)\n\n"
                    + block
                    + "\n\n"
                    + text[insert_at:]
                )
            validation_md.write_text(text, encoding="utf-8")
            print(f"[CDO VALIDATION] updated VALIDATION.md with {len(success)} station(s).")
        else:
            note = (
                "\n\nAttempted NOAA CDO validation, but usable data was unavailable "
                "for the stations requested. Relying on internal backtest.\n"
            )
            validation_md.write_text(text + note, encoding="utf-8")
            print("[CDO VALIDATION] appended unavailability note to VALIDATION.md.")


if __name__ == "__main__":
    main()
