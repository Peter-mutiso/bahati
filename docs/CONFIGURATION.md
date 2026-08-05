# ⚙️ Configuration Guide

Complete guide to configuring the Multi-Game Casino Platform.

## Table of Contents
1. [Environment Variables](#environment-variables)
2. [Database Configuration](#database-configuration)
3. [Game Settings](#game-settings)
4. [Payment Gateways](#payment-gateways)
5. [Branding](#branding)
6. [Security](#security)
7. [Advanced Settings](#advanced-settings)

---

## Environment Variables

### Required Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id

# Optional: Custom API Endpoints
VITE_API_URL=https://api.yourplatform.com
```

### Optional Variables

```env
# Development Mode
VITE_DEV_MODE=true

# Analytics
VITE_ANALYTICS_ID=your-analytics-id

# Feature Flags
VITE_ENABLE_CHAT=true
VITE_ENABLE_REFERRALS=true
VITE_ENABLE_LOANS=true
```

---

## Database Configuration

### Initial Setup

Run this SQL in Supabase SQL Editor to configure defaults:

```sql
-- Update default game settings
UPDATE game_settings
SET 
  currency_symbol = '₹',
  currency_name = 'INR',
  website_name = 'Your Casino Name',
  house_edge = 3,
  referral_reward_amount = 100,
  referral_first_deposit_commission_percent = 10,
  referral_bet_commission_percent = 2,
  first_deposit_bonus_percent = 50,
  deposit_bonus_percentage = 10,
  wager_requirement_multiplier = 1,
  min_deposit = 100,
  max_deposit = 100000
WHERE id = '00000000-0000-0000-0000-000000000001';
```

### Currency Configuration

```sql
-- Set default currency
UPDATE game_settings
SET 
  currency_symbol = '$',  -- Change to your currency symbol
  currency_name = 'USD'   -- Change to your currency code
WHERE id = '00000000-0000-0000-0000-000000000001';
```

Supported currencies:
- INR (₹)
- USD ($)
- EUR (€)
- GBP (£)
- JPY (¥)
- CNY (¥)

---

## Game Settings

### Global Settings

Configure in **Admin Panel → Game Settings** or via SQL:

```sql
UPDATE game_settings
SET 
  house_edge = 3,                              -- 3% house edge
  min_crash_point = 1.01,                      -- Minimum multiplier
  max_crash_point = 10000,                     -- Maximum multiplier
  rtp_percentage = 97,                         -- Return to player %
  auto_rtp_enabled = false,                    -- Auto RTP adjustment
  use_manual_crash_point = false               -- Manual crash control
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Crash Game Settings

```sql
UPDATE game_settings
SET 
  manual_crash_points = ARRAY[2.5, 3.0, 5.0],  -- Predefined crash points
  preparing_duration_seconds = 5                -- Countdown duration
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Aviator Red Settings

```sql
UPDATE aviator_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 3,
  rtp_percentage = 97,
  preparing_duration_seconds = 5,
  use_manual_crash_point = false,
  manual_crash_points = NULL,
  auto_rtp_enabled = false
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Coin Train Settings

Same structure as Aviator:

```sql
UPDATE coin_train_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 3,
  rtp_percentage = 97
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Plinko Settings

```sql
UPDATE plinko_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 3,
  rtp_percentage = 97,
  rtp_mode = 'high'  -- Options: 'low', 'medium', 'high'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**RTP Modes**:
- Low: 30% RTP (70% house edge)
- Medium: 50% RTP (50% house edge)
- High: 97% RTP (3% house edge)

---

### Mines Settings

```sql
UPDATE mines_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 3,
  rtp_percentage = 97
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Coin Flip Settings

```sql
UPDATE coin_flip_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 2,
  betting_duration_seconds = 30,
  flip_duration_seconds = 5,
  manual_result_enabled = false,
  manual_result = NULL  -- Options: 'heads', 'tails'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Cycle Race Settings

```sql
UPDATE cycling_race_settings
SET 
  min_bet = 10,
  max_bet = 10000,
  house_edge = 5,
  number_of_cyclists = 6,
  betting_duration_seconds = 20,
  race_duration_seconds = 30,
  manual_winner_enabled = false,
  manual_winner_cyclist = NULL  -- Number 1-6
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Wingo Settings

Wingo uses dynamic configuration from admin panel.

---

## Payment Gateways

### Razorpay (India)

**Admin Panel Configuration**:
1. Go to **Admin Panel → Payment Gateways**
2. Click on Razorpay
3. Fill in:
   - Display Name: "Razorpay"
   - Enabled: Yes
   - Key ID: Your Razorpay Key ID
   - Key Secret: Your Razorpay Key Secret
   - Allowed Countries: ["IN"]
   - Min Amount: 100
   - Max Amount: 100000
   - Processing Fee %: 2
   - Processing Fee Fixed: 0
   - Currency Code: INR

**SQL Configuration**:
```sql
INSERT INTO payment_gateways (
  gateway_type, display_name, enabled, 
  api_key, api_secret, 
  allowed_countries, min_amount, max_amount,
  processing_fee_percent, processing_fee_fixed,
  currency_code
)
VALUES (
  'razorpay', 'Razorpay', true,
  'rzp_live_your_key_id', 'your_key_secret',
  ARRAY['IN'], 100, 100000,
  2.0, 0,
  'INR'
);
```

---

### Stripe (Global)

```sql
INSERT INTO payment_gateways (
  gateway_type, display_name, enabled,
  api_key, api_secret,
  allowed_countries, min_amount, max_amount,
  processing_fee_percent, processing_fee_fixed,
  currency_code
)
VALUES (
  'stripe', 'Credit/Debit Card', true,
  'pk_live_your_publishable_key', 'sk_live_your_secret_key',
  ARRAY['*'],  -- All countries
  10, 50000,
  2.9, 0.30,
  'USD'
);
```

---

### PayPal (Global)

```sql
INSERT INTO payment_gateways (
  gateway_type, display_name, enabled,
  api_key,
  allowed_countries, min_amount, max_amount,
  processing_fee_percent, processing_fee_fixed,
  currency_code
)
VALUES (
  'paypal', 'PayPal', true,
  'your_paypal_client_id',
  ARRAY['*'],
  20, 50000,
  3.5, 0.30,
  'USD'
);
```

---

### Paytm (India)

```sql
INSERT INTO payment_gateways (
  gateway_type, display_name, enabled,
  api_key, api_secret,
  allowed_countries, min_amount, max_amount,
  processing_fee_percent,
  currency_code
)
VALUES (
  'paytm', 'Paytm Wallet', true,
  'your_merchant_id', 'your_merchant_key',
  ARRAY['IN'],
  10, 100000,
  1.0,
  'INR'
);
```

---

## Branding

### Website Name and Logo

**Admin Panel**: 
1. Go to **Admin Panel → Website Settings**
2. Update:
   - Website Name
   - Logo URL (upload to Supabase Storage)
   - Favicon URL

**SQL**:
```sql
UPDATE game_settings
SET 
  website_name = 'Your Casino Name',
  website_logo_url = 'https://your-storage-url/logo.png',
  favicon_url = 'https://your-storage-url/favicon.ico'
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Theme Configuration

**Pre-built Themes**:
```sql
-- Set active theme
UPDATE game_settings
SET theme_name = 'neon-cyan'  -- Options: neon-cyan, purple-haze, electric-blue, ocean-breeze, sunset-glow, forest-green
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Custom Themes**:
Use Admin Panel → Custom Theme Builder to create and manage custom themes.

---

## Security

### Authentication Settings

**Supabase Dashboard → Authentication → Settings**:

1. **Email Auth**:
   - Enable email confirmations: ON
   - Enable email change confirmations: ON
   - Secure email change: ON

2. **Session Management**:
   - JWT expiry: 3600 seconds (1 hour)
   - Refresh token expiry: 2592000 seconds (30 days)

3. **Password Requirements**:
   - Minimum length: 8 characters
   - Require uppercase: Yes
   - Require numbers: Yes
   - Require special characters: Yes

---

### Row Level Security (RLS)

**Verify RLS is enabled** on all tables:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS on a table if needed
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;
```

**Important Tables with RLS**:
- ✅ profiles
- ✅ transactions
- ✅ bets (all game types)
- ✅ referral_codes
- ✅ loan_transactions
- ✅ commission_transactions
- ✅ payment_gateways (admin only)

---

### Admin Roles

**Create Admin User**:

```sql
-- 1. Find user ID
SELECT id FROM profiles WHERE email = 'admin@example.com';

-- 2. Grant admin role
INSERT INTO user_roles (user_id, role)
VALUES ('user-id-here', 'admin');
```

**Admin Permissions**:
- Access to admin panel
- Manage game settings
- Approve transactions
- View analytics
- Manage users
- Configure payment gateways

---

### Country Blocking

**Configure in Master Panel**:

```sql
UPDATE game_settings
SET 
  country_blocking_enabled = true,
  blocked_countries = ARRAY['US', 'UK', 'AU']  -- ISO country codes
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**How it works**:
- Uses IP geolocation via `get-user-country` edge function
- Blocks access to games for specified countries
- Shows "Restricted Region" dialog

---

## Advanced Settings

### Referral Configuration

```sql
UPDATE game_settings
SET 
  referral_reward_amount = 100,                         -- New user reward
  referral_first_deposit_commission_percent = 10,       -- Referrer commission on first deposit
  referral_bet_commission_percent = 2                   -- Ongoing commission per bet
WHERE id = '00000000-0000-0000-0000-000000000001';
```

---

### Bonus Configuration

```sql
UPDATE game_settings
SET 
  first_deposit_bonus_percent = 100,          -- 100% match on first deposit
  first_deposit_bonus_fixed_amount = NULL,    -- Or fixed amount
  deposit_bonus_percentage = 10,              -- Bonus on subsequent deposits
  wager_requirement_multiplier = 1            -- 1x wagering required
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Wager Requirements**:
- Multiplier of 1 = must wager bonus amount 1x
- Multiplier of 5 = must wager bonus amount 5x
- Set to 0 to disable wager requirements

---

### VIP Tiers

**Create VIP Tiers**:

```sql
INSERT INTO vip_tiers (name, min_deposit, benefits, bet_limit_multiplier)
VALUES 
  ('Bronze', 0, '{"description": "Standard benefits"}', 1.0),
  ('Silver', 10000, '{"description": "5% bonus on deposits"}', 1.5),
  ('Gold', 50000, '{"description": "10% bonus + priority support"}', 2.0),
  ('Platinum', 100000, '{"description": "15% bonus + exclusive games"}', 3.0),
  ('Diamond', 500000, '{"description": "20% bonus + personal manager"}', 5.0);
```

---

### Loan System

```sql
UPDATE game_settings
SET loan_feature_enabled = true
WHERE id = '00000000-0000-0000-0000-000000000001';
```

**Loan Configuration** (in edge function `process-loan`):
- Loan amount: 50% of user's total deposited
- Maximum loan: 1000 (default)
- Recovery: Deducted from next deposit

---

### Homepage Carousel

**Add/Edit Games**:

```sql
INSERT INTO carousel_games (
  game_name, game_route, poster_url, 
  badge_type, rtp_percentage, active_players,
  sort_order, is_active
)
VALUES (
  'New Game', '/new-game', '/assets/games/new-poster.jpg',
  'hot', 97, 100,
  9, true
);
```

**Badge Types**:
- hot
- new
- trending
- popular

---

### Legal Documents

**Configure via Admin Panel → Legal Documents** or SQL:

```sql
INSERT INTO legal_documents (document_type, title, content)
VALUES (
  'terms', 
  'Terms of Service',
  '<h1>Terms of Service</h1><p>Your content here...</p>'
);
```

**Document Types**:
- terms (Terms of Service)
- privacy (Privacy Policy)
- responsible (Responsible Gaming)
- cookies (Cookie Policy)
- aml (AML Policy)

---

## Environment-Specific Configuration

### Development

```env
VITE_DEV_MODE=true
VITE_SUPABASE_URL=https://dev-project.supabase.co
```

### Staging

```env
VITE_DEV_MODE=false
VITE_SUPABASE_URL=https://staging-project.supabase.co
```

### Production

```env
VITE_DEV_MODE=false
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_ANALYTICS_ID=your-production-analytics-id
```

---

## Backup Configuration

**Automated Backups** (Supabase):
1. Go to Supabase Dashboard → Database → Backups
2. Enable daily backups
3. Set retention period (7 days free tier)

**Manual Backup**:
```bash
# Export database
supabase db dump -f backup.sql

# Export storage
supabase storage download bucket-name ./backup-storage
```

---

## Performance Optimization

### Database Indexes

Important indexes already created in migrations. To add more:

```sql
-- Index on frequently queried columns
CREATE INDEX idx_bets_user_created ON bets(user_id, created_at DESC);
CREATE INDEX idx_transactions_user_status ON transactions(user_id, status);
```

### Edge Function Configuration

In `supabase/functions/deno.json`:

```json
{
  "tasks": {
    "start": "deno run --allow-all --unstable main.ts"
  },
  "nodeModulesDir": true
}
```

---

## Troubleshooting

### Reset Configuration

**Reset to defaults**:

```sql
-- Reset game settings
UPDATE game_settings
SET 
  house_edge = 3,
  rtp_percentage = 97,
  auto_rtp_enabled = false
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Reset all game-specific settings
-- (Run for each: aviator_settings, coin_train_settings, etc.)
```

---

For deployment configuration, see [DEPLOYMENT.md](./DEPLOYMENT.md).
