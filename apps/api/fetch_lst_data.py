"""
Mean MODIS LST (2020-2024) for every Bicol municipality centroid.

GEE may rate-limit or time out: municipalities are processed in chunks of 20,
with a pause between chunks and up to 3 attempts per chunk. If it still fails,
re-run or lower CHUNK_SIZE.

Run from apps/api:  python fetch_lst_data.py
Writes: apps/api/data/lst_means.csv
"""

import json
import time
from pathlib import Path

import ee
import pandas as pd

GEE_PROJECT = "verdant-ee-project"  # same Earth Engine project as the Verdant scripts
START_DATE = "2020-01-01"
END_DATE = "2024-12-31"
CHUNK_SIZE = 20
SCALE_M = 1000  # MOD11A2 native resolution

BASE_DIR = Path(__file__).resolve().parent
GEOJSON_PATH = BASE_DIR.parent / "web/public/data/bicol-municipalities.geojson"
OUT_PATH = BASE_DIR / "data/lst_means.csv"


def mean_lst_image():
    ee.Initialize(project=GEE_PROJECT)

    def to_celsius(img):
        raw = img.select("LST_Day_1km")
        # DN 0 is fill/no-data; mask it so it does not drag the mean down.
        return raw.multiply(0.02).subtract(273.15).updateMask(raw.gt(0))

    return (
        ee.ImageCollection("MODIS/061/MOD11A2")
        .filterDate(START_DATE, END_DATE)
        .map(to_celsius)
        .mean()
    )


def load_centroids():
    with open(GEOJSON_PATH, encoding="utf-8") as f:
        features = json.load(f)["features"]
    return [
        ee.Feature(
            ee.Geometry(f["geometry"]).centroid(1),
            {
                "name": f["properties"]["adm3_en"],
                "province": f["properties"]["province"],
            },
        )
        for f in features
    ]


def reduce_chunk(image, chunk, attempt=1):
    try:
        return image.reduceRegions(
            collection=ee.FeatureCollection(chunk),
            reducer=ee.Reducer.mean(),
            scale=SCALE_M,
        ).getInfo()["features"]
    except Exception as exc:
        if attempt >= 3:
            raise
        print(f"    chunk failed ({exc}); retry {attempt} in 60s")
        time.sleep(60)
        return reduce_chunk(image, chunk, attempt + 1)


def main():
    image = mean_lst_image()
    centroids = load_centroids()
    print(f"Computing mean LST for {len(centroids)} municipalities...")

    rows = []
    for i in range(0, len(centroids), CHUNK_SIZE):
        chunk = centroids[i : i + CHUNK_SIZE]
        print(f"  chunk {i // CHUNK_SIZE + 1}: rows {i}-{i + len(chunk) - 1}")
        for feat in reduce_chunk(image, chunk):
            props = feat["properties"]
            lon, lat = feat["geometry"]["coordinates"]
            mean = props.get("mean")
            rows.append(
                {
                    "name": props["name"],
                    "province": props["province"],
                    "lat": round(lat, 5),
                    "lon": round(lon, 5),
                    "lst_mean_c": None if mean is None else round(mean, 2),
                }
            )
        time.sleep(2)

    df = pd.DataFrame(rows, columns=["name", "province", "lat", "lon", "lst_mean_c"])
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    print(f"Saved {len(df)} rows to {OUT_PATH} ({df['lst_mean_c'].isna().sum()} without data)")

    # Sanity check on the 0.02 scale factor: Bicol LST means live around 20-35 C.
    vals = df["lst_mean_c"].dropna()
    if ((vals < -20) | (vals > 70)).any():
        print(
            "WARNING: values outside -20..70 C. Earth Engine may already apply the "
            "0.02 scale factor, making the multiply double-count it - check before using."
        )


if __name__ == "__main__":
    main()
