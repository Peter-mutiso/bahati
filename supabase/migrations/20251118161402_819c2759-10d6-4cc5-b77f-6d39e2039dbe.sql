-- Add favicon_url column to game_settings table
ALTER TABLE game_settings 
ADD COLUMN favicon_url text;