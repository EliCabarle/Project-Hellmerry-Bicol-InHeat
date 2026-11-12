-- Supabase schema addition for the trend confidence interval and Pettitt change point.
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- calculate_trends.py -> generate_static_json.py -> push_to_supabase.py
--
-- slope_ci_low/high: 95% bounds of the Theil-Sen slope, in degrees Celsius per year.
-- change_point_year: first year of the regime the Pettitt test found.
-- change_point_p: Pettitt p for that split. Stored with the year on purpose - a
--   change-point year on its own reads as a finding even when p is 0.6.
-- Without these columns PostgREST rejects the upsert row and the push silently
-- fails per municipality (push_to_supabase.py catches and prints per row).
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS slope_ci_low DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS slope_ci_high DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS change_point_year INTEGER;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS change_point_p DOUBLE PRECISION;
