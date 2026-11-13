-- Supabase schema additions for backtesting, 2050 forecasting, and FDR correction.
-- Run once against the project database (SQL editor - there is no migrations CLI).
--
-- backtest_model.py    -> output/backtest_results.json   -> push_to_supabase.py
-- forecast_2050.py     -> output/forecast_2050.json      -> push_to_supabase.py
-- fdr_correction.py    -> output/trends.json (+ narratives.json) -> push_to_supabase.py
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS backtest_rmse DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS backtest_mae DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS forecast_2050_central_c DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS forecast_2050_low_c DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS forecast_2050_high_c DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS forecast_2050_danger_days INTEGER;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS p_value_fdr DOUBLE PRECISION;
ALTER TABLE municipality_trends ADD COLUMN IF NOT EXISTS significant_fdr BOOLEAN;
