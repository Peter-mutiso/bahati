-- Ensure admin users can always read and write game_settings.
-- This adds a fallback policy using a direct subquery instead of the has_role() function,
-- in case the function lookup is failing silently.

DO $$
BEGIN
  -- Drop and recreate the UPDATE policy with a more reliable check
  DROP POLICY IF EXISTS "Admins can update game settings" ON public.game_settings;

  CREATE POLICY "Admins can update game settings"
    ON public.game_settings FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );

  -- Replace INSERT policy with the same reliable pattern
  DROP POLICY IF EXISTS "Admins can insert game settings" ON public.game_settings;

  CREATE POLICY "Admins can insert game settings"
    ON public.game_settings FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );

END;
$$;

NOTIFY pgrst, 'reload schema';
