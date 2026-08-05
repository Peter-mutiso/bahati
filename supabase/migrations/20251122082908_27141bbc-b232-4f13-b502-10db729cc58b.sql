-- Create achievements table
CREATE TABLE IF NOT EXISTS public.spin_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  achievement_type TEXT NOT NULL, -- 'streak', 'win_amount', 'total_spins', 'total_earnings'
  criteria_value NUMERIC NOT NULL,
  badge_color TEXT NOT NULL DEFAULT '#f59e0b',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user achievements table
CREATE TABLE IF NOT EXISTS public.user_spin_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.spin_achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Create user spin stats table for tracking
CREATE TABLE IF NOT EXISTS public.user_spin_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_spins INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  last_spin_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.spin_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spin_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_spin_stats ENABLE ROW LEVEL SECURITY;

-- Policies for spin_achievements
CREATE POLICY "Anyone can view achievements"
  ON public.spin_achievements
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert achievements"
  ON public.spin_achievements
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update achievements"
  ON public.spin_achievements
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete achievements"
  ON public.spin_achievements
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for user_spin_achievements
CREATE POLICY "Users can view their own achievements"
  ON public.user_spin_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user achievements"
  ON public.user_spin_achievements
  FOR INSERT
  WITH CHECK (true);

-- Policies for user_spin_stats
CREATE POLICY "Users can view their own stats"
  ON public.user_spin_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_spin_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert user stats"
  ON public.user_spin_stats
  FOR INSERT
  WITH CHECK (true);

-- Add triggers for updated_at
CREATE TRIGGER update_spin_achievements_updated_at
  BEFORE UPDATE ON public.spin_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_user_spin_stats_updated_at
  BEFORE UPDATE ON public.user_spin_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert default achievements
INSERT INTO public.spin_achievements (name, description, icon, achievement_type, criteria_value, badge_color) VALUES
  ('First Spin', 'Complete your first spin', '🎰', 'total_spins', 1, '#10b981'),
  ('Lucky 7', 'Spin 7 days in a row', '🍀', 'streak', 7, '#f59e0b'),
  ('Big Winner', 'Win $100 or more in a single spin', '💰', 'win_amount', 100, '#fbbf24'),
  ('Mega Winner', 'Win $200 or more in a single spin', '💎', 'win_amount', 200, '#a855f7'),
  ('Legendary Winner', 'Win $500 in a single spin', '👑', 'win_amount', 500, '#ef4444'),
  ('Spin Master', 'Complete 30 spins', '⭐', 'total_spins', 30, '#3b82f6'),
  ('Millionaire Path', 'Earn $1000 total from spins', '🏆', 'total_earnings', 1000, '#dc2626'),
  ('Dedicated Spinner', 'Maintain a 14-day streak', '🔥', 'streak', 14, '#f97316'),
  ('Persistent', 'Maintain a 30-day streak', '🌟', 'streak', 30, '#8b5cf6');
