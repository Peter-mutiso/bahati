-- Account classification: 'real' | 'demo' | 'bot'.
--
-- This is the input the cycling-race prediction service (next migration)
-- uses to decide whether a caller sees the true queued outcome or an
-- independently generated house prediction. It has no bearing on betting,
-- wallets, or settlement - those remain identical for every account type.
--
-- SECURITY: a real player must never be able to flip their own account to
-- 'demo'/'bot' to see the real outcome ahead of time. profiles already has
-- a permissive "player_update_own_profile" RLS policy (USING only, no
-- column restriction) from 20260427000000_create_tenants_multitenant.sql,
-- so RLS alone cannot stop a player from writing this column. We close
-- that gap with a column-level privilege REVOKE, and only allow changing
-- it through the admin-gated set_profile_account_type() RPC below.

ALTER TABLE public.profiles
  ADD COLUMN account_type TEXT NOT NULL DEFAULT 'real' CHECK (account_type IN ('real', 'demo', 'bot'));

CREATE INDEX idx_profiles_account_type ON public.profiles (account_type);

REVOKE UPDATE (account_type) ON public.profiles FROM authenticated, anon;
REVOKE INSERT (account_type) ON public.profiles FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.set_profile_account_type(p_user_id UUID, p_account_type TEXT)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.profiles;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins may change account_type';
  END IF;

  IF p_account_type NOT IN ('real', 'demo', 'bot') THEN
    RAISE EXCEPTION 'Invalid account_type: %', p_account_type;
  END IF;

  UPDATE public.profiles
  SET account_type = p_account_type
  WHERE id = p_user_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_profile_account_type(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_profile_account_type(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
