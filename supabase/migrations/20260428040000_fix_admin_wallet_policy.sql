-- Restore admin SELECT/UPDATE policies on wallets that were dropped
-- in the multitenant migration without being replaced.

CREATE POLICY "admin_select_all_wallets"
  ON public.wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_all_wallets"
  ON public.wallets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

NOTIFY pgrst, 'reload schema';
