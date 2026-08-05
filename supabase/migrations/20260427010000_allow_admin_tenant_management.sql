-- Enable Admin CRUD on tenants table
-- Admins are users who have a role = 'admin' in the user_roles table.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Give admins full access to the tenants table
CREATE POLICY "Admins can insert tenants"
  ON public.tenants FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update tenants"
  ON public.tenants FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete tenants"
  ON public.tenants FOR DELETE
  TO authenticated
  USING (public.is_admin());

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
