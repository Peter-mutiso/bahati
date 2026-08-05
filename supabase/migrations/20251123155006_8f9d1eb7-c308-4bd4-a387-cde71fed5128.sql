-- Update check constraint to allow RTP from 30% to 99%
ALTER TABLE game_settings DROP CONSTRAINT IF EXISTS game_settings_rtp_percentage_check;

ALTER TABLE game_settings 
ADD CONSTRAINT game_settings_rtp_percentage_check 
CHECK (rtp_percentage >= 30 AND rtp_percentage <= 99);

-- Update check constraint for plinko_settings as well
ALTER TABLE plinko_settings DROP CONSTRAINT IF EXISTS plinko_settings_rtp_percentage_check;

ALTER TABLE plinko_settings 
ADD CONSTRAINT plinko_settings_rtp_percentage_check 
CHECK (rtp_percentage >= 30 AND rtp_percentage <= 99);