-- Ensure REPLICA IDENTITY FULL is set for game_rounds table
ALTER TABLE public.game_rounds REPLICA IDENTITY FULL;