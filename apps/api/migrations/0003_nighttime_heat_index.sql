-- Supabase schema additions for the nighttime heat index.
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- calculate_trends.py -> output/trends.json -> generate_static_json.py
--   -> output/narratives.json -> push_to_supabase.py
--
-- Both columns hold the latest year's annual mean of the daily values, i.e. what
-- narratives.json `latest` carries. heat_index_max_c is built from T2M_MAX,
-- nighttime_heat_index_c from T2M_MIN, both with RH derived from T2MDEW.
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS heat_index_max_c DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS nighttime_heat_index_c DOUBLE PRECISION;
