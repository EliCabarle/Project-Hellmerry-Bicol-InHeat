import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY") or os.getenv("VITE_SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Supabase URL and Key must be set in environment variables.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

BICOL_MUNICIPALITIES = [
    {
        "name": "Legazpi City",
        "province": "Albay",
        "psgc_code": "050503000",
        "elevation": 15.0,
        "coast_dist_km": 1.2
    },
    {
        "name": "Naga City",
        "province": "Camarines Sur",
        "psgc_code": "051724000",
        "elevation": 12.0,
        "coast_dist_km": 18.5
    },
    {
        "name": "Iriga City",
        "province": "Camarines Sur",
        "psgc_code": "051717000",
        "elevation": 85.0,
        "coast_dist_km": 24.1
    },
    {
        "name": "Sorsogon City",
        "province": "Sorsogon",
        "psgc_code": "056216000",
        "elevation": 8.0,
        "coast_dist_km": 0.8
    },
    {
        "name": "Virac",
        "province": "Catanduanes",
        "psgc_code": "052009000",
        "elevation": 45.0,
        "coast_dist_km": 2.3
    },
    {
        "name": "Daet",
        "province": "Camarines Norte",
        "psgc_code": "051602000",
        "elevation": 10.0,
        "coast_dist_km": 3.5
    },
    {
        "name": "Masbate City",
        "province": "Masbate",
        "psgc_code": "054105000",
        "elevation": 14.0,
        "coast_dist_km": 0.5
    }
]

def seed_database():
    print(f"Seeding {len(BICOL_MUNICIPALITIES)} Bicol municipalities into Supabase...")
    
    for muni in BICOL_MUNICIPALITIES:
        # Check if already exists
        existing = supabase.table("municipalities").select("id").eq("name", muni["name"]).execute()
        if existing.data and len(existing.data) > 0:
            print(f" - {muni['name']} already exists. Skipping.")
            continue
            
        res = supabase.table("municipalities").insert(muni).execute()
        print(f" + Inserted: {muni['name']} ({muni['province']})")

    print("Seeding complete!")

if __name__ == "__main__":
    seed_database()
