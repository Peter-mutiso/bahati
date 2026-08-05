-- Drop the existing check constraint and add a new one that includes 'btc'
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;

ALTER TABLE public.transactions ADD CONSTRAINT transactions_payment_method_check 
CHECK (payment_method IS NULL OR payment_method IN ('upi', 'usdt', 'btc', 'bank_transfer', 'crypto', 'wallet'));