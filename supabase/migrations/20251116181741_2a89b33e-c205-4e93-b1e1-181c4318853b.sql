-- Add new settings to game_settings for referral and bonus system
ALTER TABLE public.game_settings
ADD COLUMN IF NOT EXISTS referral_bet_commission_percent NUMERIC NOT NULL DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS referral_first_deposit_commission_percent NUMERIC NOT NULL DEFAULT 10.00,
ADD COLUMN IF NOT EXISTS first_deposit_bonus_percent NUMERIC NOT NULL DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS first_deposit_bonus_fixed_amount NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wager_requirement_multiplier NUMERIC NOT NULL DEFAULT 5.00;

-- Add wager tracking columns to wallets
ALTER TABLE public.wallets
ADD COLUMN IF NOT EXISTS wager_required NUMERIC NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS wager_completed NUMERIC NOT NULL DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS first_deposit_received BOOLEAN NOT NULL DEFAULT false;

-- Create commission transactions table
CREATE TABLE IF NOT EXISTS public.commission_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL,
  commission_type TEXT NOT NULL CHECK (commission_type IN ('bet_commission', 'first_deposit_commission')),
  amount NUMERIC NOT NULL,
  reference_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on commission_transactions
ALTER TABLE public.commission_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view commissions they received
CREATE POLICY "Users can view their commissions"
ON public.commission_transactions
FOR SELECT
USING (auth.uid() = referrer_id);

-- System can insert commissions
CREATE POLICY "System can insert commissions"
ON public.commission_transactions
FOR INSERT
WITH CHECK (true);

-- Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
ON public.commission_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_commission_referrer ON public.commission_transactions(referrer_id);
CREATE INDEX IF NOT EXISTS idx_commission_referred_user ON public.commission_transactions(referred_user_id);