-- =============================================================
-- Multi-Tenant Accounts: Isolated Identities
-- =============================================================

-- 1. Add phone_number to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone_number') THEN
        ALTER TABLE public.profiles ADD COLUMN phone_number TEXT;
    END IF;
END $$;

-- 2. Backfill phone_number from auth.users metadata if possible
UPDATE public.profiles p
SET phone_number = u.raw_app_meta_data->>'phone'
FROM auth.users u
WHERE p.id = u.id AND p.phone_number IS NULL;

-- 3. Create a composite unique constraint (phone_number, tenant_id)
-- This allows the same phone number to register on different sites.
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_phone_tenant_key;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_phone_tenant_key UNIQUE (phone_number, tenant_id);

-- 4. Update handle_new_user to store phone_number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_phone TEXT;
BEGIN
  -- Read tenant_id and phone from signup metadata
  v_tenant_id := (NEW.raw_app_meta_data->>'tenant_id')::UUID;
  v_phone := (NEW.raw_app_meta_data->>'phone')::TEXT;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := default_tenant_id;
  END IF;

  -- Create profile with phone_number
  INSERT INTO public.profiles (id, email, tenant_id, phone_number)
  VALUES (NEW.id, NEW.email, v_tenant_id, v_phone)
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    phone_number = EXCLUDED.phone_number;

  -- Create wallet
  INSERT INTO public.wallets (user_id, balance, tenant_id)
  VALUES (NEW.id, 1000.00, v_tenant_id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
