-- Add manual crash point control to game settings
ALTER TABLE public.game_settings
ADD COLUMN manual_crash_point numeric,
ADD COLUMN use_manual_crash_point boolean DEFAULT false;

COMMENT ON COLUMN public.game_settings.manual_crash_point IS 'Manually set crash point for the next round';
COMMENT ON COLUMN public.game_settings.use_manual_crash_point IS 'Whether to use the manual crash point for the next round';