-- Add cyclist_customization column to store custom names and flags
ALTER TABLE public.cycling_race_settings
ADD COLUMN cyclist_customization JSONB DEFAULT '[]'::jsonb;