-- =============================================================
-- Fix 1: Trigger was reading raw_app_meta_data — should be raw_user_meta_data
--         (Supabase puts options.data into raw_user_meta_data)
-- Fix 2: Backfill tenant_id and phone_number for existing users whose
--         profiles got wrong tenant because of the wrong field
-- =============================================================

-- 1. Fix the trigger to read from raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_phone TEXT;
BEGIN
  -- options.data lands in raw_user_meta_data, NOT raw_app_meta_data
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_phone     := (NEW.raw_user_meta_data->>'phone')::TEXT;

  -- Strip leading + from phone if present so storage is consistent
  IF v_phone IS NOT NULL THEN
    v_phone := regexp_replace(v_phone, '^\+', '');
  END IF;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := default_tenant_id;
  END IF;

  INSERT INTO public.profiles (id, email, tenant_id, phone_number)
  VALUES (NEW.id, NEW.email, v_tenant_id, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    tenant_id    = EXCLUDED.tenant_id,
    phone_number = EXCLUDED.phone_number;

  INSERT INTO public.wallets (user_id, wallet_cash, wallet_bonus, tenant_id)
  VALUES (NEW.id, 0.00, 0.00, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing profiles that have the default tenant
--    but their auth email starts with a real tenant UUID prefix
--    e.g. "61cce305-9aab-4dc6-8f82-30b29800031a_254702283117@mobile.com"
--    Also fix phone_number from the same email.
UPDATE public.profiles p
SET
  tenant_id = (
    -- Extract UUID from start of email before the underscore
    split_part(u.email, '_', 1)::UUID
  ),
  phone_number = (
    -- Extract phone part after the underscore, before @mobile.com
    split_part(split_part(u.email, '_', 2), '@', 1)
  )
FROM auth.users u
WHERE
  u.id = p.id
  -- Only mobile.com synthetic emails with a UUID prefix
  AND u.email LIKE '%@mobile.com'
  AND u.email LIKE '%_%@mobile.com'
  -- The part before the first underscore must be a valid UUID
  AND split_part(u.email, '_', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  -- Only fix profiles still on the default tenant OR with no phone_number
  AND (
    p.tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'::UUID
    OR p.phone_number IS NULL
  );

-- 3. Also fix wallets to match corrected tenant_id
UPDATE public.wallets w
SET tenant_id = p.tenant_id
FROM public.profiles p
WHERE w.user_id = p.id
  AND w.tenant_id != p.tenant_id;

NOTIFY pgrst, 'reload schema';
