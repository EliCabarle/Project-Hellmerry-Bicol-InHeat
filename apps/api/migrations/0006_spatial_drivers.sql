-- Supabase schema addition for spatial driver analysis.
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- calculate_spatial_drivers.py -> output/spatial_drivers.json -> push_to_supabase.py
--
-- Per-municipality geographic driver importances (mean |SHAP|) explaining the
-- 45-year warming-trend variance across Bicol. Stored as JSONB so the web UI
-- can render which feature (elevation, distance-to-coast, NDVI, wind) drives
-- each municipality's warming trend. Association only, not causation.
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS spatial_drivers JSONB;
