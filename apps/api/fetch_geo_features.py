"""Geographic driver features for the Random Forest / SHAP model (CONCEPT §6c-3).

Pulls three geographic features per Bicol municipality and joins them to the
114 municipalities in `apps/web/public/data/bicol-municipalities.geojson`:

  * elevation_m        - centroid elevation (Open-Elevation API, with the
                          `elevation` package as a fallback)
  * distance_to_coast_km - distance from centroid to the true Bicol coastline,
                           built via `shapely.ops.unary_union` of all 114
                           municipality polygons, then the exterior boundary of
                           that union. Internal borders dissolve away, so coastal
                           municipalities sit ~0 km and inland ones >0 km.
  * ndvi_mean          - mean NDVI over 2020-2024 from GEE MODIS MOD13Q1.

Writes `data/geo_features.csv` with columns:
  name, province, elevation_m, distance_to_coast_km, ndvi_mean

Usage:
  python fetch_geo_features.py
  python fetch_geo_features.py --geojson path/to/bicol-municipalities.geojson --out data/geo_features.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from shapely.geometry import shape
from shapely.ops import transform, unary_union
import pyproj

API_DIR = Path(__file__).resolve().parent
load_dotenv(API_DIR / ".env")

GEOJSON_PATH = (
    API_DIR.parent / "web" / "public" / "data" / "bicol-municipalities.geojson"
)
OUT_CSV = API_DIR / "data" / "geo_features.csv"

OPEN_ELEVATION_URL = "https://api.open-elevation.com/api/v1/lookup"
MOD13Q1_COLLECTION = "MODIS/061/MOD13Q1"
NDVI_START = "2020-01-01"
NDVI_END = "2024-12-31"
# MOD13Q1 native resolution is 250 m.
GEE_SCALE_M = 250


def _municipalities(geojson_path: Path) -> list[dict]:
    """Load features -> list of {name, province, geometry} dicts."""
    with open(geojson_path, encoding="utf-8") as gf:
        collection = json.load(gf)
    rows = []
    for feat in collection.get("features", []):
        props = feat.get("properties", {}) or {}
        name = props.get("adm3_en") or props.get("NAME_4") or "Unknown"
        province = props.get("province") or props.get("ADM1_EN") or "Unknown"
        rows.append(
            {"name": name, "province": province, "geometry": feat.get("geometry")}
        )
    if not rows:
        raise ValueError(f"❌ Found 0 municipalities in {geojson_path}")
    return rows


def _build_coastline(geometries: list[dict]):
    """True coastline of Bicol: exterior boundary of the union of all 114
    municipality polygons. Inland-internal borders dissolve into the union, so
    only the outer coast remains. Coastal municipalities will sit ~0 km from it,
    inland municipalities >0 km."""
    return unary_union([shape(g) for g in geometries]).boundary


def _distance_to_coast_km(centroid, coastline) -> float:
    """Distance (km) from a municipality centroid to the true Bicol coastline.

    Works in UTM zone 51N (covers the Philippines) so the result is real km.
    Falls back to a degrees->km approximation if pyproj is missing so one bad
    dependency never drops a municipality."""
    try:
        wgs84 = pyproj.CRS("EPSG:4326")
        utm = pyproj.CRS("EPSG:32651")
        project = pyproj.Transformer.from_crs(wgs84, utm, always_xy=True).transform
        centroid_utm = transform(project, centroid)
        coastline_utm = transform(project, coastline)
        distance_m = centroid_utm.distance(coastline_utm)
        return round(distance_m / 1000.0, 3)
    except Exception:
        # shortcut: degrees->km approximation, replace with pyproj UTM
        distance_deg = centroid.distance(coastline)
        return round(distance_deg * 111.0, 3)


def _elevation_m(lat: float, lon: float, session: requests.Session) -> float | None:
    """Centroid elevation in metres. Tries the `elevation` package, then the
    free Open-Elevation API. Returns None if both fail so one bad LGU
    does not abort the run."""
    # 1) elevation package (local SRTM cache, no network).
    try:
        import elevation  # type: ignore

        elev = elevation.elevation(lon, lat)
        if elev is not None:
            return round(float(elev), 1)
    except Exception:
        pass
    # 2) Open-Elevation public API.
    try:
        params = {"locations": f"{lat},{lon}"}
        response = session.get(
            OPEN_ELEVATION_URL, params=params, timeout=30
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        if results:
            return round(float(results[0].get("elevation")), 1)
    except Exception:
        pass
    return None


def _ndvi_mean(geom: dict) -> float | None:
    """Mean NDVI (MODIS MOD13Q1, 2020-2024) over the municipality via GEE."""
    try:
        import ee  # type: ignore

        collection = (
            ee.ImageCollection(MOD13Q1_COLLECTION)
            .filterDate(NDVI_START, NDVI_END)
            .select("NDVI")
        )
        mean_image = collection.mean()
        geom_ee = ee.Geometry(geom)
        result = (
            mean_image.reduceRegion(
                reducer=ee.Reducer.mean(),
                geometry=geom_ee,
                scale=GEE_SCALE_M,
                maxPixels=1e9,
            )
            .getInfo()
        )
        ndvi = result.get("NDVI")
        if ndvi is None:
            return None
        # MOD13Q1 NDVI is stored * 10000.
        return round(float(ndvi) / 10000.0, 4)
    except Exception as e:
        print(f"NDVI FAIL: {e}")
        return None


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--geojson", default=str(GEOJSON_PATH), help="input municipality GeoJSON"
    )
    parser.add_argument(
        "--out", default=str(OUT_CSV), help="output CSV path"
    )
    args = parser.parse_args()

    geojson_path = Path(args.geojson)
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = _municipalities(geojson_path)
    print(f"Loaded {len(rows)} municipalities from {geojson_path.name}")

    session = requests.Session()
    session.headers.update({"User-Agent": "Bicol In-Heat / fetch_geo_features"})

    # Build the true Bicol coastline once: union of all 114 polygons, then the
    # exterior boundary of that union. Internal borders dissolve away.
    coastline = _build_coastline([row["geometry"] for row in rows])

    # Initialize GEE once for all NDVI extractions (not per-municipality).
    # If auth/project fails, NDVI is simply None for every row; elevation and
    # coast distance still complete.
    try:
        import ee  # type: ignore

        ee.Initialize(project="verdant-ee-project")
    except Exception as e:
        print(f"GEE init failed: {e} — ndvi_mean will be None for all rows")

    fieldnames = [
        "name",
        "province",
        "elevation_m",
        "distance_to_coast_km",
        "ndvi_mean",
    ]
    written = 0
    with open(out, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for i, row in enumerate(rows, 1):
            name, province = row["name"], row["province"]
            geom = shape(row["geometry"])
            try:
                lon, lat = geom.centroid.x, geom.centroid.y
            except Exception as exc:
                print(f"[{i}/{len(rows)}] {name}|{province}: bad geometry: {exc}")
                continue

            elevation_m = _elevation_m(lat, lon, session)
            distance_km = _distance_to_coast_km(geom.centroid, coastline)
            ndvi = _ndvi_mean(row["geometry"])

            writer.writerow(
                {
                    "name": name,
                    "province": province,
                    "elevation_m": elevation_m,
                    "distance_to_coast_km": distance_km,
                    "ndvi_mean": ndvi,
                }
            )
            written += 1
            print(
                f"[{i}/{len(rows)}] {name:<18} {province:<16} "
                f"elev={elevation_m} coast_dist={distance_km}km ndvi={ndvi}"
            )
            # Be gentle with the public Open-Elevation API.
            time.sleep(0.2)

    print(f"wrote {written} municipalities -> {out}")


if __name__ == "__main__":
    main()
