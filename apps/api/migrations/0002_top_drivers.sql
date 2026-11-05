-- Supabase schema additions for the RF/SHAP driver ranking.
-- Run once against the project database (SQL editor or `supabase db push`).

-- calculate_drivers.py -> output/drivers.json -> push_to_supabase.py
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS top_drivers JSONB;

-- Upserts must conflict on (name, province). 'Bato' and 'San Fernando' each exist
-- in two Region V provinces, so a name-only key silently merges/overwrites them.
-- Check for and drop any other unique index that is solely on name first:
--   SELECT indexname, indexdef FROM pg_indexes
--    WHERE tablename = 'municipality_trends';
ALTER TABLE municipality_trends DROP CONSTRAINT IF EXISTS municipality_trends_name_key;
CREATE UNIQUE INDEX IF NOT EXISTS municipality_trends_name_province_key
    ON municipality_trends (name, province);
