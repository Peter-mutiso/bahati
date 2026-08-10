-- Per-player Cycle Race cyclist name customization.
--
-- Lets a player rename a cyclist (e.g. "Cyclist 3" -> "Peter") purely as a
-- private display preference. This is presentation-only: it never touches
-- cycling_race_races, cycling_race_bets, cycling_race_settings, the
-- cycling-race-engine edge function, or any queue/settlement/outcome
-- object. The real cyclist_number / winner_cyclist values are never
-- written or read by anything in this migration.
--
-- No existing table covers this. cycling_race_settings.cyclist_customization
-- is a single global, admin-controlled JSON column shared by every player
-- on a tenant - reusing it would leak one player's private name to
-- everyone. profiles.username is the player's own display name, not a
-- per-cyclist rename. Neither fits; a dedicated table is required.

CREATE TABLE public.cycling_race_cyclist_names (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cyclist_number INTEGER NOT NULL CHECK (cyclist_number BETWEEN 1 AND 10),
  custom_name TEXT NOT NULL CHECK (length(trim(custom_name)) > 0 AND length(custom_name) <= 20),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, cyclist_number, tenant_id)
);

CREATE INDEX idx_cycling_race_cyclist_names_user_tenant
  ON public.cycling_race_cyclist_names (user_id, tenant_id);

ALTER TABLE public.cycling_race_cyclist_names ENABLE ROW LEVEL SECURITY;

-- Strictly own-row, tenant-scoped access - mirrors player_select_own_profile
-- / player_update_own_profile's exact pattern (auth.uid() = owner column AND
-- tenant_id = my_tenant_id()). No admin or marketer policy is added: there
-- is no existing product requirement for admins/marketers to see a
-- player's private cyclist renames, so none is granted. RLS with no
-- SELECT policy for a role means that role gets zero rows, which is the
-- correct default here.
CREATE POLICY "player_select_own_cyclist_names"
  ON public.cycling_race_cyclist_names FOR SELECT TO authenticated
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_insert_own_cyclist_names"
  ON public.cycling_race_cyclist_names FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_update_own_cyclist_names"
  ON public.cycling_race_cyclist_names FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id())
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_delete_own_cyclist_names"
  ON public.cycling_race_cyclist_names FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

NOTIFY pgrst, 'reload schema';
