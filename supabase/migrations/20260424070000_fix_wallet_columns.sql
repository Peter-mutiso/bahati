-- Fix wallets table: ensure wallet_cash and wallet_bonus columns exist
-- The original schema used a single 'balance' column; the app expects wallet_cash + wallet_bonus.

-- Add wallet_cash if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'wallet_cash'
  ) THEN
    ALTER TABLE public.wallets ADD COLUMN wallet_cash DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
END;
$$;

-- Add wallet_bonus if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'wallet_bonus'
  ) THEN
    ALTER TABLE public.wallets ADD COLUMN wallet_bonus DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
END;
$$;

-- Back-fill wallet_cash from the legacy 'balance' column if it exists and wallet_cash is still 0
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'wallets'
      AND column_name = 'balance'
  ) THEN
    UPDATE public.wallets
    SET wallet_cash = balance
    WHERE wallet_cash = 0 AND balance > 0;
  END IF;
END;
$$;

-- Notify PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
