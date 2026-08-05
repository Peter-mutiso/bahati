-- Add wager_requirement_enabled column to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS wager_requirement_enabled boolean DEFAULT true;