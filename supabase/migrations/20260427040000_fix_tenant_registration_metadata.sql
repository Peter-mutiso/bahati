-- =============================================================
-- Fix Tenant Registration: Use User Meta Data instead of App Meta Data
-- =============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_id UUID;
  default_tenant_id UUID := 'aaaaaaaa-0000-0000-0000-000000000001';
  v_phone TEXT;
BEGIN
  -- IMPORTANT: Supabase 'options.data' from signUp() maps to 'raw_user_meta_data'
  v_tenant_id := (NEW.raw_user_meta_data->>'tenant_id')::UUID;
  v_phone := (NEW.raw_user_meta_data->>'phone')::TEXT;

  -- Fallback to Default Site if not found
  IF v_tenant_id IS NULL THEN
    -- Also check raw_app_meta_data just in case
    v_tenant_id := (NEW.raw_app_meta_data->>'tenant_id')::UUID;
    
    IF v_tenant_id IS NULL THEN
        v_tenant_id := default_tenant_id;
    END IF;
  END IF;

  -- Create profile
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
