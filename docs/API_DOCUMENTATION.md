# 📡 API Documentation

## Edge Functions

### Game Engines

**game-engine** - Crash game logic
**aviator-engine** - Aviator Red logic
**coin-train-engine** - Coin Train logic
**coin-flip-engine** - Coin Flip logic
**cycling-race-engine** - Cycle Race logic
**plinko-engine** - Plinko logic
**wingo-engine** - Wingo logic

### Utility Functions

**process-transaction** - Handle deposits/withdrawals
**process-referral** - Process referral rewards
**process-loan** - Handle loan requests
**get-currency-rate** - Live currency conversion
**get-user-country** - IP geolocation
**generate-avatar** - Avatar generation

## Database Schema

See migration files in `supabase/migrations/` for complete schema.

## Authentication

All API calls require valid Supabase JWT token in Authorization header.

For detailed implementation, see source code in `supabase/functions/`.
