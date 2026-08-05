-- Activate all hidden games by clearing the hidden_games array
UPDATE public.game_settings 
SET hidden_games = '{}';
