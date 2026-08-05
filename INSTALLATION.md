# 📦 Installation Guide

Complete step-by-step guide to set up the Multi-Game Casino Platform.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Local Development Setup](#local-development-setup)
4. [Database Configuration](#database-configuration)
5. [Edge Functions Deployment](#edge-functions-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Admin Account Setup](#admin-account-setup)
8. [Payment Gateway Configuration](#payment-gateway-configuration)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js** 18.x or higher ([Download](https://nodejs.org))
- **npm** 9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com))
- **Supabase CLI** (we'll install this)

### Required Accounts
- **Supabase** account ([Sign up](https://supabase.com))
- **Payment Gateway** accounts (optional for testing):
  - Razorpay ([Sign up](https://razorpay.com))
  - Stripe ([Sign up](https://stripe.com))
  - PayPal ([Sign up](https://paypal.com))
  - Paytm ([Sign up](https://paytm.com))

---

## Supabase Setup

### 1. Create a New Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: Your casino platform name
   - **Database Password**: Strong password (save this!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

### 2. Get Project Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in sidebar)
2. Navigate to **API** section
3. Copy these values (you'll need them later):
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **Project API Key** (anon/public key)
   - **Project Reference ID** (from URL or settings)

### 3. Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Auth Providers**, enable:
   - ✅ **Email** (enabled by default)
   - ✅ **Google** (optional, configure OAuth)
3. Under **Email Auth**, configure:
   - ✅ Enable email confirmations: **ON**
   - ✅ Enable email change confirmations: **ON**
   - ✅ Secure email change: **ON**
4. Click **Save**

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone <your-repository-url>
cd casino-platform
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Install Supabase CLI

```bash
npm install -g supabase
```

Verify installation:
```bash
supabase --version
```

### 4. Link to Your Supabase Project

```bash
supabase link --project-ref your-project-reference-id
```

Enter your database password when prompted.

---

## Database Configuration

### 1. Review Migration Files

Check the migration files in `supabase/migrations/` to understand the database schema.

### 2. Push Migrations to Supabase

```bash
supabase db push
```

This will create all necessary tables:
- `profiles` - User profiles
- `game_settings` - Global game configuration
- `game_rounds` - Crash/Aviator/Coin Train rounds
- `bets` - Player bets
- `coin_flip_rounds`, `coin_flip_bets` - Coin Flip game
- `cycling_race_races`, `cycling_race_bets` - Cycle Race game
- `plinko_bets` - Plinko game
- `mines_bets` - Mines game
- `wingo_rounds`, `wingo_bets` - Wingo game
- `referral_codes`, `referrals` - Referral system
- `transactions` - Deposit/withdrawal tracking
- `loan_transactions` - Loan system
- `commission_transactions` - Referral commissions
- `payment_gateways` - Payment configuration
- `custom_themes` - Theme customization
- `legal_documents` - Terms, privacy policy
- And more...

### 3. Verify Tables Created

1. Go to Supabase Dashboard → **Table Editor**
2. Confirm all tables are listed
3. Check Row Level Security (RLS) is enabled on all tables

### 4. Insert Initial Data

Run this SQL in Supabase **SQL Editor**:

```sql
-- Insert default game settings
INSERT INTO game_settings (id, currency_symbol, currency_name) 
VALUES ('00000000-0000-0000-0000-000000000001', '₹', 'INR')
ON CONFLICT (id) DO NOTHING;

-- Insert default Aviator settings
INSERT INTO aviator_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert default Coin Train settings
INSERT INTO coin_train_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert default Coin Flip settings
INSERT INTO coin_flip_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert default Cycle Race settings
INSERT INTO cycling_race_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert default Plinko settings
INSERT INTO plinko_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert default Mines settings
INSERT INTO mines_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Insert homepage carousel games
INSERT INTO carousel_games (game_name, game_route, poster_url, badge_type, sort_order, is_active)
VALUES 
  ('Crash', '/game', '/assets/games/crash-poster.jpg', 'hot', 1, true),
  ('Aviator Red', '/aviator-red', '/assets/games/aviator-red-poster.jpg', 'new', 2, true),
  ('Coin Train', '/coin-train', '/assets/games/coin-train-poster.jpg', 'trending', 3, true),
  ('Plinko', '/plinko', '/assets/games/plinko-poster.jpg', 'popular', 4, true),
  ('Mines', '/mines', '/assets/games/mines-poster.jpg', 'hot', 5, true),
  ('Coin Flip', '/coin-flip', '/assets/games/coin-flip-poster.jpg', 'new', 6, true),
  ('Cycle Race', '/cycle-race', '/assets/games/cycle-race-poster.jpg', 'trending', 7, true),
  ('Wingo', '/wingo', '/assets/games/wingo-poster.jpg', 'popular', 8, true)
ON CONFLICT DO NOTHING;
```

---

## Edge Functions Deployment

Edge functions power the game engines with server-side logic.

### 1. Deploy All Functions

```bash
# Deploy all functions at once
supabase functions deploy game-engine
supabase functions deploy aviator-engine
supabase functions deploy coin-train-engine
supabase functions deploy coin-flip-engine
supabase functions deploy cycling-race-engine
supabase functions deploy plinko-engine
supabase functions deploy wingo-engine
supabase functions deploy process-transaction
supabase functions deploy process-referral
supabase functions deploy process-loan
supabase functions deploy get-currency-rate
supabase functions deploy get-user-country
supabase functions deploy generate-avatar
```

### 2. Verify Deployment

1. Go to Supabase Dashboard → **Edge Functions**
2. Confirm all functions are listed and active
3. Check execution logs for any errors

---

## Environment Configuration

### 1. Create Environment File

```bash
cp .env.example .env
```

### 2. Configure Variables

Edit `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id

# Optional: Payment Gateway Keys (for testing)
# RAZORPAY_KEY_ID=your-razorpay-key
# RAZORPAY_KEY_SECRET=your-razorpay-secret
# STRIPE_SECRET_KEY=your-stripe-secret
# PAYPAL_CLIENT_ID=your-paypal-client-id
# PAYTM_MERCHANT_KEY=your-paytm-key
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` - you should see the homepage!

---

## Admin Account Setup

### 1. Create Admin User

1. Go to `http://localhost:5173`
2. Click **Sign Up** 
3. Create an account with:
   - Username: admin
   - Email: admin@yourplatform.com
   - Password: (strong password)

### 2. Grant Admin Role

In Supabase **SQL Editor**, run:

```sql
-- Replace with your actual user ID from profiles table
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id-here', 'admin');
```

To find your user ID:
```sql
SELECT id, email FROM profiles WHERE email = 'admin@yourplatform.com';
```

### 3. Access Admin Panel

1. Log out and log back in
2. Go to `/admin-login`
3. Enter PIN: `53207610` (default master PIN)
4. You should see the full admin panel

### 4. Change Default PINs

**Important**: Change default PINs immediately!

In admin panel:
1. Go to **System Settings**
2. Change admin PIN from `53207610`
3. Change master panel PIN

---

## Payment Gateway Configuration

### 1. Razorpay (India)

1. Get API keys from [Razorpay Dashboard](https://dashboard.razorpay.com)
2. In admin panel → **Payment Gateways**
3. Enable Razorpay
4. Enter:
   - Key ID
   - Key Secret
5. Set allowed countries: `["IN"]`
6. Configure min/max amounts
7. Save

### 2. Stripe (Global)

1. Get API keys from [Stripe Dashboard](https://dashboard.stripe.com)
2. In admin panel → **Payment Gateways**
3. Enable Stripe
4. Enter:
   - Publishable Key
   - Secret Key
5. Set allowed countries: `["*"]` (all)
6. Save

### 3. PayPal (Global)

1. Get Client ID from [PayPal Developer](https://developer.paypal.com)
2. In admin panel → **Payment Gateways**
3. Enable PayPal
4. Enter Client ID
5. Save

### 4. Paytm (India)

1. Get Merchant Key from [Paytm Business](https://business.paytm.com)
2. In admin panel → **Payment Gateways**
3. Enable Paytm
4. Enter Merchant Key
5. Save

---

## Testing

### 1. Test User Registration

1. Sign up with a new test account
2. Verify email confirmation (check Supabase Auth logs)
3. Log in successfully

### 2. Test Game Functionality

For each game:
1. Place a bet
2. Wait for round to complete
3. Verify balance updates
4. Check bet appears in history

### 3. Test Admin Panel

1. Access `/admin-login`
2. Enter PIN
3. Navigate through all admin sections
4. Modify game settings
5. Verify changes reflect in games

### 4. Test Transactions

1. Go to Wallet page
2. Click Deposit
3. Select payment method
4. Test deposit flow (use sandbox/test mode)
5. Verify transaction appears in admin panel

### 5. Test Referrals

1. Copy referral code from profile
2. Sign up new account with referral code
3. Verify referral reward in database
4. Check commission tracking

---

## Troubleshooting

### Database Connection Errors

**Error**: `Could not connect to database`

**Solution**:
1. Check `.env` has correct Supabase URL
2. Verify project is not paused (Supabase free tier pauses after inactivity)
3. Check firewall/network settings

### Edge Function Errors

**Error**: `Function invocation failed`

**Solution**:
1. Check function logs in Supabase Dashboard
2. Verify function was deployed: `supabase functions list`
3. Redeploy: `supabase functions deploy function-name`

### Authentication Issues

**Error**: `Invalid login credentials`

**Solution**:
1. Check email confirmation is enabled in Supabase Auth settings
2. For testing, disable email confirmation
3. Verify user exists in `auth.users` table

### RLS Policy Errors

**Error**: `Row level security policy violation`

**Solution**:
1. Check user is authenticated
2. Verify RLS policies in Supabase Table Editor
3. For admin tables, ensure user has admin role

### Build Errors

**Error**: `Module not found` or `Cannot find module`

**Solution**:
1. Delete `node_modules` and reinstall:
   ```bash
   rm -rf node_modules
   npm install
   ```
2. Clear build cache:
   ```bash
   rm -rf dist
   npm run build
   ```

### Payment Gateway Issues

**Error**: Payment fails or returns error

**Solution**:
1. Verify API keys are correct (no extra spaces)
2. Check gateway is in test/sandbox mode
3. Ensure allowed countries include user's country
4. Check min/max amounts match transaction

---

## Next Steps

✅ Installation complete!

Now you can:
1. **Customize branding** - Update logo, name, colors in admin panel
2. **Configure games** - Set RTP, bet limits, house edge
3. **Add content** - Create legal documents, promotions
4. **Test thoroughly** - All games, payments, admin features
5. **Deploy to production** - See [DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## Support

If you encounter issues:
1. Check [Troubleshooting](#troubleshooting) section
2. Review [API Documentation](./docs/API_DOCUMENTATION.md)
3. Check Supabase logs for errors
4. Create an issue on GitHub

---

**🎉 Congratulations!** Your casino platform is now set up and ready for development.
