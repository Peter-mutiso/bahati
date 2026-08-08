-- Username editing + profile privacy hardening.
--
-- This migration does NOT touch anything under the cycling_race_* prefix,
-- the cycling-race-engine edge function, activate_next_cycling_race,
-- ensure_cycling_race_queue, marketer game assignment logic, or any
-- odds/settlement/payout logic. It only touches public.profiles and the
-- signup trigger.

-- ── 1. handle_new_user(): add exception-safe username persistence ────────
-- Username is already sent as auth signup metadata (Auth.tsx passes
-- `data: { username, ... }` to supabase.auth.signUp, which Postgres exposes
-- as NEW.raw_user_meta_data->>'username'). This preserves every existing
-- behavior of the current trigger (tenant assignment, phone_number
-- handling, email handling, wallet creation) and adds username handling.
-- account_type is untouched here - it already defaults via the column's
-- own DEFAULT 'real' and is not something this trigger has ever set.
--
-- Username has a global UNIQUE constraint (profiles_username_key). If two
-- signups race for the same name, inserting with that username fails with
-- unique_violation - handled below by retrying the same insert without a
-- username rather than letting the exception propagate and abort the
-- signup transaction (which would also roll back auth.users creation).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_phone TEXT;
  v_username TEXT;
BEGIN
  -- options.data lands in raw_user_meta_data, NOT raw_app_meta_data
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_phone     := (NEW.raw_user_meta_data->>'phone')::TEXT;
  v_username  := NULLIF(trim(NEW.raw_user_meta_data->>'username'), '');

  -- Strip leading + from phone if present so storage is consistent
  IF v_phone IS NOT NULL THEN
    v_phone := regexp_replace(v_phone, '^\+', '');
  END IF;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := default_tenant_id;
  END IF;

  BEGIN
    INSERT INTO public.profiles (id, email, tenant_id, phone_number, username)
    VALUES (NEW.id, NEW.email, v_tenant_id, v_phone, v_username)
    ON CONFLICT (id) DO UPDATE SET
      tenant_id    = EXCLUDED.tenant_id,
      phone_number = EXCLUDED.phone_number,
      username     = COALESCE(EXCLUDED.username, public.profiles.username);
  EXCEPTION WHEN unique_violation THEN
    -- Someone else already has this username. Create/update the profile
    -- without setting username rather than failing signup entirely - the
    -- player can pick a different one later via the profile page.
    INSERT INTO public.profiles (id, email, tenant_id, phone_number)
    VALUES (NEW.id, NEW.email, v_tenant_id, v_phone)
    ON CONFLICT (id) DO UPDATE SET
      tenant_id    = EXCLUDED.tenant_id,
      phone_number = EXCLUDED.phone_number;
  END;

  INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus, tenant_id)
  VALUES (NEW.id, 0.00, 0.00, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. profiles RLS hardening ──────────────────────────────────────────────
-- Two pre-existing policies make `profiles` effectively fully public:
--   "Anyone can view profiles" FOR SELECT USING (true)            [PUBLIC]
--   "Allow anonymous read access to profiles for leaderboard"
--     FOR SELECT TO anon USING (true)
-- Investigated dependents before touching anything:
--   - src/components/admin/UserManagement.tsx: admin panel reads/updates
--     `profiles` directly as the admin's own authenticated session (no
--     dedicated admin SELECT policy exists today - it was relying entirely
--     on the open policy above). Fixed by policy #3 below.
--   - src/pages/MarketerDashboard.tsx: reads id, username, created_at,
--     total_deposited for profiles in the marketer's assigned tenant, also
--     relying on the open policy. Fixed by policy #4 below.
--   - src/components/home/LeaderboardSection.tsx: joins chicken_road_bets
--     to profiles!inner(username) to show other players' usernames on the
--     public Home page leaderboard, for anon and authenticated visitors.
--     This is the "leaderboard" the anon policy's name refers to. Fixed by
--     the narrow view in section 3 below (frontend updated to query it
--     instead of embedding the base table).
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow anonymous read access to profiles for leaderboard" ON public.profiles;

-- 3. Admins: explicit, dedicated read access (replaces what they were
-- accidentally getting from the open policy above).
CREATE POLICY "admins_select_all_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Marketers: read access scoped to their own assigned tenant only
-- (mirrors the join pattern already used by is_authorized_marketer_for_game,
-- without the per-game filter since MarketerDashboard's user list isn't
-- game-specific). This is strictly narrower than the open policy it
-- replaces (all tenants -> only their assigned tenant), so it tightens
-- rather than weakens what marketers could already reach.
CREATE POLICY "marketer_select_assigned_tenant_profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.marketers m
      JOIN public.marketer_site_assignments msa ON msa.marketer_id = m.id
      WHERE m.user_id = auth.uid()
        AND msa.tenant_id = profiles.tenant_id
        AND m.status = 'approved'
    )
  );

-- player_select_own_profile and player_update_own_profile are untouched -
-- players keep exactly the own-row access they already had.

-- ── 5. Column-level hardening for update_own_profile ──────────────────────
-- player_update_own_profile has USING but no WITH CHECK, so nothing stops
-- an authenticated player from including other columns in their own-row
-- update. account_type is already locked down this way (see
-- 20260806000000_cycling_race_account_types.sql). Extending the same,
-- already-proven-safe mechanism to total_deposited and vip_tier_id, which
-- were confirmed (by grepping every .update() call in src/) to have NO
-- existing direct-client update path anywhere in the app today - so this
-- cannot break anything currently working.
--
-- is_banned/banned_at and tenant_id are deliberately NOT revoked here:
-- UserManagement.tsx's ban/unban and "move to site" actions update those
-- columns directly via the admin's own authenticated session (same
-- Postgres role as any other authenticated user), so a blanket REVOKE
-- would break existing admin functionality. That residual gap (a player
-- could in principle target those two columns on their own row) is
-- pre-existing, unrelated to username editing, and is called out as a
-- known risk rather than "fixed" here with a riskier mechanism.
REVOKE UPDATE (total_deposited) ON public.profiles FROM authenticated, anon;
REVOKE UPDATE (vip_tier_id) ON public.profiles FROM authenticated, anon;

-- ── 6. Narrow public view for username-only lookups ───────────────────────
-- Exposes exactly two harmless columns (id, username) so the leaderboard
-- use case above never needs broad row/column access to the base table.
-- Views run with the privileges of their owner (the migration role) for
-- RLS purposes by default, so this remains readable regardless of the
-- tightened policies above, while structurally only ever being able to
-- return these two columns - email/phone/pin/financial/admin fields are
-- not part of this view and cannot be selected through it.
CREATE OR REPLACE VIEW public.profile_public_usernames AS
  SELECT id, username FROM public.profiles;

GRANT SELECT ON public.profile_public_usernames TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
