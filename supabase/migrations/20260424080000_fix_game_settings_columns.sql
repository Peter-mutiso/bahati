-- Fix game_settings table: ensure all columns referenced by WebsiteSettings.tsx exist.
-- Each ALTER is guarded with IF NOT EXISTS to be idempotent.

DO $$
BEGIN
  -- website branding
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='website_name') THEN
    ALTER TABLE public.game_settings ADD COLUMN website_name TEXT DEFAULT 'Kuku Bahati';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='website_logo_url') THEN
    ALTER TABLE public.game_settings ADD COLUMN website_logo_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='favicon_url') THEN
    ALTER TABLE public.game_settings ADD COLUMN favicon_url TEXT;
  END IF;

  -- UPI payment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='upi_method_name') THEN
    ALTER TABLE public.game_settings ADD COLUMN upi_method_name TEXT DEFAULT 'UPI';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='upi_id') THEN
    ALTER TABLE public.game_settings ADD COLUMN upi_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='upi_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN upi_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='upi_qr_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN upi_qr_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='upi_qr_url') THEN
    ALTER TABLE public.game_settings ADD COLUMN upi_qr_url TEXT;
  END IF;

  -- USDT payment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_method_name') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_method_name TEXT DEFAULT 'USDT';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_address') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_enabled BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_qr_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_qr_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_qr_url') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_qr_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='usdt_conversion_rate') THEN
    ALTER TABLE public.game_settings ADD COLUMN usdt_conversion_rate DECIMAL(10,2) DEFAULT 80;
  END IF;

  -- BTC payment
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='btc_method_name') THEN
    ALTER TABLE public.game_settings ADD COLUMN btc_method_name TEXT DEFAULT 'BTC';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='btc_address') THEN
    ALTER TABLE public.game_settings ADD COLUMN btc_address TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='btc_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN btc_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='btc_qr_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN btc_qr_enabled BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='btc_qr_url') THEN
    ALTER TABLE public.game_settings ADD COLUMN btc_qr_url TEXT;
  END IF;

  -- Transaction settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='show_utr_number') THEN
    ALTER TABLE public.game_settings ADD COLUMN show_utr_number BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='show_wallet_address') THEN
    ALTER TABLE public.game_settings ADD COLUMN show_wallet_address BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='min_deposit') THEN
    ALTER TABLE public.game_settings ADD COLUMN min_deposit DECIMAL(10,2) DEFAULT 10;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='max_deposit') THEN
    ALTER TABLE public.game_settings ADD COLUMN max_deposit DECIMAL(10,2) DEFAULT 100000;
  END IF;

  -- Features
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='loan_feature_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN loan_feature_enabled BOOLEAN DEFAULT true;
  END IF;

  -- Theme
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='theme_name') THEN
    ALTER TABLE public.game_settings ADD COLUMN theme_name TEXT DEFAULT 'neon-cyan';
  END IF;

  -- custom_themes table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='custom_themes') THEN
    CREATE TABLE public.custom_themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      mode TEXT NOT NULL DEFAULT 'dark',
      preview JSONB NOT NULL DEFAULT '{}'::jsonb,
      colors JSONB NOT NULL DEFAULT '{}'::jsonb,
      gradients JSONB NOT NULL DEFAULT '{}'::jsonb,
      shadows JSONB NOT NULL DEFAULT '{}'::jsonb,
      radius TEXT DEFAULT '0.5rem',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Admins can manage custom themes"
      ON public.custom_themes
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
