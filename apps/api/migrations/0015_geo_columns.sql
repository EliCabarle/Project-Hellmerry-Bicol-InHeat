-- Geographic driver columns for municipality_trends.
-- Adds LST, NDVI, elevation, and distance to coast as top-level columns.
-- geo_features.csv        -> output/geo_features.json -> push_to_supabase.py
-- lst_means.csv           -> LST_BY_KEY -> push_to_supabase.py
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS lst_mean_c DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ndvi_mean DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS elevation_m DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS distance_to_coast_km DOUBLE PRECISION;
