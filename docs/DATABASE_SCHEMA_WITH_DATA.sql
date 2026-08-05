-- ============================================================
-- COMPLETE DATABASE SCHEMA EXPORT WITH DATA
-- BetNova Gaming Platform
-- Generated: 2025-12-16
-- ============================================================

-- Game Settings Data
INSERT INTO public.game_settings (id, website_name, website_logo_url, favicon_url, currency_symbol, currency_name, theme_name, primary_color, secondary_color, background_color, accent_color, rtp_percentage, rtp_mode, referral_reward_amount, referral_bet_commission_percent, referral_first_deposit_commission_percent, first_deposit_bonus_percent, signup_bonus_amount, wager_requirement_multiplier, wager_requirement_enabled, min_deposit, max_deposit, usdt_conversion_rate, btc_enabled, btc_address, blocked_countries, hidden_games, hidden_categories) VALUES
('2a64e42f-760e-4bfb-bcf9-e71103c5eb1b', 'BetNova', 'https://cdn-icons-png.flaticon.com/128/3902/3902021.png', 'https://cdn-icons-png.flaticon.com/128/3902/3902021.png', 'KSH', 'KSH', 'neon-cyan', '200 100% 50%', '210 100% 60%', '210 50% 8%', '180 100% 45%', 45, 'low', 58.99, 30, 30, 10, 20, 5, false, 22, 500000, 128.79, true, 'gsagasghstuuugtg98ujgjbjbbnbuutuitbnnnbuiuynbibnbibngnnb', ARRAY['IN'], ARRAY['crash','aviator-red','plinko','coin-flip','coin-train','mines','wingo'], ARRAY['trending','instant','classic','skill','high-win'])
ON CONFLICT (id) DO UPDATE SET website_name = EXCLUDED.website_name, currency_symbol = EXCLUDED.currency_symbol;

