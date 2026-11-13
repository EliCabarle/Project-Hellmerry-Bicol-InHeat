"""Population exposure via Google Earth Engine (SEDAC GPWv4.11).

Loads CIESIN/GPWv411/GPW_Population_Count (2020, ~1km) and zonal-statistics it
against the 114 Bicol municipalities. Computes population, area, density, and
exposure flags (municipalities with >0 danger days over 1981-2025).

Outputs data/population.csv and updates output/narratives.json with a population
block per municipality.

Usage:
  python fetch_population.py
"""

from __future__ import annotations

import json
from pathlib import Path

import ee
import json as _json
from shapely.geometry import shape
from shapely.ops import transform
import pyproj

API_DIR = Path(__file__).resolve().parent
GEOJSON_PATH = (
    API_DIR.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
)
TRENDS_JSON = API_DIR / "output" / "trends.json"
NARRATIVES_JSON = API_DIR / "output" / "narratives.json"
POPULATION_CSV = API_DIR / "data" / "population.csv"

GPW_COLLECTION = "CIESIN/GPWv411/GPW_Population_Count"
GPW_YEAR = "2020"
RANDOM_STATE = 42

ee.Initialize(project="verdant-ee-project")


def load_municipalities() -> list[dict]:
    """Load GeoJSON features -> list of {name, province, geometry}."""
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        collection = _json.load(f)
    rows = []
    for feat in collection.get("features", []):
        props = feat.get("properties", {}) or {}
        name = props.get("adm3_en") or props.get("NAME_4") or "Unknown"
        province = props.get("province") or props.get("ADM1_EN") or "Unknown"
        rows.append(
            {"name": name, "province": province, "geometry": feat.get("geometry")}
        )
    if not rows:
        raise ValueError(f"❌ Found 0 municipalities in {GEOJSON_PATH}")
    return rows


def area_km2(geom: dict) -> float:
    """Polygon area in km² using UTM zone 51N (Philippines)."""
    geom_shape = shape(geom)
    wgs84 = pyproj.CRS("EPSG:4326")
    utm = pyproj.CRS("EPSG:32651")
    project = pyproj.Transformer.from_crs(wgs84, utm, always_xy=True).transform
    geom_utm = transform(project, geom_shape)
    return geom_utm.area / 1e6


def main() -> None:
    # Load danger-day status from trends.json (series has per-year danger_days).
    with open(TRENDS_JSON, encoding="utf-8") as f:
        trends = json.load(f)
    danger_by_key = {}
    for row in trends["municipalities"]:
        total_danger = sum(
            s.get("danger_days", 0) for s in row.get("series", [])
        )
        danger_by_key[(row["name"], row["province"])] = int(total_danger)

    municipalities = load_municipalities()
    print(f"Loaded {len(municipalities)} municipalities from GeoJSON.")

    # GEE: load GPW population count image for 2020.
    pop_image = (
        ee.ImageCollection(GPW_COLLECTION)
        .filterDate(f"{GPW_YEAR}-01-01", f"{GPW_YEAR}-12-31")
        .first()
        .select("population_count")
    )

    # Build GEE geometries and reduceRegions for all municipalities in one call.
    geoms = []
    keys = []
    for row in municipalities:
        geoms.append(ee.Geometry(row["geometry"]))
        keys.append((row["name"], row["province"]))

    # reduceRegions over all polygons at once.
    reducer = ee.Reducer.sum()
    # Use reduceRegions with the collection of geometries.
    features = pop_image.reduceRegions(
        collection=ee.FeatureCollection(
            [
                ee.Feature(g, {"name": k[0], "province": k[1]})
                for g, k in zip(geoms, keys)
            ]
        ),
        reducer=reducer,
        scale=1000,  # ~1 km native resolution
    ).getInfo()

    # Map result back by (name, province).
    pop_by_key = {}
    for feat in features.get("features", []):
        props = feat.get("properties", {}) or {}
        pop_by_key[(props.get("name"), props.get("province"))] = props.get(
            "sum", 0
        ) or 0

    rows_out = []
    total_pop = 0
    danger_pop = 0
    danger_munis = []

    for row in municipalities:
        name = row["name"]
        province = row["province"]
        key = (name, province)
        pop = float(pop_by_key.get(key, 0))
        a = area_km2(row["geometry"])
        density = pop / a if a > 0 else 0.0
        total_danger = danger_by_key.get(key, 0)
        exposed_flag = bool(total_danger > 0)

        total_pop += pop
        if exposed_flag:
            danger_pop += pop
            danger_munis.append((name, province, pop))

        rows_out.append(
            {
                "name": name,
                "province": province,
                "population_2020": round(pop, 1),
                "population_density": round(density, 2),
                "area_km2": round(a, 2),
                "total_danger_days_45y": total_danger,
                "exposed_flag": exposed_flag,
            }
        )

    # Write population.csv
    import csv

    POPULATION_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "name",
        "province",
        "population_2020",
        "population_density",
        "area_km2",
        "total_danger_days_45y",
        "exposed_flag",
    ]
    with open(POPULATION_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in rows_out:
            writer.writerow(r)

    # Update narratives.json with population block.
    with open(NARRATIVES_JSON, encoding="utf-8") as f:
        narratives = json.load(f)
    n_index = {(r["name"], r["province"]): r for r in narratives["municipalities"]}
    for r in rows_out:
        key = (r["name"], r["province"])
        if key in n_index:
            n_index[key]["population"] = {
                "pop_2020": r["population_2020"],
                "density": r["population_density"],
                "exposed": r["exposed_flag"],
            }
    Path(NARRATIVES_JSON).write_text(
        json.dumps(narratives, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    # Top 5 most populous danger municipalities.
    danger_munis.sort(key=lambda x: x[2], reverse=True)
    top5 = danger_munis[:5]
    pct = (danger_pop / total_pop * 100) if total_pop > 0 else 0.0

    print(
        f"POPULATION DONE | Total Bicol pop={total_pop:,.0f} | "
        f"Pop in danger-zone municipalities={danger_pop:,.0f} ({pct:.1f}%) | "
        f"Top 5 most populous danger cities: "
        + ", ".join(f"{n} ({p:,.0f})" for n, _, p in top5)
    )
    print(f"Wrote {POPULATION_CSV} ({len(rows_out)} municipalities).")
    print(f"Updated {NARRATIVES_JSON} with population block.")


if __name__ == "__main__":
    main()
