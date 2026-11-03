import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(dotenv_path=os.path.join(BASE_DIR, ".env"))

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

json_path = os.path.join(BASE_DIR, "output", "narratives.json")

with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

# Extract the actual list of municipalities
municipalities = data.get("municipalities", [])
print(f"Found {len(municipalities)} municipalities. Pushing to Supabase...")

success_count = 0

for city_data in municipalities:
    try:
        city_name = city_data.get("name")
        
        # Safely handle the null case for Masbate/Virac
        peak_year = city_data.get("peak_danger_days", {}).get("year")
        peak_days = city_data.get("peak_danger_days", {}).get("days", 0)
        
        record = {
            "name": city_name,
            "province": city_data.get("province", ""),
            "latitude": city_data.get("lat"),
            "longitude": city_data.get("lon"),
            
            "slope": city_data.get("trend", {}).get("slope"),
            "p_value": city_data.get("trend", {}).get("p_value"),
            "is_significant": city_data.get("trend", {}).get("is_significant"),
            
            "total_danger_days_45y": city_data.get("total_danger_days_45y", 0),
            "peak_danger_year": peak_year, 
            "peak_danger_days": peak_days,
            
            "narration_en": city_data.get("narration", {}).get("en"),
            "narration_fil": city_data.get("narration", {}).get("fil"),
            
            "series": city_data.get("series", []) 
        }

        supabase.table("municipality_trends").upsert(record, on_conflict="name").execute()
        print(f"✅ Uploaded {city_name}")
        success_count += 1
        
    except Exception as e:
        print(f"❌ Failed to upload {city_data.get('name', 'Unknown')}: {e}")

print(f"\n🎉 Successfully pushed {success_count}/{len(municipalities)} municipalities!")