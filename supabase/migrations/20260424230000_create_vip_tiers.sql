-- Create vip_tiers table
CREATE TABLE IF NOT EXISTS public.vip_tiers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  tier_level integer NOT NULL,
  deposit_threshold numeric NOT NULL DEFAULT 0,
  bonus_percentage numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#808080',
  icon text NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add vip_tier_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS vip_tier_id uuid REFERENCES public.vip_tiers(id);

-- Enable RLS
ALTER TABLE public.vip_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view VIP tiers" ON public.vip_tiers FOR SELECT USING (true);
CREATE POLICY "Admins can manage VIP tiers" ON public.vip_tiers FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Seed some default VIP tiers
INSERT INTO public.vip_tiers (name, tier_level, deposit_threshold, bonus_percentage, color, icon)
VALUES 
  ('Bronze', 1, 0, 0, '#CD7F32', 'Crown'),
  ('Silver', 2, 1000, 5, '#C0C0C0', 'Crown'),
  ('Gold', 3, 5000, 10, '#FFD700', 'Crown'),
  ('Platinum', 4, 25000, 15, '#E5E4E2', 'Crown'),
  ('Diamond', 5, 100000, 25, '#B9F2FF', 'Crown')
ON CONFLICT DO NOTHING;
