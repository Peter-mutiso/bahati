-- Drop the existing check constraint on manual_winner_cyclist
ALTER TABLE public.cycling_race_settings DROP CONSTRAINT IF EXISTS cycling_race_settings_manual_winner_cyclist_check;

-- Add a new constraint that allows cyclists 1-10
ALTER TABLE public.cycling_race_settings ADD CONSTRAINT cycling_race_settings_manual_winner_cyclist_check CHECK (manual_winner_cyclist IS NULL OR (manual_winner_cyclist >= 1 AND manual_winner_cyclist <= 10));