-- Create offer_rains table
CREATE TABLE IF NOT EXISTS public.offer_rains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pot_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  max_claimers INTEGER NOT NULL DEFAULT 1,
  amount_per_person DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  claimed_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.offer_rains ENABLE ROW LEVEL SECURITY;

-- Create offer_rain_claims table to track who claimed
CREATE TABLE IF NOT EXISTS public.offer_rain_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rain_id UUID NOT NULL REFERENCES public.offer_rains(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(rain_id, user_id)
);

ALTER TABLE public.offer_rain_claims ENABLE ROW LEVEL SECURITY;

-- RLS Policies for offer_rains
DO $$
BEGIN
  -- Everyone (authenticated) can view active rains
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rains' AND policyname = 'Anyone can view offer rains') THEN
    CREATE POLICY "Anyone can view offer rains"
      ON public.offer_rains FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  -- Admins can insert rains
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rains' AND policyname = 'Admins can insert offer rains') THEN
    CREATE POLICY "Admins can insert offer rains"
      ON public.offer_rains FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  -- Admins can update rains
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rains' AND policyname = 'Admins can update offer rains') THEN
    CREATE POLICY "Admins can update offer rains"
      ON public.offer_rains FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;

  -- Admins can delete rains
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rains' AND policyname = 'Admins can delete offer rains') THEN
    CREATE POLICY "Admins can delete offer rains"
      ON public.offer_rains FOR DELETE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

-- RLS Policies for offer_rain_claims
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rain_claims' AND policyname = 'Users can view their own claims') THEN
    CREATE POLICY "Users can view their own claims"
      ON public.offer_rain_claims FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rain_claims' AND policyname = 'Users can claim rains') THEN
    CREATE POLICY "Users can claim rains"
      ON public.offer_rain_claims FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'offer_rain_claims' AND policyname = 'Admins can view all claims') THEN
    CREATE POLICY "Admins can view all claims"
      ON public.offer_rain_claims FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
      );
  END IF;
END;
$$;

-- Enable realtime for offer_rains
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_rains;

NOTIFY pgrst, 'reload schema';
