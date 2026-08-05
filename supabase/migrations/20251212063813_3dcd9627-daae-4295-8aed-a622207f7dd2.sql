-- Add transaction_hash column for BTC/USDT deposits verification
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS transaction_hash text;