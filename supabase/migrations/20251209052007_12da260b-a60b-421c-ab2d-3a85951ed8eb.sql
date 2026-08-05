-- Add difficulty-specific multiplier/odds columns to chicken_road_settings
ALTER TABLE chicken_road_settings 
ADD COLUMN IF NOT EXISTS multiplier_easy NUMERIC NOT NULL DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS multiplier_medium NUMERIC NOT NULL DEFAULT 2.0,
ADD COLUMN IF NOT EXISTS multiplier_hard NUMERIC NOT NULL DEFAULT 3.0,
ADD COLUMN IF NOT EXISTS multiplier_expert NUMERIC NOT NULL DEFAULT 5.0;