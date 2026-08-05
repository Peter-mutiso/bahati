-- Create coin_train_settings table
CREATE TABLE public.coin_train_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  rtp_mode text NOT NULL DEFAULT 'balanced',
  auto_rtp_enabled boolean DEFAULT true,
  preparing_duration_seconds integer NOT NULL DEFAULT 10,
  use_manual_crash_point boolean DEFAULT false,
  manual_crash_points numeric[] DEFAULT '{}'::numeric[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Insert default settings
INSERT INTO public.coin_train_settings (id) VALUES (gen_random_uuid());

-- Enable RLS
ALTER TABLE public.coin_train_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view coin train settings" 
ON public.coin_train_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update coin train settings" 
ON public.coin_train_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create coin_train_stats table
CREATE TABLE public.coin_train_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_wagered numeric DEFAULT 0,
  total_paidout numeric DEFAULT 0,
  total_bets integer DEFAULT 0,
  current_profit_percent numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coin_train_stats_date_key UNIQUE (date)
);

-- Enable RLS
ALTER TABLE public.coin_train_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view coin train stats" 
ON public.coin_train_stats 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coin train stats" 
ON public.coin_train_stats 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coin train stats" 
ON public.coin_train_stats 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));