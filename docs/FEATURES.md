# 🎮 Features Documentation

Comprehensive guide to all features in the Multi-Game Casino Platform.

## Table of Contents
1. [Games](#games)
2. [User Features](#user-features)
3. [Admin Features](#admin-features)
4. [Payment System](#payment-system)
5. [Referral System](#referral-system)
6. [Analytics](#analytics)

---

## Games

### 1. Crash Game (Rocket)

**Description**: Classic multiplier-based crash game where a rocket flies upward with an increasing multiplier until it crashes.

**Features**:
- Real-time multiplayer betting
- Auto-cashout functionality
- Live bet tracking
- Provably fair verification
- Recent crashes history
- Responsive design

**Game Settings** (Admin Configurable):
- Minimum bet: Default 10
- Maximum bet: Default 10,000
- House edge: 3%
- RTP percentage: 97%
- Manual crash point override
- Preparing duration: 5 seconds

**How to Play**:
1. Place a bet before round starts
2. Watch the rocket fly with increasing multiplier
3. Cash out before crash to win
4. If crash happens before cashout, bet is lost

---

### 2. Aviator Red (Jet)

**Description**: Premium variant of crash game featuring a 3D Dassault Rafale fighter jet with enhanced visuals.

**Unique Features**:
- 3D jet model with afterburner effects
- Sonic boom visual effects at 10x+ multipliers
- Runway takeoff animation
- Daydream theme with god rays
- Jet engine sound effects

**Game Settings**: Same as Crash game

---

### 3. Coin Train

**Description**: Horizontal train-themed multiplayer game with 3D locomotive and cargo cars.

**Features**:
- 3D train rendering from side view
- Multiple cargo cars with gold coins
- Live passengers (bet tracking)
- Random AI players for engagement
- Provably fair system

**Game Settings**:
- Similar to Crash game
- Horizontal gameplay direction
- Train-specific visual assets

---

### 4. Plinko

**Description**: Physics-based ball drop game where balls fall through pegs and land in multiplier slots.

**Features**:
- Realistic physics simulation
- 3 risk levels (Low, Medium, High)
- Configurable row count (8-16 rows)
- Auto-bet functionality
- Premium animations
- Live bet tracking

**Game Settings**:
- Minimum bet: 10
- Maximum bet: 10,000
- House edge: 3%
- RTP modes: Low (30%), Medium (50%), High (97%)

**Risk Levels**:
- **Low**: Smaller variance, consistent small wins
- **Medium**: Balanced risk/reward
- **High**: High variance, chance for big wins

---

### 5. Mines

**Description**: Grid-based gem mining game where players reveal tiles to find gems while avoiding mines.

**Features**:
- 5x5 grid layout
- Player-selectable mine count (1-24)
- Progressive multiplier system
- Cash out anytime
- Provably fair verification
- Advanced animations

**Game Settings**:
- Minimum bet: 10
- Maximum bet: 10,000
- Grid size: 5x5 (25 tiles)
- Configurable house edge

**How to Play**:
1. Select bet amount and number of mines
2. Click tiles to reveal gems
3. Each gem increases multiplier
4. Cash out before hitting a mine
5. Hitting a mine = bet lost

---

### 6. Coin Flip

**Description**: Simple real-time coin flip betting with 3D coin animation.

**Features**:
- 3D coin rendering
- Two betting sides (Heads/Tails)
- Real-time synchronization
- Winner history bar
- Provably fair verification

**Game Settings**:
- Minimum bet: 10
- Maximum bet: 10,000
- House edge: 2%
- Betting duration: 30 seconds
- Flip animation duration: 5 seconds

**Payout**: 1.98x (2% house edge)

---

### 7. Cycle Race

**Description**: Multi-lane racing game with 6 cyclists competing in real-time synchronized races.

**Features**:
- 6 racing lanes
- Real-time race animations
- Bet on any cyclist
- Live betting pool display
- 8-phase timer system
- Winner history bar

**Game Settings**:
- Number of cyclists: 6
- Minimum bet: 10
- Maximum bet: 10,000
- Race duration: 30 seconds
- Betting duration: 20 seconds
- Manual winner selection (admin)

**Timer Phases**:
1. Lobby open (join)
2. Warmup visuals
3. Betting open
4. Betting lock (10s countdown)
5. Final sync
6. Race start
7. Mid-race (live events)
8. Finish & payout

---

### 8. Wingo

**Description**: Color prediction game with 30 color options and big/small betting.

**Features**:
- 30 color selections
- Big/Small predictions
- Number predictions (0-9)
- Period-based rounds
- Trend view (result history)
- Win/loss popup notifications
- Liquid waving button animations

**Game Settings**:
- Minimum bet: 10
- Maximum bet: 10,000
- Period duration: Configurable
- Manual result override (admin)

**Betting Options**:
- **Colors**: 30 different colors
- **Numbers**: 0-9
- **Big**: Numbers 5-9
- **Small**: Numbers 0-4

**Payouts**:
- Color match: Varies by color odds
- Number match: 9x
- Big/Small: 2x

---

## User Features

### Authentication

**Sign Up**:
- Email + password
- Username selection
- Optional referral code
- Auto-confirmation (configurable)

**Sign In**:
- Email + password
- Google OAuth (optional)
- "Remember me" functionality
- Password reset via email

**Profile Management**:
- Avatar selection (human faces)
- Username change
- Email preferences
- Security PIN setup

---

### Wallet System

**Features**:
- Real-time balance updates
- Multi-currency support (6 currencies)
- Deposit functionality
- Withdrawal requests
- Transaction history
- Commission earnings tracking

**Currencies Supported**:
- INR (Indian Rupee) - Default
- USD (US Dollar)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- CNY (Chinese Yuan)

**Wager Requirements**:
- Deposit bonus requires wagering
- Configurable multiplier (default 1x)
- Progress bar tracking
- Clear display of requirements

---

### Referral System

**Features**:
- Unique referral codes
- QR code sharing
- Commission tracking
- Two commission types:
  - First deposit commission
  - Betting commission (ongoing)

**How It Works**:
1. User generates referral code
2. Shares code with friends
3. Friend signs up with code
4. User earns reward when friend makes first deposit
5. User earns commission on friend's bets

**Commission Rates** (Admin Configurable):
- First deposit: 10% (default)
- Betting commission: 2% (default)

---

### Game History

**Features**:
- All games in one view
- Filterable by game type
- Sortable by date/amount
- Detailed bet information
- Profit/loss tracking
- Export functionality

**Information Displayed**:
- Game name
- Bet amount
- Result (win/loss)
- Multiplier
- Profit/loss
- Timestamp

---

### VIP System

**Tiers**:
- Bronze (Default)
- Silver
- Gold
- Platinum
- Diamond

**Benefits**:
- Higher bet limits
- Exclusive bonuses
- Priority support
- Reduced house edge (optional)
- Special promotions

**Progression**:
- Based on total deposits
- Based on total wagered
- Configurable thresholds

---

## Admin Features

### Dashboard

**System Overview**:
- Total users
- Active users (today)
- Total deposits
- Total withdrawals
- Total bets
- Total profit
- Live betting monitors

---

### User Management

**Features**:
- View all users
- Search by username/email
- Filter by status/VIP tier
- Edit user details
- Adjust balances
- Ban/suspend users
- View user activity

**User Details**:
- Registration date
- Total deposited
- Total wagered
- Current balance
- VIP tier
- Referral code
- Recent bets

---

### Transaction Management

**Deposit Workflow**:
1. User submits deposit request
2. Request appears in admin panel
3. Admin reviews proof
4. Admin approves/rejects
5. Balance updated automatically

**Withdrawal Workflow**:
1. User submits withdrawal request
2. Request appears in admin panel
3. Admin reviews account status
4. Admin processes payment externally
5. Admin marks as paid
6. Balance deducted

**Features**:
- Bulk approve/reject
- Transaction history
- Export reports
- Filter by status/method
- Manual balance adjustment

---

### Game Settings

**Global Settings**:
- Currency configuration
- Deposit/withdrawal limits
- Wager requirements
- Referral commissions
- Bonus percentages
- Country blocking

**Per-Game Settings**:
Each game has dedicated settings:
- Minimum/maximum bets
- House edge
- RTP percentage
- Game durations
- Manual result override
- Auto RTP mode

---

### Payment Gateway Configuration

**Supported Gateways**:
1. **Razorpay** (India)
2. **Stripe** (Global)
3. **PayPal** (Global)
4. **Paytm** (India)

**Configuration Options**:
- Enable/disable gateway
- API credentials
- Country restrictions
- Min/max amounts
- Processing fees (% + fixed)
- Currency codes
- QR code upload (for UPI/crypto)

---

### RTP Management

**Modes**:
- **Manual**: Admin controls house edge
- **Auto**: System adjusts RTP dynamically

**Features**:
- Real-time profit tracking
- Target RTP percentage
- Current profit vs target
- Game-specific RTP
- Historical RTP data

**Auto RTP**:
- Monitors actual RTP
- Compares to target
- Adjusts crash points/results
- Ensures profitability

---

### Theme Management

**Pre-built Themes**:
- Neon Cyan (Dark)
- Purple Haze (Dark)
- Electric Blue (Dark)
- Ocean Breeze (Light)
- Sunset Glow (Light)
- Forest Green (Light)

**Custom Theme Builder**:
- Visual theme creator
- Color customization
- Gradient configuration
- Shadow settings
- Border radius
- Preview in real-time
- Save custom themes
- Edit/delete themes

---

### Legal Documents

**Document Types**:
- Terms of Service
- Privacy Policy
- Responsible Gaming
- Cookie Policy
- AML Policy

**Features**:
- Rich text editor
- Version control
- Last updated timestamp
- Public display pages

---

### Activity Logs

**Tracked Activities**:
- Admin logins
- Settings changes
- User actions (admin)
- Transaction approvals
- Balance adjustments
- Game setting changes

**Log Details**:
- Timestamp
- Admin user
- Action type
- Description
- Old value → New value

---

### Live Betting Monitors

**Per-Game Monitors**:
- Current round information
- Time remaining
- Active bets count
- Total wagered (current round)
- Betting pool distribution
- "Process Round Now" button

**Available For**:
- Coin Flip
- Wingo
- Cycle Race
- (Crash games auto-process)

---

### Master Panel

**Access**: Separate PIN-protected panel at `/master-panel`

**Features**:
- Country blocking configuration
- System-wide controls
- Emergency stop buttons
- Database maintenance
- Advanced settings

---

## Payment System

### Deposit Methods

**UPI** (India):
- Razorpay integration
- QR code display
- UTR number entry
- Instant verification (admin)

**Credit/Debit Cards**:
- Stripe integration
- Secure payment form
- 3D Secure support
- International cards

**PayPal**:
- Quick checkout
- Verified accounts
- Instant deposits

**Paytm Wallet** (India):
- Quick UPI transfer
- QR code payment
- Instant settlement

---

### Withdrawal Methods

**Bank Transfer**:
- Account details required
- Manual processing
- 1-3 business days

**UPI** (India):
- UPI ID required
- Fast processing
- Usually same day

**PayPal**:
- Email required
- 24-48 hours
- International support

---

### Transaction Security

**Features**:
- Two-factor authentication (optional)
- Withdrawal PIN
- Email confirmations
- Transaction limits
- Fraud detection
- AML compliance

---

## Referral System

### Referral Codes

**Generation**:
- Unique 8-character code
- Auto-generated on signup
- Custom codes (optional)

**Sharing**:
- Copy link
- QR code download
- Social media sharing
- Email invite

---

### Commission Structure

**First Deposit**:
- Earned when referred user makes first deposit
- Percentage of deposit amount
- Default: 10%
- Configurable by admin

**Betting Commission**:
- Earned on every bet by referred user
- Percentage of bet amount (not profit)
- Default: 2%
- Lifetime earnings

---

### Commission Tracking

**Dashboard**:
- Total referrals count
- Total earnings
- Pending commissions
- Commission history

**Details**:
- Referred user
- Commission type
- Amount earned
- Date/time
- Related bet/deposit

---

## Analytics

### User Analytics

**Metrics**:
- Total users
- Active users (daily/weekly/monthly)
- New registrations
- Retention rate
- VIP tier distribution

---

### Financial Analytics

**Metrics**:
- Total deposits
- Total withdrawals
- Total wagered
- Total payouts
- House profit
- Profit margin %

**Charts**:
- Daily profit trends
- Monthly revenue
- Game-specific profits
- Payment method breakdown

---

### Game Analytics

**Per-Game Metrics**:
- Total bets
- Total wagered
- Total payout
- Current RTP
- Target RTP
- Profit/loss

**Comparison**:
- Most popular games
- Most profitable games
- Peak playing times
- Average bet sizes

---

## Additional Features

### Live Chat

**Features**:
- Real-time messaging
- Admin support
- Chat history
- File attachments
- Emoji support

---

### Notifications

**Types**:
- Deposit confirmed
- Withdrawal processed
- Bet won
- Referral reward earned
- VIP tier upgraded
- Bonus credited

**Delivery**:
- In-app notifications
- Email notifications (optional)
- Push notifications (optional)

---

### Promotions

**Types**:
- Welcome bonus
- Deposit match bonus
- Free bets
- Cashback offers
- VIP exclusive promotions

**Configuration**:
- Badge text
- Description
- Button text/link
- Icon type
- Gradient colors
- Active status

---

### Provably Fair System

**Features**:
- Server seed generation
- Client seed input
- Nonce increment
- HMAC verification
- Result verification

**Available For**:
- All crash games
- Coin Flip
- Plinko
- Mines
- Cycle Race
- Wingo

**Verification**:
- Pre-round seed hash display
- Post-round seed reveal
- Manual verification steps
- Third-party verification tools

---

This comprehensive feature list covers all current functionality. For implementation details, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).
