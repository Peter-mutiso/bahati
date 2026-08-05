-- ─── Marketer System ──────────────────────────────────────────────────────────
-- Adds: app_role enum 'marketer', marketers profile table,
--       marketer_site_assignments, marketer_withdrawals, marketer_settings

-- 1. Extend app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'marketer';

-- 2. Marketer profile table (one row per marketer user)
CREATE TABLE IF NOT EXISTS public.marketers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text NOT NULL,
  email         text NOT NULL,
  status        text NOT NULL DEFAULT 'pending'  -- pending | approved | rejected
                CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         text,           -- admin notes
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- 3. Marketer → site assignment (each marketer sees one tenant's data)
CREATE TABLE IF NOT EXISTS public.marketer_site_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id   uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (marketer_id)           -- one site per marketer
);

-- 4. Global revenue-share settings (admin-configurable %)
CREATE TABLE IF NOT EXISTS public.marketer_settings (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revenue_share_percent numeric(5,2) NOT NULL DEFAULT 25.00
                        CHECK (revenue_share_percent >= 0 AND revenue_share_percent <= 100),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  updated_by            uuid REFERENCES auth.users(id)
);

-- Seed one default row
INSERT INTO public.marketer_settings (revenue_share_percent)
SELECT 25.00
WHERE NOT EXISTS (SELECT 1 FROM public.marketer_settings);

-- 5. Marketer withdrawals
CREATE TABLE IF NOT EXISTS public.marketer_withdrawals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketer_id     uuid NOT NULL REFERENCES public.marketers(id) ON DELETE CASCADE,
  amount          numeric(14,2) NOT NULL CHECK (amount > 0),
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_method  text,          -- e.g. mpesa, bank
  payment_details text,          -- phone / account details
  admin_notes     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.marketers                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketer_site_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketer_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketer_withdrawals     ENABLE ROW LEVEL SECURITY;

-- marketers: user can read/insert their own row; admins can do everything
DROP POLICY IF EXISTS "marketers_self_read"   ON public.marketers;
CREATE POLICY "marketers_self_read"   ON public.marketers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "marketers_self_insert" ON public.marketers;
CREATE POLICY "marketers_self_insert" ON public.marketers FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "marketers_admin_all"   ON public.marketers;
CREATE POLICY "marketers_admin_all"   ON public.marketers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- site assignments: marketer reads their own; admin all
DROP POLICY IF EXISTS "msa_marketer_read" ON public.marketer_site_assignments;
CREATE POLICY "msa_marketer_read" ON public.marketer_site_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "msa_admin_all" ON public.marketer_site_assignments;
CREATE POLICY "msa_admin_all" ON public.marketer_site_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- settings: anyone authenticated can read; only admin can write
DROP POLICY IF EXISTS "ms_read"      ON public.marketer_settings;
CREATE POLICY "ms_read"      ON public.marketer_settings FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "ms_admin_all" ON public.marketer_settings;
CREATE POLICY "ms_admin_all" ON public.marketer_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- withdrawals: marketer reads/inserts their own; admin all
DROP POLICY IF EXISTS "mw_marketer_read"   ON public.marketer_withdrawals;
CREATE POLICY "mw_marketer_read"   ON public.marketer_withdrawals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "mw_marketer_insert" ON public.marketer_withdrawals;
CREATE POLICY "mw_marketer_insert" ON public.marketer_withdrawals FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.marketers m WHERE m.id = marketer_id AND m.user_id = auth.uid())
);
DROP POLICY IF EXISTS "mw_admin_all" ON public.marketer_withdrawals;
CREATE POLICY "mw_admin_all" ON public.marketer_withdrawals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

NOTIFY pgrst, 'reload schema';
