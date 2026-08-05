-- Create coin flip settings table
CREATE TABLE public.coin_flip_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rtp_percentage NUMERIC NOT NULL DEFAULT 95.00,
  house_edge NUMERIC NOT NULL DEFAULT 5.00,
  min_bet NUMERIC NOT NULL DEFAULT 10.00,
  max_bet NUMERIC NOT NULL DEFAULT 10000.00,
  betting_duration_seconds INTEGER NOT NULL DEFAULT 15,
  flip_duration_seconds INTEGER NOT NULL DEFAULT 3,
  rtp_mode TEXT NOT NULL DEFAULT 'balanced',
  auto_rtp_enabled BOOLEAN DEFAULT true,
  manual_result_enabled BOOLEAN DEFAULT false,
  manual_result TEXT DEFAULT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID DEFAULT NULL
);

-- Enable RLS
ALTER TABLE public.coin_flip_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view coin flip settings"
  ON public.coin_flip_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can update coin flip settings"
  ON public.coin_flip_settings
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.coin_flip_settings (id, rtp_percentage, house_edge, min_bet, max_bet)
VALUES (gen_random_uuid(), 95.00, 5.00, 10.00, 10000.00);

-- Create coin flip bets table
CREATE TABLE public.coin_flip_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  round_id UUID NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('heads', 'tails')),
  amount NUMERIC NOT NULL,
  potential_payout NUMERIC NOT NULL,
  profit NUMERIC DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_flip_bets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own coin flip bets"
  ON public.coin_flip_bets
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own coin flip bets"
  ON public.coin_flip_bets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all coin flip bets"
  ON public.coin_flip_bets
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create coin flip rounds table
CREATE TABLE public.coin_flip_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number INTEGER NOT NULL,
  result TEXT CHECK (result IN ('heads', 'tails')),
  status TEXT NOT NULL DEFAULT 'betting',
  server_seed TEXT,
  server_seed_hash TEXT,
  client_seed TEXT,
  nonce INTEGER,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coin_flip_rounds ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view coin flip rounds"
  ON public.coin_flip_rounds
  FOR SELECT
  USING (true);

-- Create coin flip stats table
CREATE TABLE public.coin_flip_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_wagered NUMERIC DEFAULT 0,
  total_paidout NUMERIC DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  current_profit_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT coin_flip_stats_date_key UNIQUE (date)
);

-- Enable RLS
ALTER TABLE public.coin_flip_stats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can view coin flip stats"
  ON public.coin_flip_stats
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert coin flip stats"
  ON public.coin_flip_stats
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update coin flip stats"
  ON public.coin_flip_stats
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function for updating stats
CREATE OR REPLACE FUNCTION public.update_coin_flip_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO coin_flip_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
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
    total_wagered = coin_flip_stats.total_wagered + NEW.amount,
    total_paidout = coin_flip_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = coin_flip_stats.total_bets + 1,
    current_profit_percent = CASE 
      WHEN coin_flip_stats.total_wagered > 0 
      THEN ((coin_flip_stats.total_wagered - coin_flip_stats.total_paidout) / coin_flip_stats.total_wagered * 100)
      ELSE 0
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER update_coin_flip_stats_trigger
  AFTER INSERT OR UPDATE ON public.coin_flip_bets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_coin_flip_stats();