-- Add minimum and maximum deposit limits to game_settings
ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS min_deposit numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS max_deposit numeric DEFAULT 100000;