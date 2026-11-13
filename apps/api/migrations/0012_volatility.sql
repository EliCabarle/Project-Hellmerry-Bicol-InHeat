-- Volatility Engine columns (peer-review audit: climate instability metrics).
-- volatility_analysis.py        -> output/volatility_analysis.json -> push_to_supabase.py
-- volatility_attribution.py     -> output/volatility_attribution.json -> push_to_supabase.py
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS annual_peak_std DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS danger_days_var DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS p99_p50_gap DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS vol_trend_slope DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS vol_trend_p_value DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS vol_trend_significant BOOLEAN,
ADD COLUMN IF NOT EXISTS vol_trend_direction VARCHAR(16);
