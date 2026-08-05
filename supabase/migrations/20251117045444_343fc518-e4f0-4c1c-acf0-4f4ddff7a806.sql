-- Add loan fields to wallets table
ALTER TABLE public.wallets
ADD COLUMN loan_amount NUMERIC NOT NULL DEFAULT 0.00,
ADD COLUMN loan_eligible BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN last_deposit_amount NUMERIC NOT NULL DEFAULT 0.00,
ADD COLUMN loan_taken_at TIMESTAMP WITH TIME ZONE;

-- Create loan_transactions table for tracking
CREATE TABLE public.loan_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  loan_amount NUMERIC NOT NULL,
  recovery_amount NUMERIC NOT NULL DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  recovered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.loan_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for loan_transactions
CREATE POLICY "Users can view their own loans"
ON public.loan_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert loans"
ON public.loan_transactions
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update loans"
ON public.loan_transactions
FOR UPDATE
USING (true);

CREATE POLICY "Admins can view all loans"
ON public.loan_transactions
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));