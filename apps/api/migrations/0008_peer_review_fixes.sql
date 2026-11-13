-- Supabase schema additions for peer-review fixes (statistical rigor, exposure, projection).
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- bootstrap_ci.py       -> output/trends.json (+ narratives.json) -> push_to_supabase.py
-- calculate_spatial_drivers.py -> output/spatial_drivers.json -> push_to_supabase.py
-- fetch_population.py   -> data/population.csv (+ narratives.json) -> push_to_supabase.py
-- forecast_2050.py / cmip6_projection.py -> output/forecast_2050.json -> push_to_supabase.py
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS slope_ci_bootstrap_low DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS slope_ci_bootstrap_high DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS significant_bootstrap BOOLEAN;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS spatial_r2_cv_mean DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS population_2020 BIGINT;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS population_density DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS exposed_flag BOOLEAN;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS cmip6_2050_ssp245_c DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS cmip6_2050_ssp585_c DOUBLE PRECISION;
