-- Fix game_settings RLS: ensure admins can SELECT, INSERT, and UPDATE.
-- The original migration only had UPDATE. INSERT was missing, blocking the save fallback.

-- Add INSERT policy for admins (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'game_settings' AND policyname = 'Admins can insert game settings'
  ) THEN
    CREATE POLICY "Admins can insert game settings"
      ON public.game_settings FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END;
$$;

-- Also ensure the wallets INSERT policy exists for admin wallet top-ups
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'wallets' AND policyname = 'Admins can insert wallets'
  ) THEN
    CREATE POLICY "Admins can insert wallets"
      ON public.wallets FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