-- Chicken Road Settings
INSERT INTO public.chicken_road_settings (id, min_bet, max_bet, rtp_percentage, house_edge, rtp_mode, manual_control_enabled, manual_crash_lanes_easy, manual_crash_lanes_medium, multiplier_easy, multiplier_medium, multiplier_hard, multiplier_expert, lanes_easy, lanes_medium, lanes_hard, lanes_expert, use_custom_lane_odds, lane_odds_easy, lane_odds_medium, lane_odds_hard, lane_odds_expert) VALUES
('598ce52a-abd0-4800-bb46-cdf2d151845f', 12, 70000000, 50, 50, 'tight', true, ARRAY[2], ARRAY[1], 10, 40, 300, 3776, 40, 30, 20, 19, true, '[1,1.1,1.2,1.3,1.4,1.5,1.6,1.7,1.8,1.9,2,2.1,2.2,2.3,2.4,2.5,2.6,2.7,2.8,2.9,3,3.1,3.2,3.3,3.4,3.5,3.6,3.7,3.8,3.9,4,4.1,4.2,4.3,4.4,4.5,4.6,4.7,4.8,4.9]'::jsonb, '[1,1.08,1.16,1.24,1.32,1.4,1.48,1.56,1.64,1.72,1.8,1.88,1.96,2.04,2.12,2.2,2.28,2.36,2.44,2.52,2.6,2.68,2.76,2.84,2.92,3,3.08,3.16,3.24,3.32]'::jsonb, '[1,1.12,1.24,1.36,1.48,1.6,1.72,1.84,1.96,2.08,2.2,2.32,2.44,2.56,2.68,2.8,2.92,3.04,3.16,3.28]'::jsonb, '[1.16,1.2,1.4,1.6,1.8,2,2.2,2.4,2.6,2.8,3,3.2,3.4,3.6,3.8,4,4.2,4.4,4.6]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Cycling Race Settings
INSERT INTO public.cycling_race_settings (id, number_of_cyclists, betting_duration_seconds, race_duration_seconds, min_bet, max_bet, rtp_percentage, house_edge, rtp_mode, manual_winner_cyclist, use_custom_odds, cyclist_odds, cyclist_customization) VALUES
('d49cee1a-4bc1-483a-aee2-cefa6aa9068a', 10, 10, 8, 10, 10000, 30, 5, 'low', 10, true, '[null, null, 5.4, null, null, null, null, null, null, 100]'::jsonb, '[{"flag": "IND", "name": "Rahul singh"}]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- VIP Tiers
INSERT INTO public.vip_tiers (id, name, tier_level, deposit_threshold, bonus_percentage, color, icon) VALUES
('d0e98f9a-b8fc-4a0c-b2b4-c6f539cc15b8', 'Bronze', 1, 0, 50, '#CD7F32', '🥉'),
('231a13bc-8e48-4adb-99b3-b33ab512a739', 'Silver', 2, 10000, 75, '#C0C0C0', '🥈'),
('30579714-a7df-4dc4-959d-bd7afd9b48fc', 'Gold', 3, 50000, 100, '#FFD700', '🥇'),
('71a62c3a-abbe-4563-b1d1-73102c9f4907', 'Diamond', 4, 200000, 150, '#B9F2FF', '💎')
ON CONFLICT (id) DO NOTHING;

-- Spin Wheel Prizes
INSERT INTO public.spin_wheel_prizes (id, label, amount, color, position) VALUES
('30a5218b-d5e0-41f7-a126-eef2fb3d35bd', 'KSH1', 1, '#059669', 0),
('b18a02b1-7485-4bb6-9ea8-a44add66e4b7', 'KSH5', 5, '#2563eb', 1),
('41a9a779-6171-42de-b2f4-9bca486e38c5', '0', 0, '#1e293b', 2),
('26f4dce1-614b-4838-818a-89b719c95b16', 'KSH10', 10, '#7c3aed', 3),
('c3555ba7-8b2e-4f93-9093-9a0aff30a7f1', '0', 0, '#1e293b', 4),
('8efc1eae-90e0-49d3-bb76-817fa1eaa4f5', 'KSH80', 80, '#ea580c', 5),
('781dd95e-c8d6-48df-82d1-30627c2bea9c', '0', 0, '#1e293b', 6),
('bf80ce65-e2ff-47af-aaee-a05c43bffed9', '0', 0, '#1e293b', 7),
('bcf9ed3a-40d9-4035-8a52-48f01d754e5e', 'KSH200', 29, '#dc2626', 8)
ON CONFLICT (id) DO NOTHING;

-- Exclusive Promotions
INSERT INTO public.exclusive_promotions (id, title, subtitle, description, badge_text, badge_color, icon_type, button_text, gradient_from, gradient_to, sort_order, is_active) VALUES
('2991ad5f-c98f-475c-96f8-a7b5b0c23c8f', 'Daily Rewards', 'Free Spins', 'Login daily and claim free spins & cashback.', 'DAILY', 'accent', 'zap', 'Claim Reward', '40 10% 80%', '40 10% 96%', 0, true),
('ea81c7f5-7dbb-47d1-b80c-8773d273da1e', 'First Deposit Bonus', '100% Match', 'Get 200% bonus on your first deposit up to KSH500.', 'NEW USERS', 'primary', 'sparkles', 'Claim Bonus', '220 14% 80%', '220 14% 96%', 1, true),
('cae45a3e-0c54-470f-90fb-5f97067919e1', 'Weekend Special', '50% Cashback', 'This weekend only! Get 50% cashback on losses.', 'LIMITED', 'destructive', 'trophy', 'Play Now', '142 76% 80%', '142 76% 96%', 2, true)
ON CONFLICT (id) DO NOTHING;

-- Carousel Games
INSERT INTO public.carousel_games (id, game_name, game_route, poster_url, badge_type, sort_order, is_active) VALUES
('0f042140-4eda-4186-9330-82d73307ef27', 'Chicken Road', '/chicken-road', '/assets/games/chicken-road-poster.jpg', 'hot', 0, true),
('97ef4565-6973-47f7-a4b6-50e32366a4ed', 'Cricket Road -Coming soon', 'Coming soon', 'https://cdn.prod.website-files.com/65e508fe833fc8d3e049ee44/691d6e0af6a04bae85522127_cricket-road_720.png', 'trending', 1, true),
('34ceb8e0-0e3e-49d5-bac6-1b95c6b1e3fa', 'CrashX55', '/game', '/assets/games/crash-poster.jpg', 'hot', 1, true),
('33f5a958-3dcf-4a09-b9ac-9c1daa74bd8b', 'Aviator Red', '/aviator-red', '/assets/games/aviator-red-poster.jpg', 'hot', 2, true),
('87936c63-23d2-42d7-bb32-ed1a1a306d6c', 'Plinko', '/plinko', '/assets/games/plinko-poster.jpg', 'trending', 3, true),
('62bde128-0726-4186-a400-416fecbe49ab', 'Mines', '/mines', '/assets/games/mines-poster.jpg', 'hot', 4, true),
('aff38516-5a6a-4816-8963-13464f99e897', 'Coin Train', '/coin-train', '/assets/games/coin-train-poster.jpg', 'trending', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Payment Gateways
INSERT INTO public.payment_gateways (id, gateway_type, display_name, enabled, allowed_countries, currency_code, instructions, sort_order) VALUES
('7c686293-b6ef-40b3-85ed-d989c5632cb6', 'upi', 'UPI', false, ARRAY['IN'], 'INR', 'Scan QR code or use UPI ID to complete payment', 1),
('7d39f707-16bf-4384-9d75-f2d1838aa469', 'usdt', 'USDT (TRC20)', true, ARRAY['*'], 'INR', 'Send USDT to the provided wallet address', 2),
('d8a4cc49-a5e1-499a-a29e-23f07719223c', 'razorpay', 'Razorpay', true, ARRAY['IN'], 'INR', 'Pay using cards, UPI, netbanking, or wallets via Razorpay', 3),
('a852c97b-0626-4c41-9a76-bb8caf431d7f', 'stripe', 'Stripe', true, ARRAY['*'], 'INR', 'Pay securely with credit/debit cards via Stripe', 4),
('74ee43d2-5649-47b9-bbe0-9a4d9bcd7cfa', 'paypal', 'PayPal', false, ARRAY['*'], 'INR', 'Pay using your PayPal account', 5),
('cc8cd232-ad38-4e80-bbde-0b0e6657c75f', 'paytm', 'Paytm', true, ARRAY['IN'], 'INR', 'Pay using Paytm wallet or UPI', 6)
ON CONFLICT (id) DO NOTHING;

-- Homepage Banners
INSERT INTO public.homepage_banners (id, title, subtitle, button_text, button_link, background_color, text_color, sort_order, is_active) VALUES
('8f2500c1-bec5-4a6f-a347-1b9793307087', 'Chicken Road', 'Navigate the chicken across lanes and avoid cars to win big!', 'Play Now', '/chicken-road', '#4cd964', '#ffffff', 0, true)
ON CONFLICT (id) DO NOTHING;

-- Other Game Settings
INSERT INTO public.coin_flip_settings (id, rtp_percentage, house_edge, min_bet, max_bet, rtp_mode) VALUES ('5c7a044a-f6f8-4546-a7b6-a21dec563140', 30, 70, 10, 10000, 'low') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.wingo_settings (id, betting_duration_seconds, min_bet, max_bet, rtp_percentage, rtp_mode) VALUES ('fcfc1199-236f-469f-9ea9-6992aa727ae9', 30, 10, 10000, 98.0, 'auto') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.mines_settings (id, min_bet, max_bet, rtp_percentage, rtp_mode) VALUES ('00000000-0000-0000-0000-000000000001', 10, 100000, 30, 'standard') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.plinko_settings (id, rtp_percentage, min_bet, max_bet, rtp_mode) VALUES ('592498d0-e265-49f6-9038-a80c6a4fd3a5', 98, 1, 10000, 'balanced') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.aviator_settings (id, rtp_percentage, house_edge, min_bet, max_bet, rtp_mode, manual_crash_points) VALUES ('da9a61b7-402e-44e7-9d67-a063e527fc98', 30, 70, 10, 10000, 'low', ARRAY[1000]) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.coin_train_settings (id, rtp_percentage, house_edge, min_bet, max_bet, rtp_mode, use_manual_crash_point, manual_crash_points) VALUES ('fc3509d8-afef-45f6-94f1-126873768dd6', 30, 70, 10, 10000, 'low', true, ARRAY[8.5]) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.dragon_tiger_settings (id, min_bet, max_bet, rtp_percentage, rtp_mode) VALUES ('2f13c3fe-edda-47f2-8488-38686bbbc51e', 10, 10000, 97.00, 'auto') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.horse_racing_settings (id, number_of_horses, min_bet, max_bet, rtp_percentage, rtp_mode, manual_winner_enabled, manual_winner_horse) VALUES ('aa36f327-4947-4760-870f-1c23b77d7f08', 6, 1, 10000, 30, 'low', true, 6) ON CONFLICT (id) DO NOTHING;

-- Legal Documents
INSERT INTO public.legal_documents (id, document_type, title, content) VALUES
('9c27a42e-3f0f-4587-a8ad-2f926d28d17c', 'terms_of_service', 'Terms of Service', 'Please configure your Terms of Service content in the admin panel.'),
('405f93af-9bf0-4359-a00c-1b580c5e74b1', 'privacy_policy', 'Privacy Policy', 'Please configure your Privacy Policy content in the admin panel.')
ON CONFLICT (id) DO NOTHING;

-- Chicken Road How to Play
INSERT INTO public.chicken_road_how_to_play (id, title, content, rules) VALUES
('e49ac16c-28b9-43da-88ce-c2170f7db2c1', 'How to Play', 'Select your difficulty level and place your bet. Guide your chicken across the road by clicking GO. Each successful lane crossing increases your multiplier. Cash out anytime to secure your winnings. Hit a car and lose your bet!', '["Choose difficulty: Easy (30 lanes), Medium (25 lanes), Hard (22 lanes), Expert (18 lanes)", "Place your bet using preset buttons or custom amount", "Click GO to move the chicken forward one lane", "Each lane crossed increases your multiplier", "Click CASHOUT anytime to secure your winnings", "If the chicken hits a car, you lose your bet", "Higher difficulty = Higher risk = Higher rewards"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Spin Achievements
INSERT INTO public.spin_achievements (id, name, description, icon, achievement_type, criteria_value, badge_color) VALUES
('5501f9a7-6896-4f2b-84c5-0337cf369ebe', 'First Spin', 'Complete your first spin', '🎰', 'total_spins', 1, '#10b981'),
('8eaa8b99-9f1f-4fef-95d1-51f038c12fff', 'Lucky 7', 'Spin 7 days in a row', '🍀', 'streak', 7, '#f59e0b'),
('59435aa7-1ffa-40c9-bd61-fbf7a17e6b08', 'Dedicated Spinner', 'Maintain a 14-day streak', '🔥', 'streak', 14, '#f97316'),
('d199e36a-c067-421c-ac3e-5691c56e9646', 'Persistent', 'Maintain a 30-day streak', '🌟', 'streak', 30, '#8b5cf6'),
('67389320-b668-4426-8b86-987e1857273f', 'Spin Master', 'Complete 30 spins', '⭐', 'total_spins', 30, '#3b82f6'),
('6a458c82-0cef-46d7-a304-4205fbe8dab9', 'Big Winner', 'Win $100 or more in a single spin', '💰', 'win_amount', 100, '#fbbf24'),
('4d0a03dd-208b-4f6b-b76c-68b2d436cfab', 'Mega Winner', 'Win $200 or more in a single spin', '💎', 'win_amount', 200, '#a855f7'),
('8419f556-0330-475b-9432-ac87d69e47b8', 'Legendary Winner', 'Win $500 in a single spin', '👑', 'win_amount', 500, '#ef4444'),
('1670797e-efa1-4496-8301-41b2d43dccf9', 'Millionaire Path', 'Earn $1000 total from spins', '🏆', 'total_earnings', 1000, '#dc2626')
ON CONFLICT (id) DO NOTHING;
