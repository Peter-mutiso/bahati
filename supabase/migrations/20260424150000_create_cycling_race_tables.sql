-- Create cycling_race_races table
CREATE TABLE IF NOT EXISTS public.cycling_race_races (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_number INTEGER NOT NULL DEFAULT 1,
  winner_cyclist INTEGER,
  race_duration INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing', 'betting', 'locking', 'racing', 'finished')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cycling_race_races ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycling_race_races' AND policyname='Anyone can view races') THEN
    CREATE POLICY "Anyone can view races" ON public.cycling_race_races FOR SELECT TO authenticated USING (true);
  END IF;
END;
$$;

-- Create cycling_race_bets table
CREATE TABLE IF NOT EXISTS public.cycling_race_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id UUID NOT NULL REFERENCES public.cycling_race_races(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cyclist_number INTEGER NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  potential_payout DECIMAL(10,2) NOT NULL DEFAULT 0,
  profit DECIMAL(10,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cycling_race_bets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycling_race_bets' AND policyname='Users can view their own bets') THEN
    CREATE POLICY "Users can view their own bets"
      ON public.cycling_race_bets FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycling_race_bets' AND policyname='Users can insert their own bets') THEN
    CREATE POLICY "Users can insert their own bets"
      ON public.cycling_race_bets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='cycling_race_bets' AND policyname='Admins can view all cycle bets') THEN
    CREATE POLICY "Admins can view all cycle bets"
      ON public.cycling_race_bets FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
  END IF;
END;
$$;

-- Ensure cycling_race_settings has a seed row
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.cycling_race_settings LIMIT 1) THEN
    INSERT INTO public.cycling_race_settings DEFAULT VALUES;
  END IF;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycling_race_races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycling_race_bets;

NOTIFY pgrst, 'reload schema';
