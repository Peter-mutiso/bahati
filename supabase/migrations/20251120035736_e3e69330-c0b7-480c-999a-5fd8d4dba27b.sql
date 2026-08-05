-- Add manual_crash_points array column and drop the single manual_crash_point column
ALTER TABLE public.game_settings 
  ADD COLUMN IF NOT EXISTS manual_crash_points numeric[] DEFAULT '{}';

-- Migrate existing manual_crash_point data to array if it exists
UPDATE public.game_settings 
SET manual_crash_points = ARRAY[manual_crash_point]
WHERE manual_crash_point IS NOT NULL AND use_manual_crash_point = true;

-- Drop the old column
ALTER TABLE public.game_settings 
  DROP COLUMN IF EXISTS manual_crash_point;