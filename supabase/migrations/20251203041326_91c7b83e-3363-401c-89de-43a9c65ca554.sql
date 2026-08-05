-- Add signup bonus column to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS signup_bonus_amount numeric DEFAULT 0;