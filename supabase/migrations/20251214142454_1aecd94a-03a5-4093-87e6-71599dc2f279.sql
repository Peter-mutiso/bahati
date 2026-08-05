-- Add cyclist odds configuration to cycling_race_settings
ALTER TABLE public.cycling_race_settings 
ADD COLUMN IF NOT EXISTS cyclist_odds jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS use_custom_odds boolean DEFAULT false;

-- Update number_of_cyclists default to allow up to 10
ALTER TABLE public.cycling_race_settings 
ALTER COLUMN number_of_cyclists SET DEFAULT 6;

-- Add comment for clarity
COMMENT ON COLUMN public.cycling_race_settings.cyclist_odds IS 'Array of odds for each cyclist position, indexed by cyclist number (1-10)';
COMMENT ON COLUMN public.cycling_race_settings.use_custom_odds IS 'When true, use custom odds instead of auto-calculated odds';