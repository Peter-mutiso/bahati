-- Add bet button text option to chicken_road_settings
ALTER TABLE public.chicken_road_settings 
ADD COLUMN IF NOT EXISTS bet_button_text TEXT DEFAULT 'BET' CHECK (bet_button_text IN ('BET', 'PLAY', 'STAKE'));