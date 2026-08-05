-- Add loan feature toggle to game_settings
ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS loan_feature_enabled boolean DEFAULT true;