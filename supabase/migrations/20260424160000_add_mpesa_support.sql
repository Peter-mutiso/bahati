-- Add M-Pesa support to game_settings and transactions tables

-- game_settings: add mpesa toggle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='mpesa_enabled') THEN
    ALTER TABLE public.game_settings ADD COLUMN mpesa_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='game_settings' AND column_name='mpesa_shortcode') THEN
    ALTER TABLE public.game_settings ADD COLUMN mpesa_shortcode TEXT DEFAULT '4147265';
  END IF;
END;
$$;

-- transactions: add M-Pesa specific fields
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='mpesa_checkout_request_id') THEN
    ALTER TABLE public.transactions ADD COLUMN mpesa_checkout_request_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='mpesa_receipt') THEN
    ALTER TABLE public.transactions ADD COLUMN mpesa_receipt TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='phone_number') THEN
    ALTER TABLE public.transactions ADD COLUMN phone_number TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='transactions' AND column_name='mpesa_conversation_id') THEN
    ALTER TABLE public.transactions ADD COLUMN mpesa_conversation_id TEXT;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
