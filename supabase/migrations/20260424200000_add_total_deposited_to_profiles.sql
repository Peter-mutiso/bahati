-- Add total_deposited column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='total_deposited') THEN
    ALTER TABLE public.profiles ADD COLUMN total_deposited DECIMAL(10, 2) NOT NULL DEFAULT 0.00;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
