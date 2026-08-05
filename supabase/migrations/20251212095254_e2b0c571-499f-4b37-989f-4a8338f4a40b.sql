-- Add per-lane odds columns for each difficulty level
-- Stored as JSONB arrays where index = lane number, value = multiplier for that lane
ALTER TABLE public.chicken_road_settings
ADD COLUMN IF NOT EXISTS lane_odds_easy JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lane_odds_medium JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lane_odds_hard JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS lane_odds_expert JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS use_custom_lane_odds BOOLEAN DEFAULT false;