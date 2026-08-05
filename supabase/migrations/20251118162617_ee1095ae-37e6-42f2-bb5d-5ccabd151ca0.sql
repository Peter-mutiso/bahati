-- Add payment method configuration to game_settings
ALTER TABLE game_settings
ADD COLUMN IF NOT EXISTS upi_method_name text DEFAULT 'UPI',
ADD COLUMN IF NOT EXISTS upi_id text DEFAULT 'crashx@upi',
ADD COLUMN IF NOT EXISTS upi_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS usdt_method_name text DEFAULT 'USDT',
ADD COLUMN IF NOT EXISTS usdt_address text DEFAULT 'TXYZabc123example',
ADD COLUMN IF NOT EXISTS usdt_enabled boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS usdt_conversion_rate numeric DEFAULT 80.00,
ADD COLUMN IF NOT EXISTS show_utr_number boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS show_wallet_address boolean DEFAULT true;