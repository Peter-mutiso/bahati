-- Add withdrawals_enabled toggle to game_settings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='withdrawals_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN withdrawals_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
