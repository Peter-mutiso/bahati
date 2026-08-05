-- =============================================================
-- PHASE 1: Multi-Tenant Foundation
-- Creates the `tenants` table, stamps `tenant_id` on all
-- player-facing tables, migrates existing data to a Default
-- Site tenant, and wires up the new-user trigger.
--
-- SAFE TO RUN ON EXISTING DATA: all ALTERs are idempotent.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. CREATE tenants TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,        -- short identifier, e.g. 'kuku-bahati'
  domain      TEXT UNIQUE NOT NULL,        -- the game domain, e.g. 'kukubahati.com'
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (admins bypass via service role; players never query this table)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read tenant list (needed for hostname resolution)
CREATE POLICY "Tenants are publicly readable"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update/delete tenants (admin uses service key)
-- No INSERT/UPDATE/DELETE policy for anon/authenticated = blocked by default

-- ─────────────────────────────────────────────────────────────
-- 2. SEED THE DEFAULT TENANT (your existing site)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.tenants (id, name, slug, domain)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Default Site',
  'default',
  'localhost'           -- ← update this to your real domain after deploy
)
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 3. ADD tenant_id TO PLAYER-FACING TABLES (idempotent)
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  tbl TEXT;
  tables_to_patch TEXT[] := ARRAY[
    'profiles',
    'wallets',
    'transactions',
    'bets',
    'game_settings',
    'chicken_road_bets',
    'cycling_race_bets',
    'chat_messages',
    'offer_rains',
    'loan_transactions',
    'spin_wheel_spins',
    'user_achievements'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_to_patch LOOP
    -- Only patch if the table exists
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      -- Add column if missing
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
      ) THEN
        EXECUTE format(
          'ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL',
          tbl
        );
        RAISE NOTICE 'Added tenant_id to %', tbl;
      END IF;

      -- Backfill existing rows to Default Site
      EXECUTE format(
        'UPDATE public.%I SET tenant_id = $1 WHERE tenant_id IS NULL',
        tbl
      ) USING default_tenant_id;
      RAISE NOTICE 'Backfilled % rows in %', (SELECT COUNT(*) FROM public.profiles WHERE tenant_id IS NULL), tbl;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END IF;
  END LOOP;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 4. INDEXES for performance (tenant_id lookups will be frequent)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_tenant_id        ON public.profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wallets_tenant_id         ON public.wallets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id    ON public.transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bets_tenant_id            ON public.bets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_game_settings_tenant_id  ON public.game_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chicken_road_bets_tid     ON public.chicken_road_bets(tenant_id);

-- Conditional indexes (tables may not exist yet)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cycling_race_bets') THEN
    CREATE INDEX IF NOT EXISTS idx_cycling_race_bets_tid ON public.cycling_race_bets(tenant_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chat_messages') THEN
    CREATE INDEX IF NOT EXISTS idx_chat_messages_tid ON public.chat_messages(tenant_id);
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 5. UPDATE handle_new_user() TRIGGER
--    Reads tenant_id from the custom claim set by the frontend
--    during signup (passed via raw_app_meta_data), or falls
--    back to the Default Site tenant.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
BEGIN
  -- Try to read tenant_id from signup metadata (set by the game site on signup)
  v_tenant_id := (NEW.raw_app_meta_data->>'tenant_id')::UUID;

  -- Fall back to Default Site if not supplied
  IF v_tenant_id IS NULL THEN
    v_tenant_id := default_tenant_id;
  END IF;

  -- Create profile
  INSERT INTO public.profiles (id, email, tenant_id)
  VALUES (NEW.id, NEW.email, v_tenant_id)
  ON CONFLICT (id) DO NOTHING;

  -- Create wallet with starting balance
  INSERT INTO public.wallets (user_id, balance, tenant_id)
  VALUES (NEW.id, 1000.00, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 6. RLS POLICIES — Tenant-scoped player access
--
-- Strategy:
--   • Players can only see their OWN data (user_id = auth.uid())
--     AND it must belong to their tenant.
--   • The tenant is identified by matching the tenant_id stored
--     on the profile row of the currently logged-in user.
--   • Admins use the service-role key which bypasses all RLS.
-- ─────────────────────────────────────────────────────────────

-- Helper function: returns the tenant_id of the currently logged-in user
CREATE OR REPLACE FUNCTION public.my_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── profiles ──
-- Drop old policies first (safe with IF EXISTS)
DROP POLICY IF EXISTS "Users can view their own profile"    ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile"  ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles"        ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles"      ON public.profiles;

CREATE POLICY "player_select_own_profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_update_own_profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id AND tenant_id = public.my_tenant_id());

-- ── wallets ──
DROP POLICY IF EXISTS "Users can view their own wallet"   ON public.wallets;
DROP POLICY IF EXISTS "Users can update their own wallet" ON public.wallets;
DROP POLICY IF EXISTS "Admins can view all wallets"       ON public.wallets;

CREATE POLICY "player_select_own_wallet"
  ON public.wallets FOR SELECT
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_update_own_wallet"
  ON public.wallets FOR UPDATE
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

-- ── transactions ──
DROP POLICY IF EXISTS "Users can view their own transactions"   ON public.transactions;
DROP POLICY IF EXISTS "Users can create their own transactions" ON public.transactions;

CREATE POLICY "player_select_own_transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

CREATE POLICY "player_insert_own_transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

-- ── chicken_road_bets ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chicken_road_bets') THEN
    DROP POLICY IF EXISTS "Users can view their own chicken road bets" ON public.chicken_road_bets;
    DROP POLICY IF EXISTS "Users can create chicken road bets"         ON public.chicken_road_bets;

    EXECUTE $pol$
      CREATE POLICY "player_select_own_cr_bets"
        ON public.chicken_road_bets FOR SELECT
        USING (auth.uid() = user_id AND tenant_id = public.my_tenant_id());

      CREATE POLICY "player_insert_own_cr_bets"
        ON public.chicken_road_bets FOR INSERT
        WITH CHECK (auth.uid() = user_id AND tenant_id = public.my_tenant_id());
    $pol$;
  END IF;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 7. GAME SETTINGS — ensure each tenant gets its own row
--    The existing single row now belongs to Default Site.
--    New tenants get a copy created by the admin when they
--    add a new site (via the Sites management tab).
-- ─────────────────────────────────────────────────────────────

-- game_settings is NOT player-facing, so no user-level RLS needed.
-- The admin uses service-role key; game sites read their own row by tenant_id.
-- Allow anonymous/authenticated read (game site needs it without login):
DROP POLICY IF EXISTS "game_settings_select" ON public.game_settings;
CREATE POLICY "game_settings_select"
  ON public.game_settings FOR SELECT
  TO authenticated, anon
  USING (true);

-- ─────────────────────────────────────────────────────────────
-- 8. MAKE tenants TABLE READABLE ANONYMOUSLY
--    Game sites must resolve their tenant BEFORE user logs in.
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Tenants are publicly readable" ON public.tenants;
CREATE POLICY "Tenants are publicly readable"
  ON public.tenants FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
