-- Drop and recreate the payment_method check constraint to include 'mpesa'
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'transactions_payment_method_check' 
    AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions DROP CONSTRAINT transactions_payment_method_check;
  END IF;

  -- Add updated constraint with mpesa included
  ALTER TABLE public.transactions 
    ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method IN ('upi', 'usdt', 'btc', 'mpesa', 'bank', 'cash', 'other'));
END;
$$;

NOTIFY pgrst, 'reload schema';
