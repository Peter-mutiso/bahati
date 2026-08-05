-- Add theme_name column to game_settings for storing selected theme
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS theme_name TEXT DEFAULT 'cyber-neon';