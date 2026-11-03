import json
import urllib.request
import zipfile
import io
from pathlib import Path

# 1. Setup paths and constants
ZIP_URL = "https://github.com/faeldon/philippines-json-maps/releases/latest/download/geojson-lowres.zip"
PROVDIST_DIR = "geojson/provdists/lowres/"

# Correct 9-digit PSGC codes for Bicol provinces
PROVINCES = {
    500500000: "Albay",
    501600000: "Camarines Norte",
    501700000: "Camarines Sur",
    502000000: "Catanduanes",
    504100000: "Masbate",
    506200000: "Sorsogon"
}

OUT_PATH = Path(__file__).resolve().parent.parent / "web/public/data/bicol-municipalities.geojson"
OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

# The exact fix for the integer matching issue
def in_region_v(props):
    # pads integer 500000000 to string "0500000000" and checks if it starts with "05"
    return str(props.get("adm1_psgc", "")).zfill(10).startswith("05")

print("1. Downloading the 4.9 MB geoBoundaries zip...")
req = urllib.request.Request(ZIP_URL, headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req) as response:
    zip_data = response.read()

print("2. Extracting and filtering municipalities...")
all_features = []
seen_codes = set()

with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
    for name in z.namelist():
        if name.startswith(PROVDIST_DIR) and name.endswith(".json"):
            with z.open(name) as f:
                data = json.load(f)
                for feature in data.get("features", []):
                    props = feature.get("properties", {})
                    
                    if in_region_v(props):
                        # Deduplicate by adm3_psgc
                        adm3_code = props.get("adm3_psgc")
                        if adm3_code not in seen_codes:
                            seen_codes.add(adm3_code)
                            
                            # Add the province name for the frontend
                            adm2_code = props.get("adm2_psgc")
                            props["province"] = PROVINCES.get(adm2_code, "Unknown")
                            
                            all_features.append(feature)

# 3. Fail loudly if something went wrong
if len(all_features) == 0:
    raise ValueError("❌ Failed! Found 0 municipalities. The filter logic failed.")

print(f"✅ Found {len(all_features)} Bicol municipalities.")

# 4. Save to the web folder
final_geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "source": "faeldon/philippines-json-maps",
        "region": "Bicol (Region V)",
        "count": len(all_features)
    },
    "features": all_features
}

with open(OUT_PATH, "w", encoding="utf-8") as f:
    json.dump(final_geojson, f, ensure_ascii=False, separators=(",", ":"))

print(f"🎉 Saved to: {OUT_PATH}")