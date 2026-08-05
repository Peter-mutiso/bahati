-- Add lane count columns for each difficulty
ALTER TABLE public.chicken_road_settings
ADD COLUMN IF NOT EXISTS lanes_easy integer NOT NULL DEFAULT 30,
ADD COLUMN IF NOT EXISTS lanes_medium integer NOT NULL DEFAULT 25,
ADD COLUMN IF NOT EXISTS lanes_hard integer NOT NULL DEFAULT 22,
ADD COLUMN IF NOT EXISTS lanes_expert integer NOT NULL DEFAULT 18;