-- ENSO / ONI correlation columns (peer-review audit: global context).
-- enso_correlation.py -> output/enso_results.json -> push_to_supabase.py
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS enso_heat_correlation DOUBLE PRECISION;
