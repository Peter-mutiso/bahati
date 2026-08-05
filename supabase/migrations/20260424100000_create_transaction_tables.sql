-- Create wallet_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'cash',
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_transactions' AND policyname = 'Users can view their own wallet transactions'
  ) THEN
    CREATE POLICY "Users can view their own wallet transactions"
      ON public.wallet_transactions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallet_transactions' AND policyname = 'System can insert wallet transactions'
  ) THEN
    CREATE POLICY "System can insert wallet transactions"
      ON public.wallet_transactions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END;
$$;

-- Create commission_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  commission_type TEXT NOT NULL DEFAULT 'referral',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'commission_transactions' AND policyname = 'Users can view their own commission transactions'
  ) THEN
    CREATE POLICY "Users can view their own commission transactions"
      ON public.commission_transactions FOR SELECT
      USING (auth.uid() = referrer_id);
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
