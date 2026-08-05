-- Add all missing columns to cycling_race_settings that CycleRaceSettings.tsx expects

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='auto_rtp_enabled') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN auto_rtp_enabled BOOLEAN NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='rtp_mode') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN rtp_mode TEXT NOT NULL DEFAULT 'high';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='rtp_percentage') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN rtp_percentage DECIMAL(5,2) NOT NULL DEFAULT 95.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='house_edge') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN house_edge DECIMAL(5,2) NOT NULL DEFAULT 5.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='manual_winner_enabled') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN manual_winner_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='manual_winner_cyclist') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN manual_winner_cyclist INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='use_custom_odds') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN use_custom_odds BOOLEAN NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='cyclist_odds') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN cyclist_odds JSONB DEFAULT '[1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='cyclist_customization') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN cyclist_customization JSONB DEFAULT '[
      {"name":"Lightning","flag":"🇰🇪"},
      {"name":"Thunder","flag":"🇺🇸"},
      {"name":"Storm","flag":"🇬🇧"},
      {"name":"Blaze","flag":"🇯🇵"},
      {"name":"Flash","flag":"🇩🇪"},
      {"name":"Rocket","flag":"🇫🇷"},
      {"name":"Turbo","flag":"🇧🇷"},
      {"name":"Bolt","flag":"🇦🇺"},
      {"name":"Swift","flag":"🇨🇦"},
      {"name":"Arrow","flag":"🇰🇷"}
    ]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='min_bet') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN min_bet DECIMAL(10,2) NOT NULL DEFAULT 10.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='max_bet') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN max_bet DECIMAL(10,2) NOT NULL DEFAULT 10000.00;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='race_duration_seconds') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN race_duration_seconds INTEGER NOT NULL DEFAULT 30;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='betting_duration_seconds') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN betting_duration_seconds INTEGER NOT NULL DEFAULT 15;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='number_of_cyclists') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN number_of_cyclists INTEGER NOT NULL DEFAULT 6;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='updated_by') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN updated_by UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_settings' AND column_name='updated_at') THEN
    ALTER TABLE public.cycling_race_settings ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
