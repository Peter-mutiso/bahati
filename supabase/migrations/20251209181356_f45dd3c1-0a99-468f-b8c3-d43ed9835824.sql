-- Add columns for hiding games and categories from homepage
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS hidden_games text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS hidden_categories text[] DEFAULT '{}';