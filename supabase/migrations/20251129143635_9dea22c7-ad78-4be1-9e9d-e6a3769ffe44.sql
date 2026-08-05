-- Add INSERT policy for wingo_settings (needed for upsert)
CREATE POLICY "Admins can insert wingo settings"
ON public.wingo_settings
FOR INSERT
TO public
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));