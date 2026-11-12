-- Supabase schema addition for MODIS land-surface temperature.
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- fetch_lst_data.py -> data/lst_means.csv -> push_to_supabase.py
--
-- Per-municipality 2020-2024 mean LST at the polygon centroid, in Celsius.
-- LST is satellite skin temperature, not air temperature: it is much hotter than
-- heat_index_max_c and the two must not be presented as the same quantity.
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS lst_mean_c DOUBLE PRECISION;
