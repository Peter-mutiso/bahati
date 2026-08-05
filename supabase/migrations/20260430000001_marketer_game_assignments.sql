-- ─── Marketer Game Assignments ───────────────────────────────────────────────
-- Allows admin to assign specific games to marketers so they can see upcoming results.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.marketer_game_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id   uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  game_slug     text NOT NULL,   -- e.g. 'aviator', 'cycling-race', 'chicken-road', 'coin-train', 'coin-flip', 'plinko', 'wingo'
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketer_id, game_slug)
);

-- 2. RLS for assignments
ALTER TABLE public.marketer_game_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mga_marketer_read" ON public.marketer_game_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid())
);

CREATE POLICY "mga_admin_all" ON public.marketer_game_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- 3. Update RLS policies for game data tables to allow marketers to see "hidden" results
-- We need to check if the user is a marketer for the tenant AND has the game assigned.

-- Helper function to check if current user is an authorized marketer for a game and tenant
CREATE OR REPLACE FUNCTION public.is_authorized_marketer_for_game(p_tenant_id uuid, p_game_slug text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.marketers m
    JOIN public.marketer_site_assignments msa ON msa.marketer_id = m.id
    JOIN public.marketer_game_assignments mga ON mga.marketer_id = m.id
    WHERE m.user_id = auth.uid()
      AND msa.tenant_id = p_tenant_id
      AND mga.game_slug = p_game_slug
      AND m.status = 'approved'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.1 Update game_rounds policy
DROP POLICY IF EXISTS "marketer_select_assigned_game_rounds" ON public.game_rounds;
CREATE POLICY "marketer_select_assigned_game_rounds"
  ON public.game_rounds FOR SELECT
  USING (
    public.is_authorized_marketer_for_game(tenant_id, game_type)
  );

-- 3.2 Update cycling_race_races policy
-- We need to add tenant_id to cycling_race_races if it's missing (it was used in engine but let's be sure)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='cycling_race_races' AND column_name='tenant_id') THEN
    ALTER TABLE public.cycling_race_races ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
    UPDATE public.cycling_race_races SET tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.cycling_race_races ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marketer_select_assigned_cycling_races" ON public.cycling_race_races;
CREATE POLICY "marketer_select_assigned_cycling_races"
  ON public.cycling_race_races FOR SELECT
  USING (
    public.is_authorized_marketer_for_game(tenant_id, 'cycling-race')
  );

-- 3.3 Update coin_flip_rounds policy
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='coin_flip_rounds' AND column_name='tenant_id') THEN
    ALTER TABLE public.coin_flip_rounds ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL;
    UPDATE public.coin_flip_rounds SET tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
  END IF;
END;
$$;

ALTER TABLE public.coin_flip_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marketer_select_assigned_coin_flip_rounds" ON public.coin_flip_rounds;
CREATE POLICY "marketer_select_assigned_coin_flip_rounds"
  ON public.coin_flip_rounds FOR SELECT
  USING (
    public.is_authorized_marketer_for_game(tenant_id, 'coin-flip')
  );

-- 4. Notify PostgREST
NOTIFY pgrst, 'reload schema';
