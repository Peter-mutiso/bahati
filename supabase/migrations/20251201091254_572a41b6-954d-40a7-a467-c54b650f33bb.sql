-- Create table for exclusive promotions
CREATE TABLE IF NOT EXISTS public.exclusive_promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  description TEXT NOT NULL,
  button_text TEXT NOT NULL,
  button_link TEXT,
  icon_type TEXT NOT NULL, -- 'sparkles', 'zap', 'trophy', 'gift', 'flame', 'star'
  badge_text TEXT NOT NULL,
  badge_color TEXT NOT NULL, -- 'primary', 'accent', 'success', 'destructive'
  gradient_from TEXT NOT NULL, -- HSL color
  gradient_to TEXT NOT NULL, -- HSL color
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.exclusive_promotions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view active promotions"
  ON public.exclusive_promotions
  FOR SELECT
  USING (is_active = true);

-- Admin full access
CREATE POLICY "Admins can manage promotions"
  ON public.exclusive_promotions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create index for sorting
CREATE INDEX idx_exclusive_promotions_sort_order ON public.exclusive_promotions(sort_order, created_at);

-- Insert default promotions
INSERT INTO public.exclusive_promotions (title, subtitle, description, button_text, button_link, icon_type, badge_text, badge_color, gradient_from, gradient_to, sort_order) VALUES
('First Deposit Bonus', '100% Match', 'Get 100% bonus on your first deposit up to ₹500.', 'Claim Bonus', '/wallet', 'sparkles', 'NEW USERS', 'primary', '220 14% 80%', '220 14% 96%', 1),
('Daily Rewards', 'Free Spins', 'Login daily and claim free spins & cashback.', 'Claim Reward', null, 'zap', 'DAILY', 'accent', '40 10% 80%', '40 10% 96%', 2),
('Weekend Special', '50% Cashback', 'This weekend only! Get 50% cashback on losses.', 'Play Now', '/game', 'trophy', 'LIMITED', 'destructive', '142 76% 80%', '142 76% 96%', 3);