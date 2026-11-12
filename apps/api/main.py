from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Bicol In-Heat API",
    description="Backend API for Bicol In-Heat (2026 NASA Space Apps Challenge)",
    version="0.1.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class MunicipalityLocation(BaseModel):
    id: int
    name: str
    province: str
    lat: float
    lon: float
    elevation: float
    coast_dist_km: float

class ClimateAnomaly(BaseModel):
    municipality_id: int
    name: str
    year: int
    heat_index: float
    anomaly: float
    significant: bool = True
    sample_count: int = 365

class VerdantFeature(BaseModel):
    municipality_id: int
    name: str
    canopy_cover_pct: float
    lst_mean: float
    driver_rank_primary: str
    shap_value: float

@app.get("/")
def read_root():
    return {"status": "online", "project": "Bicol In-Heat", "challenge": "Be An Earth System Trend Detective!"}

@app.get("/locations", response_model=List[MunicipalityLocation])
def get_locations():
    """Returns Bicol municipalities with clean Lat/Lon coordinates."""
    return [
        {"id": 1, "name": "Legazpi City", "province": "Albay", "lat": 13.1391, "lon": 123.7437, "elevation": 15.0, "coast_dist_km": 1.2},
        {"id": 2, "name": "Naga City", "province": "Camarines Sur", "lat": 13.6218, "lon": 123.1948, "elevation": 12.0, "coast_dist_km": 18.5},
        {"id": 3, "name": "Iriga City", "province": "Camarines Sur", "lat": 13.4191, "lon": 123.4158, "elevation": 85.0, "coast_dist_km": 24.1},
        {"id": 4, "name": "Sorsogon City", "province": "Sorsogon", "lat": 12.9722, "lon": 124.0050, "elevation": 8.0, "coast_dist_km": 0.8},
        {"id": 5, "name": "Virac", "province": "Catanduanes", "lat": 13.5786, "lon": 124.2332, "elevation": 45.0, "coast_dist_km": 2.3},
        {"id": 6, "name": "Daet", "province": "Camarines Norte", "lat": 14.1136, "lon": 122.9567, "elevation": 10.0, "coast_dist_km": 3.5},
        {"id": 7, "name": "Masbate City", "province": "Masbate", "lat": 12.3653, "lon": 123.6225, "elevation": 14.0, "coast_dist_km": 0.5}
    ]

@app.get("/anomalies", response_model=List[dict])
def get_anomalies(year: Optional[int] = 2025):
    """Returns heat index trends and anomalies per municipality."""
    return [
        {"municipality_id": 1, "name": "Legazpi City", "year": year, "heat_index": 43.5, "anomaly": +3.2, "significant": True, "sample_count": 360},
        {"municipality_id": 2, "name": "Naga City", "year": year, "heat_index": 45.1, "anomaly": +4.0, "significant": True, "sample_count": 365},
        {"municipality_id": 3, "name": "Iriga City", "year": year, "heat_index": 41.2, "anomaly": +2.1, "significant": False, "sample_count": 358},
        {"municipality_id": 4, "name": "Sorsogon City", "year": year, "heat_index": 42.8, "anomaly": +2.9, "significant": True, "sample_count": 362},
        {"municipality_id": 5, "name": "Virac", "year": year, "heat_index": 39.5, "anomaly": +1.5, "significant": False, "sample_count": 340},
        {"municipality_id": 6, "name": "Daet", "year": year, "heat_index": 43.0, "anomaly": +3.1, "significant": True, "sample_count": 355},
        {"municipality_id": 7, "name": "Masbate City", "year": year, "heat_index": 44.2, "anomaly": +3.8, "significant": True, "sample_count": 365}
    ]

@app.get("/verdant", response_model=List[dict])
def get_verdant():
    """Returns canopy cover, LST, and driver rankings (RF/SHAP) for vegetation & urban heat analysis."""
    return [
        {"municipality_id": 1, "name": "Legazpi City", "canopy_cover_pct": 22.4, "lst_mean": 38.2, "driver_rank_primary": "Low Canopy Cover", "shap_value": 0.42},
        {"municipality_id": 2, "name": "Naga City", "canopy_cover_pct": 15.1, "lst_mean": 40.5, "driver_rank_primary": "Urban Built Density", "shap_value": 0.58},
        {"municipality_id": 3, "name": "Iriga City", "canopy_cover_pct": 34.2, "lst_mean": 35.1, "driver_rank_primary": "Elevation Buffering", "shap_value": 0.28},
        {"municipality_id": 4, "name": "Sorsogon City", "canopy_cover_pct": 28.0, "lst_mean": 37.0, "driver_rank_primary": "Coastal Wind Exposure", "shap_value": 0.35},
        {"municipality_id": 5, "name": "Virac", "canopy_cover_pct": 45.0, "lst_mean": 33.4, "driver_rank_primary": "Oceanic Breezes", "shap_value": 0.19},
        {"municipality_id": 6, "name": "Daet", "canopy_cover_pct": 25.6, "lst_mean": 37.8, "driver_rank_primary": "Low Canopy Cover", "shap_value": 0.39},
        {"municipality_id": 7, "name": "Masbate City", "canopy_cover_pct": 18.2, "lst_mean": 39.9, "driver_rank_primary": "Urban Built Density", "shap_value": 0.51}
    ]
