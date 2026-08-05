-- Add new columns to transactions table for payment gateway support
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IN ('upi', 'usdt')),
ADD COLUMN IF NOT EXISTS utr_number text,
ADD COLUMN IF NOT EXISTS wallet_address text,
ADD COLUMN IF NOT EXISTS payment_proof text,
ADD COLUMN IF NOT EXISTS admin_notes text;

-- Update status check constraint to include rejected
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'rejected'));