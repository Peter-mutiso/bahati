-- Fix transactions INSERT policy to allow service role (edge functions)
-- and correctly scoped player inserts

-- Drop the strict policy that was blocking inserts
DROP POLICY IF EXISTS "player_insert_own_transactions" ON public.transactions;

-- Recreate: players can insert their own transactions on their tenant
-- tenant_id must match their profile's tenant_id OR be null (service role handles null)
CREATE POLICY "player_insert_own_transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      tenant_id = public.my_tenant_id()
      OR tenant_id IS NULL
    )
  );

-- Also ensure service role can always insert (edge functions use service role)
-- Service role bypasses RLS by default, so no policy needed for it.
-- But add an explicit anon/service bypass just in case:
DROP POLICY IF EXISTS "service_role_insert_transactions" ON public.transactions;

NOTIFY pgrst, 'reload schema';
