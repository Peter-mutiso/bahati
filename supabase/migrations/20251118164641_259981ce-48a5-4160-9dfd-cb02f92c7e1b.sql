-- Add QR code configuration and currency settings to game_settings
ALTER TABLE game_settings
ADD COLUMN IF NOT EXISTS upi_qr_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS upi_qr_url text,
ADD COLUMN IF NOT EXISTS usdt_qr_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS usdt_qr_url text;