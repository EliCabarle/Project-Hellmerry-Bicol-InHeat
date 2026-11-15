"""Trend results -> static `narratives.json` read by the PWA.

Numbers are injected from `calculate_trends.py` output; nothing here invents a
number (CONCEPT §6d). This is the documented FALLBACK path - templates, no runtime
LLM, no key in the client. Swap in the build-time LLM renderer later without
changing the JSON shape.

Output goes to `apps/api/output/` because the web-assets location is a cross-boundary
decision (root AGENTS.md role contract): pass --out to place it wherever the lead
agrees, e.g. --out ../web/public/data/narratives.json.

Usage:
  python generate_static_json.py
  python generate_static_json.py --trends output/trends.json --out output/narratives.json

When output/drivers.json exists (calculate_drivers.py), each municipality also
gains a top_drivers list; when it does not, the key is omitted and the dashboard
hides its driver chart instead of showing blanks.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path


def slugify(name: str, province: str) -> str:
    """Province-qualified, ASCII-safe, unique across the 114 LGUs.

    'Bato' exists in two provinces and 'Sagñay' is not ASCII: a bare-name id
    would collide and a raw-id id would dribble mojibake into DOM keys.
    """
    text = unicodedata.normalize("NFKD", f"{name} {province}")
    text = "".join(c for c in text if not unicodedata.combining(c)).lower()
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", text)).strip("-")


from calculate_trends import DANGER_C  # single source for the 42 °C Danger floor

API_DIR = Path(__file__).resolve().parent
IN_JSON = API_DIR / "output" / "trends.json"
DRIVERS_JSON = API_DIR / "output" / "drivers.json"
OUT_JSON = API_DIR / "output" / "narratives.json"
# Exposure + condition sources. trends.json holds only trend statistics, so the
# human-impact fields are joined in from the modules that already produce them.
POPULATION_CSV = API_DIR / "data" / "population.csv"
LST_CSV = API_DIR / "data" / "lst_means.csv"
GEO_CSV = API_DIR / "data" / "geo_features.csv"
PERSON_DAYS_JSON = API_DIR / "output" / "person_days_danger.json"
# Boundary source of truth for the completeness check (114 municipalities).
GEOJSON_PATH = (
    API_DIR.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
)

# PAGASA heat-index bands (CONCEPT §6c-4), in °C.
BANDS = [
    (52.0, "Extreme Danger", "Matinding Panganib"),
    (42.0, "Danger", "Panganib"),
    (33.0, "Extreme Caution", "Labis na Pag-iingat"),
    (27.0, "Caution", "Pag-iingat"),
]


def danger_band(hi_c: float | None) -> tuple[str, str] | None:
    if hi_c is None:
        return None
    for threshold, english, filipino in BANDS:
        if hi_c >= threshold:
            return english, filipino
    return "Below Caution", "Mababa sa Pag-iingat"


def _slope(value: float) -> str:
    return f"{abs(value):.3f}"


def _p_value(p: float | None) -> str:
    """Full phrase, so templates never render 'p = < 0.001'."""
    if p is None:
        return "p = n/a"
    return "p < 0.001" if p < 0.001 else f"p = {p:.3f}"


def render_narration(row: dict) -> dict:
    """Plain-language EN + Filipino for one municipality. Numbers are passed in."""
    name = row["name"]
    slope = row["slope_c_per_year"]
    p = _p_value(row["p_value"])
    years = row["sample"]["n_years"]

    if slope is None:
        return {
            "en": (
                f"There are not enough years of data ({years}) to test a heat-index "
                f"trend for {name}."
            ),
            "fil": (
                f"Kulang ang datos ({years} taon) para masuri ang kalakaran ng heat "
                f"index sa {name}."
            ),
        }

    flat = abs(slope) < 0.0005  # below this a 3-dp figure reads as a broken 0.000
    warming = slope > 0

    if flat:
        en = (
            f"{name}'s annual heat index is essentially unchanged across {years} "
            f"years (trend of about 0.000 °C per year, {p})."
        )
        fil = (
            f"Halos hindi nagbabago ang taunang heat index ng {name} sa loob ng "
            f"{years} taon (kalakaran: 0.000 °C bawat taon, {p})."
        )
    elif row["is_significant"] and warming:
        en = (
            f"{name} is getting hotter by about {_slope(slope)} °C per year "
            f"({p}). The trend is statistically significant, so it is unlikely "
            f"to be chance."
        )
        fil = (
            f"Ang {name} ay umiinit nang humigit-kumulang {_slope(slope)} °C bawat "
            f"taon ({p}). Makabuluhan ang kalakarang ito, kaya malabong "
            f"nagkataon lamang."
        )
    elif row["is_significant"]:
        en = (
            f"{name} is getting cooler by about {_slope(slope)} °C per year "
            f"({p}). The cooling trend is statistically significant."
        )
        fil = (
            f"Ang {name} ay lumalamig nang humigit-kumulang {_slope(slope)} °C bawat "
            f"taon ({p}). Makabuluhan ang paglamig na ito."
        )
    elif warming:
        en = (
            f"{name} shows a warming of about {_slope(slope)} °C per year, but the "
            f"trend is not statistically significant ({p}) - year-to-year noise "
            f"is larger than the signal."
        )
        fil = (
            f"May pag-init na humigit-kumulang {_slope(slope)} °C bawat taon sa "
            f"{name}, ngunit hindi ito makabuluhan ayon sa estadistika ({p}) - "
            f"mas malaki ang taon-taong pagbabago kaysa sa kalakaran."
        )
    else:
        en = (
            f"{name} shows a cooling of about {_slope(slope)} °C per year, but the "
            f"trend is not statistically significant ({p}) - year-to-year noise "
            f"is larger than the signal."
        )
        fil = (
            f"May paglamig na humigit-kumulang {_slope(slope)} °C bawat taon sa "
            f"{name}, ngunit hindi ito makabuluhan ayon sa estadistika ({p}) - "
            f"mas malaki ang taon-taong pagbabago kaysa sa kalakaran."
        )

    latest = row["series"][-1] if row["series"] else None
    band = danger_band(latest["mean_heat_index_c"]) if latest else None
    if band:
        en += (
            f" In {latest['year']} the average heat index was "
            f"{latest['mean_heat_index_c']:.1f} °C, inside PAGASA's {band[0]} band."
        )
        fil += (
            f" Noong {latest['year']}, ang karaniwang heat index ay "
            f"{latest['mean_heat_index_c']:.1f} °C, nasa antas ng {band[1]} ng PAGASA."
        )

    danger = _danger_summary(row["series"])
    peak = danger["peak_danger_days"]
    if danger["total_danger_days_45y"] == 0:
        en += f" {name} has never exceeded the {DANGER_C:.0f} °C Danger threshold."
        fil += (
            f" Hindi pa kailanman lumampas ang {name} sa "
            f"{DANGER_C:.0f} °C na antas ng Panganib."
        )
    else:
        total = danger["total_danger_days_45y"]
        total_text = "1 day" if total == 1 else f"{total} days"
        when = (
            f" in {peak['year']}"
            if total == 1
            else f", {peak['days']} of them in {peak['year']}"
        )
        en += (
            f" Historically, {name} has experienced {total_text} above "
            f"the {DANGER_C:.0f} °C Danger threshold{when}."
        )
        fil += (
            f" Sa kasaysayan, ang {name} ay nakaranas ng "
            f"{total} araw na lumampas sa {DANGER_C:.0f} °C "
            f"na antas ng Panganib, at {peak['days']} sa mga ito ay nangyari noong "
            f"{peak['year']}."
        )

    return {"en": en, "fil": fil}


def _danger_summary(series: list[dict]) -> dict:
    """Ranking keys: total Danger days and the worst single year.

    A 2025-only count ties every municipality at zero, so the ranking needs the
    whole record. Ties go to the most recent year.
    """
    total = sum(point["danger_days"] for point in series)
    if total == 0:
        return {
            "total_danger_days_45y": 0,
            "peak_danger_days": {"year": None, "days": 0},
        }
    peak = max(series, key=lambda point: (point["danger_days"], point["year"]))
    return {
        "total_danger_days_45y": total,
        "peak_danger_days": {"year": peak["year"], "days": peak["danger_days"]},
    }


def build(
    trends: dict,
    drivers: dict | None = None,
    exposure: dict | None = None,
    precipitation: dict | None = None,
) -> dict:
    exposure = exposure or {}
    precipitation = precipitation or {}
    precip_meta = load_precipitation_meta()
    municipalities = []
    for row in trends["municipalities"]:
        latest = row["series"][-1] if row["series"] else None
        band = danger_band(latest["mean_heat_index_c"]) if latest else None
        danger = _danger_summary(row["series"])
        # RF/SHAP driver ranking (calculate_drivers.py). Keyed on (name, province),
        # same contract as push_to_supabase.driver_index(). Omitted entirely when
        # drivers.json is absent, so the dashboard can hide its driver chart.
        municipality_drivers = (
            drivers.get((row["name"], row["province"]))
            if drivers is not None
            else "absent"
        )
        key = (row["name"], row["province"])
        expo = exposure.get(key, {})
        precip = precipitation.get(key, {})
        narration = render_narration(row)
        if precip.get("_precip_sentence"):
            narration["en"] = narration["en"] + precip["_precip_sentence"]
        municipality = {
            "id": slugify(row["name"], row["province"]),
            "name": row["name"],
            "province": row["province"],
            "lat": row["lat"],
            "lon": row["lon"],
            "trend": {
                "slope_c_per_year": row["slope_c_per_year"],
                "slope_ci95": row["slope_ci95"],
                # .get: a trends.json predating the CI/change-point run has no keys
                "slope_ci_low": row.get("slope_ci_low"),
                "slope_ci_high": row.get("slope_ci_high"),
                "change_point_year": row.get("change_point_year"),
                "change_point_p": row.get("change_point_p"),
                "p_value": row["p_value"],
                "is_significant": row["is_significant"],
                "alpha": row["alpha"],
                "direction": row["trend_direction"],
            },
            "sample": row["sample"],
            "latest": {
                "year": latest["year"] if latest else None,
                "mean_heat_index_c": (latest["mean_heat_index_c"] if latest else None),
                "nighttime_heat_index_c": (
                    latest.get("mean_nighttime_heat_index_c") if latest else None
                ),
                "danger_band": band[0] if band else None,
                "danger_days": latest["danger_days"] if latest else None,
            },
            "total_danger_days_45y": danger["total_danger_days_45y"],
            "peak_danger_days": danger["peak_danger_days"],
            "narration": narration,
            "series": row["series"],
            # Human impact + ground conditions: population exposure, person-days
            # of danger, ground temperature, vegetation cover. Joined from the
            # modules that produce them; an absent source omits its keys.
            **expo,
            **{
                k: v
                for k, v in precip.items()
                if k != "_precip_sentence" and v is not None
            },
        }
        if municipality_drivers != "absent":
            municipality["top_drivers"] = municipality_drivers
        municipalities.append(municipality)

    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "meta": {
            "project": "Bicol In-Heat",
            "challenge": "Be An Earth System Trend Detective!",
            "variable": trends["variable"],
            "units": trends["units"],
            "method": trends["method"],
            "alpha": trends["alpha"],
            "danger_threshold_c": trends["danger_threshold_c"],
            "period": trends["period"],
            "sources": [
                {
                    "name": "NASA POWER",
                    "parameters": ["T2M_MAX", "T2M_MIN", "T2MDEW"],
                    "url": "https://power.larc.nasa.gov/",
                    "note": "Daily means, 0.5 degree grid. Heat index is derived "
                    "(Rothfusz on T2M_MAX + dew-point-derived RH), not a POWER "
                    "product.",
                }
            ],
            "narration": {
                "generator": "template",
                "note": "Numbers come from the trend output; text does not compute "
                "or invent values.",
                "languages": ["en", "fil"],
            },
            "disclaimer": "Municipality is the smallest unit: POWER's ~55 km grid "
            "cannot resolve barangays. Drivers are associations, not causation.",
            **precip_meta,
        },
        "municipalities": municipalities,
    }


def _missing_municipalities(payload: dict) -> list[tuple[str, str]]:
    """(name, province) pairs in the boundary GeoJSON that the output lacks.

    Returns [] when the GeoJSON is unavailable, so the pipeline still runs on a
    machine without the web assets - it just cannot prove completeness there.
    """
    if not GEOJSON_PATH.exists():
        print(f"warning: {GEOJSON_PATH.name} not found, skipping completeness check")
        return []
    with open(GEOJSON_PATH, encoding="utf-8") as handle:
        features = json.load(handle)["features"]
    expected = {
        (f["properties"].get("adm3_en"), f["properties"].get("province"))
        for f in features
    }
    produced = {(m["name"], m["province"]) for m in payload["municipalities"]}
    print(
        f"coverage: {len(produced & expected)}/{len(expected)} GeoJSON municipalities"
    )
    return sorted(expected - produced)


def load_driver_index() -> dict | None:
    """(name, province) -> top_drivers, or None when drivers.json is absent.

    None means "no driver data anywhere" — build() then omits the top_drivers
    key entirely instead of writing nulls into every municipality.
    """
    if not DRIVERS_JSON.exists():
        return None
    drivers = json.loads(DRIVERS_JSON.read_text(encoding="utf-8"))
    return {
        (row["name"], row["province"]): row["top_drivers"]
        for row in drivers.get("municipalities", [])
    }


def _read_csv(path: Path) -> list[dict]:
    """Rows of a CSV as dicts, or [] when the file is absent."""
    if not path.exists():
        print(f"warning: {path.name} missing - related fields omitted")
        return []
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def _num(value: str | None) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def load_exposure() -> dict[tuple[str, str], dict]:
    """(name, province) -> population exposure + ground-condition fields.

    trends.json holds trend statistics only. The human-impact numbers an LGU
    needs — population, person-days of danger, ground temperature, vegetation
    cover — come from the modules that already produce them. Each source is
    optional: a missing file omits its fields rather than failing the build.
    """
    out: dict[tuple[str, str], dict] = {}

    for row in _read_csv(POPULATION_CSV):
        key = (row.get("name"), row.get("province"))
        out.setdefault(key, {}).update(
            {
                "population_2020": int(_num(row.get("population_2020")) or 0),
                "population_density": _num(row.get("population_density")),
                "area_km2": _num(row.get("area_km2")),
                "exposed_flag": str(row.get("exposed_flag", "")).lower() == "true",
            }
        )

    for row in _read_csv(LST_CSV):
        key = (row.get("name"), row.get("province"))
        out.setdefault(key, {})["lst_mean_c"] = _num(row.get("lst_mean_c"))

    for row in _read_csv(GEO_CSV):
        key = (row.get("name"), row.get("province"))
        out.setdefault(key, {}).update(
            {
                "ndvi_mean": _num(row.get("ndvi_mean")),
                "elevation_m": _num(row.get("elevation_m")),
                "distance_to_coast_km": _num(row.get("distance_to_coast_km")),
            }
        )

    if PERSON_DAYS_JSON.exists():
        payload = json.loads(PERSON_DAYS_JSON.read_text(encoding="utf-8"))
        for row in payload.get("all_municipalities", []):
            key = (row.get("name"), row.get("province"))
            out.setdefault(key, {}).update(
                {
                    "person_days_danger": row.get("person_days_danger"),
                    "person_days_density": row.get("person_days_density"),
                }
            )
    else:
        print(f"warning: {PERSON_DAYS_JSON.name} missing - person-days omitted")

    return out


def load_precipitation() -> dict[tuple[str, str], dict]:
    """Carry forward the precipitation fields and their narration sentences.

    Precipitation needs a live NASA POWER fetch (fetch_new_variable.py), so a
    local rebuild cannot recompute it. Reading it back from the previous
    narratives.json keeps a regeneration lossless instead of silently dropping
    a whole Earth-system variable.
    """
    if not OUT_JSON.exists():
        print("warning: no previous narratives.json - precipitation omitted")
        return {}
    previous = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    carried: dict[tuple[str, str], dict] = {}
    for row in previous.get("municipalities", []):
        key = (row.get("name"), row.get("province"))
        entry = {
            "annual_precip_mm_2024": row.get("annual_precip_mm_2024"),
            "precip_source": row.get("precip_source"),
            "precip_heat_index_corr_2024": row.get("precip_heat_index_corr_2024"),
        }
        # The precipitation sentence lives inside the narration; keep it so the
        # rebuilt text matches the previous one.
        en = (row.get("narration") or {}).get("en") or ""
        marker = " In 2024, annual precipitation totaled"
        if marker in en:
            entry["_precip_sentence"] = en[en.index(marker):]
        carried[key] = entry
    return carried


def load_precipitation_meta() -> dict:
    """The meta-level precipitation notes, carried forward the same way."""
    if not OUT_JSON.exists():
        return {}
    previous = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    meta = previous.get("meta") or {}
    return {
        key: meta[key]
        for key in (
            "precip_variable",
            "precip_source",
            "precip_heat_index_corr_2024",
            "precip_note",
        )
        if key in meta
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--trends", default=str(IN_JSON))
    parser.add_argument("--out", default=str(OUT_JSON))
    args = parser.parse_args()

    trends = json.loads(Path(args.trends).read_text(encoding="utf-8"))
    drivers = load_driver_index()
    if drivers is None:
        print(
            "warning: output/drivers.json missing - top_drivers omitted from narratives"
        )
    exposure = load_exposure()
    precipitation = load_precipitation()
    payload = build(trends, drivers, exposure, precipitation)

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    # compact on purpose: this file ships to the PWA, indentation is dead weight
    out.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"wrote {len(payload['municipalities'])} municipalities -> {out}")

    # Completeness tripwire: B2 shipped 112 of 114 because nothing compared the
    # output back to the boundary file. Fail loud instead of shipping a short file.
    missing = _missing_municipalities(payload)
    if missing:
        print(f"INCOMPLETE: {len(missing)} municipalities missing from the output:")
        for pair in missing:
            print(f"  - {pair[0]}|{pair[1]}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
