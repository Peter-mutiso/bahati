-- Add game_type column to game_rounds to differentiate between Crash and Coin Train
ALTER TABLE public.game_rounds ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'crash';

-- Update existing records to be crash type
UPDATE public.game_rounds SET game_type = 'crash' WHERE game_type IS NULL;