-- Add precipitation (Earth-system variable) columns to municipality_trends
ALTER TABLE municipality_trends
ADD COLUMN IF NOT EXISTS annual_precip_mm_2024 DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS precip_heat_index_corr_2024 DOUBLE PRECISION;
