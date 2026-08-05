-- Add website branding fields to game_settings
ALTER TABLE public.game_settings 
ADD COLUMN IF NOT EXISTS website_name TEXT DEFAULT 'Kuku Bahati',
ADD COLUMN IF NOT EXISTS website_logo_url TEXT DEFAULT NULL;