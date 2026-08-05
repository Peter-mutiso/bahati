-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create game_settings table for admin controls
CREATE TABLE public.game_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_crash_point NUMERIC NOT NULL DEFAULT 1.01,
  max_crash_point NUMERIC NOT NULL DEFAULT 10.00,
  currency_symbol TEXT NOT NULL DEFAULT '$',
  currency_name TEXT NOT NULL DEFAULT 'USD',
  house_edge NUMERIC NOT NULL DEFAULT 0.03,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default settings
INSERT INTO public.game_settings (min_crash_point, max_crash_point, currency_symbol, currency_name)
VALUES (1.01, 10.00, '$', 'USD');

-- Enable RLS
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view game settings"
ON public.game_settings FOR SELECT
USING (true);

CREATE POLICY "Admins can update game settings"
ON public.game_settings FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add RLS policies for admins to manage all data
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all wallets"
ON public.wallets FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all bets"
ON public.bets FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create function to get user stats
CREATE OR REPLACE FUNCTION public.get_user_stats(user_id_param UUID)
RETURNS TABLE(
  total_bets BIGINT,
  total_wagered NUMERIC,
  total_profit NUMERIC,
  biggest_win NUMERIC,
  win_rate NUMERIC
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*)::BIGINT as total_bets,
    COALESCE(SUM(amount), 0) as total_wagered,
    COALESCE(SUM(profit), 0) as total_profit,
    COALESCE(MAX(profit), 0) as biggest_win,
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE profit > 0)::NUMERIC / COUNT(*)::NUMERIC * 100)
      ELSE 0
    END as win_rate
  FROM public.bets
  WHERE user_id = user_id_param;
$$;

-- Create trigger to update game_settings timestamp
CREATE OR REPLACE FUNCTION public.update_game_settings_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_game_settings_updated_at
BEFORE UPDATE ON public.game_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_game_settings_timestamp();