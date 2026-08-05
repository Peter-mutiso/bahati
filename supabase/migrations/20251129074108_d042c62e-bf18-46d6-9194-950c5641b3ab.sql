-- Insert default wingo settings if not exists
INSERT INTO wingo_settings (
  id,
  min_bet,
  max_bet,
  betting_duration_seconds,
  result_duration_seconds,
  house_edge,
  rtp_percentage,
  rtp_mode,
  auto_rtp_enabled,
  manual_result_enabled,
  red_multiplier,
  green_multiplier,
  violet_multiplier
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  10,
  10000,
  30,
  5,
  3,
  97,
  'auto',
  true,
  false,
  2.0,
  4.5,
  2.0
)
ON CONFLICT (id) DO NOTHING;