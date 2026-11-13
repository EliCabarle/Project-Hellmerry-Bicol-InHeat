-- Final statistical columns for peer-review completeness (Moran's I / LISA).
-- Run once against the project database (SQL editor - there is no migrations CLI).
-- morans_i.py        -> output/morans_i.json -> push_to_supabase.py
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS morans_i_local DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lisa_cluster VARCHAR(4);
