-- =============================================================
-- Fix: Ensure phone_number is stored on profiles via trigger
-- Strategy:
--   • Auth email = {tenantId}_{phone}@mobile.com  (tenant-scoped for global uniqueness)
--   • phone_number column on profiles stores the human-readable phone
--   • Admin/UI displays phone_number instead of parsing auth email
--   • (phone_number, tenant_id) composite constraint enforces no duplicate
--     accounts for the same phone on the same site
-- =============================================================

-- 1. Ensure composite unique constraint exists: (phone_number, tenant_id)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_tenant_key;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_tenant_key
  UNIQUE (phone_number, tenant_id);

-- 2. Update handle_new_user trigger to correctly store phone_number on profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_phone TEXT;
BEGIN
  v_tenant_id := (NEW.raw_app_meta_data->>'tenant_id')::UUID;
  v_phone     := (NEW.raw_app_meta_data->>'phone')::TEXT;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := default_tenant_id;
  END IF;

  INSERT INTO public.profiles (id, email, tenant_id, phone_number)
  VALUES (NEW.id, NEW.email, v_tenant_id, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    tenant_id    = EXCLUDED.tenant_id,
    phone_number = EXCLUDED.phone_number;

  INSERT INTO public.wallets (user_id, balance, tenant_id)
  VALUES (NEW.id, 0, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
