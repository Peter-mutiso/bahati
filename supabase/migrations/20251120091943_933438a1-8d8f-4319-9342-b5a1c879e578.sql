-- Add color customization columns to game_settings table
ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '187 100% 50%',
ADD COLUMN IF NOT EXISTS secondary_color TEXT DEFAULT '266 100% 65%',
ADD COLUMN IF NOT EXISTS background_color TEXT DEFAULT '220 25% 8%',
ADD COLUMN IF NOT EXISTS accent_color TEXT DEFAULT '187 100% 50%';