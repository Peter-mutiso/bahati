CREATE TABLE IF NOT EXISTS public.plinko_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rtp_percentage NUMERIC NOT NULL DEFAULT 97,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plinko_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view plinko settings" ON public.plinko_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update plinko settings" ON public.plinko_settings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));