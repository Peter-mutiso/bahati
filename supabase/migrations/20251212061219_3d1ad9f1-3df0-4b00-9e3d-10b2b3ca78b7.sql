-- Add BTC payment method fields to game_settings
ALTER TABLE public.game_settings
ADD COLUMN IF NOT EXISTS btc_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS btc_method_name text DEFAULT 'BTC'::text,
ADD COLUMN IF NOT EXISTS btc_address text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS btc_qr_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS btc_qr_url text DEFAULT NULL;