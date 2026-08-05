-- Create aviator settings table
CREATE TABLE public.aviator_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rtp_percentage numeric NOT NULL DEFAULT 95.00,
  house_edge numeric NOT NULL DEFAULT 5.00,
  min_bet numeric NOT NULL DEFAULT 10.00,
  max_bet numeric NOT NULL DEFAULT 10000.00,
  preparing_duration_seconds integer NOT NULL DEFAULT 10,
  auto_rtp_enabled boolean DEFAULT true,
  rtp_mode text NOT NULL DEFAULT 'balanced'::text,
  use_manual_crash_point boolean DEFAULT false,
  manual_crash_points numeric[] DEFAULT '{}'::numeric[],
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid
);

-- Enable RLS
ALTER TABLE public.aviator_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view aviator settings" ON public.aviator_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update aviator settings" ON public.aviator_settings FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.aviator_settings (rtp_percentage, house_edge, min_bet, max_bet) VALUES (95.00, 5.00, 10.00, 10000.00);

-- Create aviator stats table
CREATE TABLE public.aviator_stats (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_wagered numeric DEFAULT 0,
  total_paidout numeric DEFAULT 0,
  total_bets integer DEFAULT 0,
  current_profit_percent numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT aviator_stats_date_key UNIQUE (date)
);

-- Enable RLS
ALTER TABLE public.aviator_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for stats
CREATE POLICY "Admins can view aviator stats" ON public.aviator_stats FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert aviator stats" ON public.aviator_stats FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update aviator stats" ON public.aviator_stats FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function for aviator stats
CREATE OR REPLACE FUNCTION public.update_aviator_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO aviator_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
  VALUES (
    CURRENT_DATE,
    NEW.amount,
    COALESCE(NEW.profit + NEW.amount, NEW.amount),
    1,
    CASE 
      WHEN NEW.amount > 0 THEN ((NEW.amount - COALESCE(NEW.profit + NEW.amount, NEW.amount)) / NEW.amount * 100)
      ELSE 0
    END
  )
  ON CONFLICT (date) 
  DO UPDATE SET
    total_wagered = aviator_stats.total_wagered + NEW.amount,
    total_paidout = aviator_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = aviator_stats.total_bets + 1,
    current_profit_percent = CASE 
      WHEN aviator_stats.total_wagered > 0 
      THEN ((aviator_stats.total_wagered - aviator_stats.total_paidout) / aviator_stats.total_wagered * 100)
      ELSE 0
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$function$;