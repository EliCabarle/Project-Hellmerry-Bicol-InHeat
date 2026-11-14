-- Person-Days of Danger columns (LGU-facing public health prioritization metric).
-- person_days_danger.py -> output/person_days_danger.json -> push_to_supabase.py
-- merge into narratives.json -> push_to_supabase.py
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS person_days_danger BIGINT,
ADD COLUMN IF NOT EXISTS person_days_density DOUBLE PRECISION;
