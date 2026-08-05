-- ============================================================
-- COMPLETE DATABASE SCHEMA EXPORT
-- Kuku Bahati Gaming Platform
-- Generated: 2024-12-13
-- ============================================================

-- ============================================================
-- PART 1: CUSTOM ENUM TYPES
-- ============================================================

CREATE TYPE app_role AS ENUM ('admin', 'user');

-- ============================================================
-- PART 2: TABLE DEFINITIONS
-- ============================================================

-- 1. PROFILES TABLE
CREATE TABLE public.profiles (
  id uuid NOT NULL PRIMARY KEY,
  email text NOT NULL,
  username text NULL,
  avatar_url text NULL,
  pin text NULL,
  currency_code text NULL DEFAULT 'USD'::text,
  currency_symbol text NULL DEFAULT '$'::text,
  vip_tier_id uuid NULL,
  total_deposited numeric NOT NULL DEFAULT 0,
  is_banned boolean NOT NULL DEFAULT false,
  banned_at timestamp with time zone NULL,
  support_banned boolean NULL DEFAULT false,
  support_banned_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 2. WALLETS TABLE
CREATE TABLE public.wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  wallet_cash numeric NOT NULL DEFAULT 0.00,
  wallet_bonus numeric NOT NULL DEFAULT 0.00,
  bonus_wager_required numeric NOT NULL DEFAULT 0.00,
  bonus_wager_completed numeric NOT NULL DEFAULT 0.00,
  wager_required numeric NOT NULL DEFAULT 0.00,
  wager_completed numeric NOT NULL DEFAULT 0.00,
  first_deposit_received boolean NOT NULL DEFAULT false,
  loan_amount numeric NOT NULL DEFAULT 0.00,
  loan_eligible boolean NOT NULL DEFAULT false,
  last_deposit_amount numeric NOT NULL DEFAULT 0.00,
  loan_taken_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 3. USER_ROLES TABLE
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 4. VIP_TIERS TABLE
CREATE TABLE public.vip_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tier_level integer NOT NULL,
  deposit_threshold numeric NOT NULL DEFAULT 0,
  bonus_percentage numeric NOT NULL DEFAULT 50,
  color text NOT NULL DEFAULT '#808080'::text,
  icon text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 5. REFERRAL_CODES TABLE
CREATE TABLE public.referral_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  total_referrals integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0.00,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. REFERRALS TABLE
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  referral_code text NOT NULL,
  reward_amount numeric NOT NULL DEFAULT 50.00,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 7. COMMISSION_TRANSACTIONS TABLE
CREATE TABLE public.commission_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_user_id uuid NOT NULL,
  amount numeric NOT NULL,
  commission_type text NOT NULL,
  reference_id uuid NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 8. TRANSACTIONS TABLE
CREATE TABLE public.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  payment_method text NULL,
  utr_number text NULL,
  wallet_address text NULL,
  payment_proof text NULL,
  admin_notes text NULL,
  transaction_hash text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 9. WALLET_TRANSACTIONS TABLE
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  transaction_type text NOT NULL,
  wallet_type text NOT NULL,
  balance_before_cash numeric NOT NULL,
  balance_after_cash numeric NOT NULL,
  balance_before_bonus numeric NOT NULL,
  balance_after_bonus numeric NOT NULL,
  related_transaction_id uuid NULL,
  description text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 10. WALLET_ADJUSTMENTS TABLE
CREATE TABLE public.wallet_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  amount numeric NOT NULL,
  adjustment_type text NOT NULL,
  admin_comment text NOT NULL,
  balance_before_cash numeric NOT NULL,
  balance_after_cash numeric NOT NULL,
  balance_before_bonus numeric NOT NULL,
  balance_after_bonus numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 11. LOAN_TRANSACTIONS TABLE
CREATE TABLE public.loan_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  loan_amount numeric NOT NULL,
  recovery_amount numeric NOT NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'active'::text,
  recovered_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 12. GAME_SETTINGS TABLE
CREATE TABLE public.game_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  currency_symbol text NOT NULL DEFAULT '$'::text,
  currency_name text NOT NULL DEFAULT 'USD'::text,
  website_name text NULL DEFAULT 'Kuku Bahati'::text,
  website_logo_url text NULL,
  favicon_url text NULL,
  min_crash_point numeric NOT NULL DEFAULT 1.01,
  max_crash_point numeric NOT NULL DEFAULT 10.00,
  house_edge numeric NOT NULL DEFAULT 0.03,
  rtp_percentage numeric NULL DEFAULT 95.00,
  rtp_mode text NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT false,
  use_manual_crash_point boolean NULL DEFAULT false,
  manual_crash_points numeric[] NULL DEFAULT '{}'::numeric[],
  referral_reward_amount numeric NOT NULL DEFAULT 50.00,
  referral_bet_commission_percent numeric NOT NULL DEFAULT 1.00,
  referral_first_deposit_commission_percent numeric NOT NULL DEFAULT 10.00,
  deposit_bonus_percentage numeric NOT NULL DEFAULT 50.00,
  first_deposit_bonus_percent numeric NOT NULL DEFAULT 50.00,
  first_deposit_bonus_fixed_amount numeric NULL,
  wager_requirement_multiplier numeric NOT NULL DEFAULT 5.00,
  signup_bonus_amount numeric NULL DEFAULT 0,
  min_deposit numeric NULL DEFAULT 10,
  max_deposit numeric NULL DEFAULT 100000,
  loan_feature_enabled boolean NULL DEFAULT true,
  upi_enabled boolean NULL DEFAULT true,
  upi_method_name text NULL DEFAULT 'UPI'::text,
  upi_id text NULL DEFAULT 'crashx@upi'::text,
  upi_qr_enabled boolean NULL DEFAULT false,
  upi_qr_url text NULL,
  usdt_enabled boolean NULL DEFAULT true,
  usdt_method_name text NULL DEFAULT 'USDT'::text,
  usdt_address text NULL DEFAULT 'TXYZabc123example'::text,
  usdt_qr_enabled boolean NULL DEFAULT false,
  usdt_qr_url text NULL,
  usdt_conversion_rate numeric NULL DEFAULT 80.00,
  btc_enabled boolean NULL DEFAULT false,
  btc_method_name text NULL DEFAULT 'BTC'::text,
  btc_address text NULL,
  btc_qr_enabled boolean NULL DEFAULT false,
  btc_qr_url text NULL,
  show_utr_number boolean NULL DEFAULT true,
  show_wallet_address boolean NULL DEFAULT true,
  country_blocking_enabled boolean NULL DEFAULT false,
  blocked_countries text[] NULL DEFAULT '{}'::text[],
  primary_color text NULL DEFAULT '187 100% 50%'::text,
  secondary_color text NULL DEFAULT '266 100% 65%'::text,
  background_color text NULL DEFAULT '220 25% 8%'::text,
  accent_color text NULL DEFAULT '187 100% 50%'::text,
  theme_name text NULL DEFAULT 'cyber-neon'::text,
  hidden_games text[] NULL DEFAULT '{}'::text[],
  hidden_categories text[] NULL DEFAULT '{}'::text[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 13. PAYMENT_GATEWAYS TABLE
CREATE TABLE public.payment_gateways (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gateway_type text NOT NULL,
  display_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  allowed_countries text[] NOT NULL DEFAULT '{}'::text[],
  api_key text NULL,
  api_secret text NULL,
  webhook_secret text NULL,
  currency_code text NULL DEFAULT 'INR'::text,
  min_amount numeric NULL DEFAULT 10,
  max_amount numeric NULL DEFAULT 100000,
  processing_fee_percent numeric NULL DEFAULT 0,
  processing_fee_fixed numeric NULL DEFAULT 0,
  show_qr boolean NULL DEFAULT false,
  qr_url text NULL,
  instructions text NULL,
  icon_url text NULL,
  additional_config jsonb NULL DEFAULT '{}'::jsonb,
  sort_order integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 14. ADMIN_ACTIVITY_LOGS TABLE
CREATE TABLE public.admin_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  description text NULL,
  old_value text NULL,
  new_value text NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 15. LEGAL_DOCUMENTS TABLE
CREATE TABLE public.legal_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_type text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 16. HOMEPAGE_BANNERS TABLE
CREATE TABLE public.homepage_banners (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text NULL,
  button_text text NULL,
  button_link text NULL,
  background_color text NULL DEFAULT '#000000'::text,
  text_color text NULL DEFAULT '#FFFFFF'::text,
  is_active boolean NULL DEFAULT true,
  sort_order integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 17. EXCLUSIVE_PROMOTIONS TABLE
CREATE TABLE public.exclusive_promotions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  subtitle text NOT NULL,
  description text NOT NULL,
  button_text text NOT NULL,
  button_link text NULL,
  icon_type text NOT NULL,
  badge_text text NOT NULL,
  badge_color text NOT NULL,
  gradient_from text NOT NULL,
  gradient_to text NOT NULL,
  is_active boolean NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 18. CAROUSEL_GAMES TABLE
CREATE TABLE public.carousel_games (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_name text NOT NULL,
  game_route text NOT NULL,
  poster_url text NOT NULL,
  badge_type text NOT NULL,
  carousel_color text NULL DEFAULT 'default'::text,
  active_players integer NULL DEFAULT 0,
  rtp_percentage numeric NULL DEFAULT 96.00,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 19. CUSTOM_THEMES TABLE
CREATE TABLE public.custom_themes (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  mode text NOT NULL,
  radius text NOT NULL,
  preview jsonb NOT NULL,
  colors jsonb NOT NULL,
  gradients jsonb NOT NULL,
  shadows jsonb NOT NULL,
  created_by text NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 20. SUPPORT_CONVERSATIONS TABLE
CREATE TABLE public.support_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'open'::text,
  last_message_at timestamp with time zone NULL DEFAULT now(),
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 21. SUPPORT_MESSAGES TABLE
CREATE TABLE public.support_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id),
  sender_id uuid NOT NULL,
  sender_type text NOT NULL,
  message text NULL,
  image_url text NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 22. DAILY_SPINS TABLE
CREATE TABLE public.daily_spins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_spin_date date NOT NULL,
  prize_type text NOT NULL,
  prize_amount numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 23. SPIN_WHEEL_PRIZES TABLE
CREATE TABLE public.spin_wheel_prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  color text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  position integer NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 24. SPIN_ACHIEVEMENTS TABLE
CREATE TABLE public.spin_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  badge_color text NOT NULL DEFAULT '#808080'::text,
  achievement_type text NOT NULL,
  criteria_value numeric NOT NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 25. USER_SPIN_STATS TABLE
CREATE TABLE public.user_spin_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_spins integer NOT NULL DEFAULT 0,
  total_earnings numeric NOT NULL DEFAULT 0,
  last_spin_date date NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 26. USER_SPIN_ACHIEVEMENTS TABLE
CREATE TABLE public.user_spin_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone NULL DEFAULT now()
);

-- 27. OFFER_RAINS TABLE
CREATE TABLE public.offer_rains (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  pot_amount numeric NOT NULL,
  max_claimers integer NOT NULL,
  amount_per_person numeric NOT NULL,
  claimed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'::text,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 28. OFFER_RAIN_CLAIMS TABLE
CREATE TABLE public.offer_rain_claims (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rain_id uuid NOT NULL REFERENCES public.offer_rains(id),
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- ============================================================
-- GAME TABLES
-- ============================================================

-- 29. GAME_ROUNDS TABLE (Crash Game)
CREATE TABLE public.game_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number bigint NOT NULL,
  crash_point numeric NOT NULL,
  game_type text NULL DEFAULT 'crash'::text,
  status text NOT NULL DEFAULT 'preparing'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  crashed_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 30. BETS TABLE (Crash Game)
CREATE TABLE public.bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  round_id uuid NOT NULL REFERENCES public.game_rounds(id),
  amount numeric NOT NULL,
  auto_cashout numeric NULL,
  cashed_out_at numeric NULL,
  profit numeric NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 31. GAME_STATS TABLE
CREATE TABLE public.game_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 32. CHICKEN_ROAD_SETTINGS TABLE
CREATE TABLE public.chicken_road_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 10,
  max_bet numeric NOT NULL DEFAULT 10000,
  rtp_percentage numeric NOT NULL DEFAULT 95,
  house_edge numeric NOT NULL DEFAULT 5,
  rtp_mode text NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  manual_control_enabled boolean NULL DEFAULT false,
  manual_crash_lanes_easy integer[] NULL DEFAULT '{}'::integer[],
  manual_crash_lanes_medium integer[] NULL DEFAULT '{}'::integer[],
  manual_crash_lanes_hard integer[] NULL DEFAULT '{}'::integer[],
  manual_crash_lanes_expert integer[] NULL DEFAULT '{}'::integer[],
  multiplier_easy numeric NOT NULL DEFAULT 1.5,
  multiplier_medium numeric NOT NULL DEFAULT 2.0,
  multiplier_hard numeric NOT NULL DEFAULT 3.0,
  multiplier_expert numeric NOT NULL DEFAULT 5.0,
  lanes_easy integer NOT NULL DEFAULT 30,
  lanes_medium integer NOT NULL DEFAULT 25,
  lanes_hard integer NOT NULL DEFAULT 22,
  lanes_expert integer NOT NULL DEFAULT 18,
  lane_odds_easy jsonb NULL DEFAULT '[]'::jsonb,
  lane_odds_medium jsonb NULL DEFAULT '[]'::jsonb,
  lane_odds_hard jsonb NULL DEFAULT '[]'::jsonb,
  lane_odds_expert jsonb NULL DEFAULT '[]'::jsonb,
  use_custom_lane_odds boolean NULL DEFAULT false,
  bet_button_text text NULL DEFAULT 'BET'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 33. CHICKEN_ROAD_BETS TABLE
CREATE TABLE public.chicken_road_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  difficulty text NOT NULL DEFAULT 'easy'::text,
  lanes_crossed integer NOT NULL DEFAULT 0,
  total_lanes integer NOT NULL DEFAULT 7,
  final_multiplier numeric NULL,
  profit numeric NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 34. CHICKEN_ROAD_STATS TABLE
CREATE TABLE public.chicken_road_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 35. CHICKEN_ROAD_HOW_TO_PLAY TABLE
CREATE TABLE public.chicken_road_how_to_play (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'How to Play'::text,
  content text NOT NULL DEFAULT 'Select your difficulty level and place your bet. Guide your chicken across the road by clicking GO. Each successful lane crossing increases your multiplier. Cash out anytime to secure your winnings. Hit a car and lose your bet!'::text,
  rules jsonb NOT NULL DEFAULT '["Choose difficulty: Easy (30 lanes), Medium (25 lanes), Hard (22 lanes), Expert (18 lanes)", "Place your bet using preset buttons or custom amount", "Click GO to move the chicken forward one lane", "Each lane crossed increases your multiplier", "Click CASHOUT anytime to secure your winnings", "If the chicken hits a car, you lose your bet", "Higher difficulty = Higher risk = Higher rewards"]'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 36. PLINKO_SETTINGS TABLE
CREATE TABLE public.plinko_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 1.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 98.00,
  house_edge numeric NOT NULL DEFAULT 0.02,
  rtp_mode text NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 37. PLINKO_BETS TABLE
CREATE TABLE public.plinko_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  rows integer NOT NULL,
  risk text NOT NULL,
  result_slot integer NOT NULL,
  multiplier numeric NOT NULL,
  profit numeric NOT NULL,
  server_seed text NOT NULL,
  client_seed text NOT NULL,
  nonce bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 38. PLINKO_STATS TABLE
CREATE TABLE public.plinko_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 39. MINES_SETTINGS TABLE
CREATE TABLE public.mines_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NULL DEFAULT 10,
  max_bet numeric NULL DEFAULT 100000,
  house_edge numeric NULL DEFAULT 3,
  rtp_percentage numeric NULL DEFAULT 97,
  rtp_mode text NULL DEFAULT 'standard'::text,
  auto_rtp_enabled boolean NULL DEFAULT false,
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 40. MINES_BETS TABLE
CREATE TABLE public.mines_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  mines_count integer NOT NULL,
  grid_size integer NULL DEFAULT 25,
  tiles_revealed integer[] NULL DEFAULT '{}'::integer[],
  mine_positions integer[] NULL DEFAULT '{}'::integer[],
  current_multiplier numeric NULL DEFAULT 1,
  final_multiplier numeric NULL,
  profit numeric NULL,
  status text NULL DEFAULT 'active'::text,
  server_seed text NULL,
  client_seed text NULL,
  nonce bigint NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 41. MINES_STATS TABLE
CREATE TABLE public.mines_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 42. AVIATOR_SETTINGS TABLE
CREATE TABLE public.aviator_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  rtp_mode text NOT NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  preparing_duration_seconds integer NOT NULL DEFAULT 10,
  use_manual_crash_point boolean NULL DEFAULT false,
  manual_crash_points numeric[] NULL DEFAULT '{}'::numeric[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 43. AVIATOR_STATS TABLE
CREATE TABLE public.aviator_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 44. COIN_TRAIN_SETTINGS TABLE
CREATE TABLE public.coin_train_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  rtp_mode text NOT NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  preparing_duration_seconds integer NOT NULL DEFAULT 10,
  use_manual_crash_point boolean NULL DEFAULT false,
  manual_crash_points numeric[] NULL DEFAULT '{}'::numeric[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 45. COIN_TRAIN_STATS TABLE
CREATE TABLE public.coin_train_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 46. COIN_FLIP_SETTINGS TABLE
CREATE TABLE public.coin_flip_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  rtp_mode text NOT NULL DEFAULT 'balanced'::text,
  betting_duration_seconds integer NOT NULL DEFAULT 15,
  flip_duration_seconds integer NOT NULL DEFAULT 3,
  auto_rtp_enabled boolean NULL DEFAULT true,
  manual_result_enabled boolean NULL DEFAULT false,
  manual_result text NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 47. COIN_FLIP_ROUNDS TABLE
CREATE TABLE public.coin_flip_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number integer NOT NULL,
  status text NOT NULL DEFAULT 'betting'::text,
  result text NULL,
  server_seed text NULL,
  server_seed_hash text NULL,
  client_seed text NULL,
  nonce integer NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 48. COIN_FLIP_BETS TABLE
CREATE TABLE public.coin_flip_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  round_id uuid NOT NULL,
  side text NOT NULL,
  amount numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit numeric NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 49. COIN_FLIP_STATS TABLE
CREATE TABLE public.coin_flip_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 50. CYCLING_RACE_SETTINGS TABLE
CREATE TABLE public.cycling_race_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_of_cyclists integer NOT NULL DEFAULT 6,
  betting_duration_seconds integer NOT NULL DEFAULT 15,
  race_duration_seconds integer NOT NULL DEFAULT 30,
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  rtp_mode text NOT NULL DEFAULT 'high'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  manual_winner_enabled boolean NULL DEFAULT false,
  manual_winner_cyclist integer NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 51. CYCLING_RACE_RACES TABLE
CREATE TABLE public.cycling_race_races (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_number integer NOT NULL,
  winner_cyclist integer NOT NULL,
  race_duration integer NOT NULL,
  status text NOT NULL DEFAULT 'preparing'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 52. CYCLING_RACE_BETS TABLE
CREATE TABLE public.cycling_race_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  race_id uuid NOT NULL REFERENCES public.cycling_race_races(id),
  cyclist_number integer NOT NULL,
  amount numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit numeric NULL,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 53. CYCLING_RACE_STATS TABLE
CREATE TABLE public.cycling_race_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 54. HORSE_RACING_SETTINGS TABLE
CREATE TABLE public.horse_racing_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  number_of_horses integer NOT NULL DEFAULT 6,
  betting_duration_seconds integer NOT NULL DEFAULT 10,
  race_duration_seconds integer NOT NULL DEFAULT 15,
  min_bet numeric NOT NULL DEFAULT 1.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 0.05,
  rtp_mode text NULL DEFAULT 'balanced'::text,
  auto_rtp_enabled boolean NULL DEFAULT false,
  manual_winner_enabled boolean NULL DEFAULT false,
  manual_winner_horse integer NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 55. HORSE_RACING_RACES TABLE
CREATE TABLE public.horse_racing_races (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_number bigint NOT NULL,
  winner_horse integer NOT NULL,
  race_duration numeric NOT NULL,
  status text NOT NULL DEFAULT 'betting'::text,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 56. HORSE_RACING_BETS TABLE
CREATE TABLE public.horse_racing_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  race_id uuid NOT NULL REFERENCES public.horse_racing_races(id),
  horse_number integer NOT NULL,
  amount numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit numeric NULL DEFAULT 0.00,
  status text NOT NULL DEFAULT 'active'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 57. HORSE_RACING_STATS TABLE
CREATE TABLE public.horse_racing_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0.00,
  total_paidout numeric NULL DEFAULT 0.00,
  total_bets bigint NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0.00,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 58. WINGO_SETTINGS TABLE
CREATE TABLE public.wingo_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  betting_duration_seconds integer NOT NULL DEFAULT 30,
  result_duration_seconds integer NOT NULL DEFAULT 5,
  min_bet numeric NOT NULL DEFAULT 10,
  max_bet numeric NOT NULL DEFAULT 10000,
  house_edge numeric NOT NULL DEFAULT 2.0,
  rtp_percentage numeric NOT NULL DEFAULT 98.0,
  rtp_mode text NOT NULL DEFAULT 'auto'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  manual_result_enabled boolean NULL DEFAULT false,
  manual_result text NULL,
  red_multiplier numeric NOT NULL DEFAULT 2.0,
  green_multiplier numeric NOT NULL DEFAULT 4.5,
  violet_multiplier numeric NOT NULL DEFAULT 2.0,
  updated_at timestamp with time zone NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 59. WINGO_ROUNDS TABLE (with sequence)
CREATE SEQUENCE IF NOT EXISTS wingo_rounds_round_number_seq START WITH 20252469655;

CREATE TABLE public.wingo_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number bigint NOT NULL DEFAULT nextval('wingo_rounds_round_number_seq'::regclass),
  status text NOT NULL DEFAULT 'betting'::text,
  result text NULL,
  result_number integer NULL,
  server_seed text NULL,
  server_seed_hash text NULL,
  client_seed text NULL,
  nonce integer NULL DEFAULT 0,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NULL,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 60. WINGO_BETS TABLE
CREATE TABLE public.wingo_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  round_id uuid NOT NULL,
  color text NOT NULL,
  amount numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit numeric NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NULL DEFAULT now()
);

-- 61. WINGO_STATS TABLE
CREATE TABLE public.wingo_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- 62. DRAGON_TIGER_SETTINGS TABLE
CREATE TABLE public.dragon_tiger_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet numeric NOT NULL DEFAULT 10,
  max_bet numeric NOT NULL DEFAULT 10000,
  betting_duration_seconds integer NOT NULL DEFAULT 15,
  reveal_duration_seconds integer NOT NULL DEFAULT 5,
  house_edge numeric NOT NULL DEFAULT 3.00,
  rtp_percentage numeric NOT NULL DEFAULT 97.00,
  rtp_mode text NOT NULL DEFAULT 'auto'::text,
  auto_rtp_enabled boolean NULL DEFAULT true,
  manual_result_enabled boolean NULL DEFAULT false,
  manual_result text NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid NULL
);

-- 63. DRAGON_TIGER_ROUNDS TABLE
CREATE TABLE public.dragon_tiger_rounds (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number bigint NOT NULL,
  status text NOT NULL DEFAULT 'betting'::text,
  dragon_card text NULL,
  tiger_card text NULL,
  result text NULL,
  server_seed text NULL,
  server_seed_hash text NULL,
  client_seed text NULL,
  nonce integer NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 64. DRAGON_TIGER_BETS TABLE
CREATE TABLE public.dragon_tiger_bets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  round_id uuid NOT NULL REFERENCES public.dragon_tiger_rounds(id),
  bet_side text NOT NULL,
  amount numeric NOT NULL,
  potential_payout numeric NOT NULL,
  profit numeric NULL,
  status text NOT NULL DEFAULT 'pending'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 65. DRAGON_TIGER_STATS TABLE
CREATE TABLE public.dragon_tiger_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered numeric NULL DEFAULT 0,
  total_paidout numeric NULL DEFAULT 0,
  total_bets integer NULL DEFAULT 0,
  current_profit_percent numeric NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now()
);

-- ============================================================
-- PART 3: DATABASE FUNCTIONS
-- ============================================================

-- Function: has_role (CRITICAL - used by RLS policies)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function: generate_referral_code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;

-- Function: create_user_referral_code (trigger function)
CREATE OR REPLACE FUNCTION public.create_user_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, public.generate_referral_code());
  RETURN NEW;
END;
$$;

-- Function: handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  signup_bonus numeric;
BEGIN
  SELECT COALESCE(signup_bonus_amount, 0) INTO signup_bonus 
  FROM public.game_settings 
  LIMIT 1;

  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus)
  VALUES (NEW.id, 0.00, signup_bonus);
  
  RETURN NEW;
END;
$$;

-- Function: handle_updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: auto_update_vip_tier
CREATE OR REPLACE FUNCTION public.auto_update_vip_tier()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.update_user_vip_tier(NEW.id);
  RETURN NEW;
END;
$$;

-- Function: update_user_vip_tier
CREATE OR REPLACE FUNCTION public.update_user_vip_tier(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_total_deposited NUMERIC;
  appropriate_tier_id UUID;
BEGIN
  SELECT total_deposited INTO user_total_deposited
  FROM public.profiles
  WHERE id = user_id_param;

  SELECT id INTO appropriate_tier_id
  FROM public.vip_tiers
  WHERE deposit_threshold <= user_total_deposited
  ORDER BY tier_level DESC
  LIMIT 1;

  UPDATE public.profiles
  SET vip_tier_id = appropriate_tier_id
  WHERE id = user_id_param;
END;
$$;

-- Function: update_profile_total_deposited
CREATE OR REPLACE FUNCTION public.update_profile_total_deposited(p_user_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET total_deposited = total_deposited + p_amount
  WHERE id = p_user_id;
END;
$$;

-- Function: get_user_stats
CREATE OR REPLACE FUNCTION public.get_user_stats(user_id_param uuid)
RETURNS TABLE(total_bets bigint, total_wagered numeric, total_profit numeric, biggest_win numeric, win_rate numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    COUNT(*)::BIGINT as total_bets,
    COALESCE(SUM(amount), 0) as total_wagered,
    COALESCE(SUM(profit), 0) as total_profit,
    COALESCE(MAX(profit), 0) as biggest_win,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE profit > 0)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as win_rate
  FROM public.bets
  WHERE user_id = user_id_param;
$$;

-- Function: get_today_crash_stats
CREATE OR REPLACE FUNCTION public.get_today_crash_stats(today_date timestamp with time zone)
RETURNS TABLE(min_crash numeric, max_crash numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    MIN(crash_point) as min_crash,
    MAX(crash_point) as max_crash
  FROM game_rounds
  WHERE created_at >= today_date;
END;
$$;

-- Function: update_conversation_timestamp
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.support_conversations
  SET last_message_at = now(), updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- Function: update_game_settings_timestamp
CREATE OR REPLACE FUNCTION public.update_game_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Function: update_chicken_road_settings_timestamp
CREATE OR REPLACE FUNCTION public.update_chicken_road_settings_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Function: update_payment_gateways_timestamp
CREATE OR REPLACE FUNCTION public.update_payment_gateways_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Stats update functions for each game
CREATE OR REPLACE FUNCTION public.update_game_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO game_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (
    CURRENT_DATE,
    NEW.amount,
    COALESCE(NEW.profit + NEW.amount, NEW.amount),
    1,
    CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = game_stats.total_wagered + NEW.amount,
    total_paidout = game_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = game_stats.total_bets + 1,
    current_profit_percent = CASE WHEN game_stats.total_wagered > 0 THEN ((game_stats.total_wagered - game_stats.total_paidout) / game_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_plinko_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO plinko_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = plinko_stats.total_wagered + NEW.amount,
    total_paidout = plinko_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = plinko_stats.total_bets + 1,
    current_profit_percent = CASE WHEN plinko_stats.total_wagered > 0 THEN ((plinko_stats.total_wagered - plinko_stats.total_paidout) / plinko_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_mines_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('cashed_out', 'busted') THEN
    INSERT INTO mines_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
    VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
    ON CONFLICT (date) 
    DO UPDATE SET
      total_wagered = mines_stats.total_wagered + NEW.amount,
      total_paidout = mines_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
      total_bets = mines_stats.total_bets + 1,
      current_profit_percent = CASE WHEN mines_stats.total_wagered > 0 THEN ((mines_stats.total_wagered - mines_stats.total_paidout) / mines_stats.total_wagered * 100) ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_aviator_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO aviator_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = aviator_stats.total_wagered + NEW.amount,
    total_paidout = aviator_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = aviator_stats.total_bets + 1,
    current_profit_percent = CASE WHEN aviator_stats.total_wagered > 0 THEN ((aviator_stats.total_wagered - aviator_stats.total_paidout) / aviator_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_coin_flip_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO coin_flip_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = coin_flip_stats.total_wagered + NEW.amount,
    total_paidout = coin_flip_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = coin_flip_stats.total_bets + 1,
    current_profit_percent = CASE WHEN coin_flip_stats.total_wagered > 0 THEN ((coin_flip_stats.total_wagered - coin_flip_stats.total_paidout) / coin_flip_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_cycling_race_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO cycling_race_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = cycling_race_stats.total_wagered + NEW.amount,
    total_paidout = cycling_race_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = cycling_race_stats.total_bets + 1,
    current_profit_percent = CASE WHEN cycling_race_stats.total_wagered > 0 THEN ((cycling_race_stats.total_wagered - cycling_race_stats.total_paidout) / cycling_race_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_horse_racing_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO horse_racing_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = horse_racing_stats.total_wagered + NEW.amount,
    total_paidout = horse_racing_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = horse_racing_stats.total_bets + 1,
    current_profit_percent = CASE WHEN horse_racing_stats.total_wagered > 0 THEN ((horse_racing_stats.total_wagered - horse_racing_stats.total_paidout) / horse_racing_stats.total_wagered * 100) ELSE 0 END,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wingo_stats()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') THEN
    INSERT INTO wingo_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
    VALUES (CURRENT_DATE, NEW.amount, COALESCE(NEW.profit + NEW.amount, NEW.amount), 1, CASE WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100) ELSE 0 END)
    ON CONFLICT (date) 
    DO UPDATE SET
      total_wagered = wingo_stats.total_wagered + NEW.amount,
      total_paidout = wingo_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
      total_bets = wingo_stats.total_bets + 1,
      current_profit_percent = CASE WHEN wingo_stats.total_wagered > 0 THEN ((wingo_stats.total_wagered - wingo_stats.total_paidout) / wingo_stats.total_wagered * 100) ELSE 0 END,
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- PART 4: TRIGGERS
-- ============================================================

-- Auth triggers (create in auth schema - requires superuser/supabase dashboard)
-- These need to be created via Supabase Dashboard > Authentication > Hooks
-- CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- CREATE TRIGGER on_auth_user_created_referral AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_referral_code();

-- Game stats triggers
CREATE TRIGGER update_game_stats_trigger AFTER INSERT ON public.bets FOR EACH ROW EXECUTE FUNCTION public.update_game_stats();
CREATE TRIGGER update_plinko_stats_trigger AFTER INSERT ON public.plinko_bets FOR EACH ROW EXECUTE FUNCTION public.update_plinko_stats();
CREATE TRIGGER update_mines_stats_trigger AFTER UPDATE ON public.mines_bets FOR EACH ROW EXECUTE FUNCTION public.update_mines_stats();
CREATE TRIGGER update_aviator_stats_trigger AFTER INSERT ON public.bets FOR EACH ROW EXECUTE FUNCTION public.update_aviator_stats();
CREATE TRIGGER update_coin_flip_stats_trigger AFTER UPDATE ON public.coin_flip_bets FOR EACH ROW EXECUTE FUNCTION public.update_coin_flip_stats();
CREATE TRIGGER update_cycling_race_stats_trigger AFTER UPDATE ON public.cycling_race_bets FOR EACH ROW EXECUTE FUNCTION public.update_cycling_race_stats();
CREATE TRIGGER update_horse_racing_stats_trigger AFTER UPDATE ON public.horse_racing_bets FOR EACH ROW EXECUTE FUNCTION public.update_horse_racing_stats();
CREATE TRIGGER update_wingo_stats_trigger AFTER UPDATE ON public.wingo_bets FOR EACH ROW EXECUTE FUNCTION public.update_wingo_stats();

-- Timestamp update triggers
CREATE TRIGGER update_game_settings_timestamp_trigger BEFORE UPDATE ON public.game_settings FOR EACH ROW EXECUTE FUNCTION public.update_game_settings_timestamp();
CREATE TRIGGER update_chicken_road_settings_timestamp_trigger BEFORE UPDATE ON public.chicken_road_settings FOR EACH ROW EXECUTE FUNCTION public.update_chicken_road_settings_timestamp();
CREATE TRIGGER update_payment_gateways_timestamp_trigger BEFORE UPDATE ON public.payment_gateways FOR EACH ROW EXECUTE FUNCTION public.update_payment_gateways_timestamp();
CREATE TRIGGER update_support_conversation_timestamp AFTER INSERT ON public.support_messages FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();

-- VIP tier auto-update
CREATE TRIGGER auto_update_vip_tier_trigger AFTER UPDATE OF total_deposited ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.auto_update_vip_tier();

-- ============================================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusive_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carousel_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_spins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_wheel_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spin_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spin_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_rains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_rain_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_road_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_road_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_road_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chicken_road_how_to_play ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plinko_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plinko_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plinko_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aviator_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_train_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_train_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_flip_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_flip_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_flip_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coin_flip_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycling_race_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycling_race_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycling_race_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cycling_race_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_racing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_racing_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_racing_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horse_racing_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wingo_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_tiger_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_tiger_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_tiger_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dragon_tiger_stats ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- PROFILES POLICIES
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete profiles" ON public.profiles FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- WALLETS POLICIES
CREATE POLICY "Users can view their own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all wallets" ON public.wallets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all wallets" ON public.wallets FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- USER_ROLES POLICIES
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- VIP_TIERS POLICIES
CREATE POLICY "Anyone can view VIP tiers" ON public.vip_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage VIP tiers" ON public.vip_tiers FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- REFERRAL_CODES POLICIES
CREATE POLICY "Users can view their own referral code" ON public.referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all referral codes" ON public.referral_codes FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- REFERRALS POLICIES
CREATE POLICY "Users can view referrals they made" ON public.referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "System can insert referrals" ON public.referrals FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update referral status" ON public.referrals FOR UPDATE USING (true);

-- COMMISSION_TRANSACTIONS POLICIES
CREATE POLICY "Users can view their commissions" ON public.commission_transactions FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Admins can view all commissions" ON public.commission_transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "System can insert commissions" ON public.commission_transactions FOR INSERT WITH CHECK (true);

-- TRANSACTIONS POLICIES
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all transactions" ON public.transactions FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all transactions" ON public.transactions FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- GAME_SETTINGS POLICIES
CREATE POLICY "Everyone can view game settings" ON public.game_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update game settings" ON public.game_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- PAYMENT_GATEWAYS POLICIES
CREATE POLICY "Anyone can view enabled payment gateways" ON public.payment_gateways FOR SELECT USING (enabled = true);
CREATE POLICY "Admins can view all payment gateways" ON public.payment_gateways FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert payment gateways" ON public.payment_gateways FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update payment gateways" ON public.payment_gateways FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- ADMIN_ACTIVITY_LOGS POLICIES
CREATE POLICY "Admins can view all logs" ON public.admin_activity_logs FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert logs" ON public.admin_activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- SUPPORT_CONVERSATIONS POLICIES
CREATE POLICY "Users can view their own conversations" ON public.support_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations" ON public.support_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations" ON public.support_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all conversations" ON public.support_conversations FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update all conversations" ON public.support_conversations FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- SUPPORT_MESSAGES POLICIES
CREATE POLICY "Users can view their own messages" ON public.support_messages FOR SELECT USING (EXISTS (SELECT 1 FROM support_conversations WHERE id = conversation_id AND user_id = auth.uid()));
CREATE POLICY "Users can create messages in their conversations" ON public.support_messages FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM support_conversations WHERE id = conversation_id AND user_id = auth.uid()));
CREATE POLICY "Admins can view all messages" ON public.support_messages FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can create messages" ON public.support_messages FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- CHICKEN_ROAD POLICIES
CREATE POLICY "Allow public read access to chicken_road_settings" ON public.chicken_road_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin update access to chicken_road_settings" ON public.chicken_road_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view their own chicken road bets" ON public.chicken_road_bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own chicken road bets" ON public.chicken_road_bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "System can update chicken road bets" ON public.chicken_road_bets FOR UPDATE USING (true);
CREATE POLICY "Admins can view all chicken road bets" ON public.chicken_road_bets FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow public read access to chicken_road_stats" ON public.chicken_road_stats FOR SELECT USING (true);
CREATE POLICY "Allow admin full access to chicken_road_stats" ON public.chicken_road_stats FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view how to play" ON public.chicken_road_how_to_play FOR SELECT USING (true);
CREATE POLICY "Admins can update how to play" ON public.chicken_road_how_to_play FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- BETS POLICIES (Crash game)
CREATE POLICY "Users can view their own bets" ON public.bets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own bets" ON public.bets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own bets" ON public.bets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view all bets" ON public.bets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can view all bets" ON public.bets FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Allow anonymous read access to bets for leaderboard" ON public.bets FOR SELECT TO anon USING (true);

-- GAME_ROUNDS POLICIES
CREATE POLICY "Anyone can view game rounds" ON public.game_rounds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow anonymous read access to game_rounds" ON public.game_rounds FOR SELECT TO anon USING (true);

-- Add similar policies for other game tables following the pattern above...
-- (Plinko, Mines, Aviator, Coin Flip, Cycling Race, Horse Racing, Wingo, Dragon Tiger)

-- ============================================================
-- PART 6: REALTIME
-- ============================================================

-- Enable realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chicken_road_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_rains;
ALTER PUBLICATION supabase_realtime ADD TABLE public.offer_rain_claims;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wingo_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wingo_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_flip_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cycling_race_races;

-- ============================================================
-- PART 7: STORAGE BUCKETS
-- ============================================================

-- Create storage buckets (run via Supabase Dashboard or API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('support-images', 'support-images', true);

-- Storage policies
-- CREATE POLICY "Avatar images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "Users can upload their own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- PART 8: INITIAL DATA
-- ============================================================

-- Insert default game settings
INSERT INTO public.game_settings (id, currency_symbol, currency_name, website_name)
VALUES (gen_random_uuid(), 'KSH', 'KES', 'Kuku Bahati')
ON CONFLICT DO NOTHING;

-- Insert default chicken road settings
INSERT INTO public.chicken_road_settings (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Insert default VIP tiers
INSERT INTO public.vip_tiers (name, tier_level, deposit_threshold, bonus_percentage, color) VALUES
('Bronze', 1, 0, 50, '#CD7F32'),
('Silver', 2, 1000, 55, '#C0C0C0'),
('Gold', 3, 5000, 60, '#FFD700'),
('Platinum', 4, 25000, 70, '#E5E4E2'),
('Diamond', 5, 100000, 80, '#B9F2FF')
ON CONFLICT DO NOTHING;

-- Insert default spin wheel prizes
INSERT INTO public.spin_wheel_prizes (label, color, amount, position) VALUES
('10', '#FF6B6B', 10, 1),
('25', '#4ECDC4', 25, 2),
('50', '#45B7D1', 50, 3),
('100', '#96CEB4', 100, 4),
('JACKPOT', '#FFEAA7', 500, 5),
('Try Again', '#DFE6E9', 0, 6)
ON CONFLICT DO NOTHING;

-- ============================================================
-- PART 9: AUTH TRIGGERS (Run in Supabase Dashboard)
-- ============================================================

-- NOTE: These triggers must be created via Supabase Dashboard > SQL Editor
-- because they attach to the auth.users table which requires special permissions

-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CREATE TRIGGER on_auth_user_created_referral
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.create_user_referral_code();

-- ============================================================
-- END OF SCHEMA EXPORT
-- ============================================================
