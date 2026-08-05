-- Enable RLS on wingo_settings if not already enabled
ALTER TABLE public.wingo_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view wingo settings" ON public.wingo_settings;
DROP POLICY IF EXISTS "Admins can update wingo settings" ON public.wingo_settings;

-- Allow anyone to view wingo settings
CREATE POLICY "Anyone can view wingo settings"
ON public.wingo_settings
FOR SELECT
TO public
USING (true);

-- Allow admins to update wingo settings
CREATE POLICY "Admins can update wingo settings"
ON public.wingo_settings
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));