-- Create Mines settings table
CREATE TABLE IF NOT EXISTS public.mines_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_bet NUMERIC DEFAULT 10,
  max_bet NUMERIC DEFAULT 100000,
  house_edge NUMERIC DEFAULT 3,
  rtp_percentage NUMERIC DEFAULT 97,
  auto_rtp_enabled BOOLEAN DEFAULT false,
  rtp_mode TEXT DEFAULT 'standard',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID
);

-- Create Mines bets table
CREATE TABLE IF NOT EXISTS public.mines_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  mines_count INTEGER NOT NULL CHECK (mines_count >= 1 AND mines_count <= 24),
  grid_size INTEGER DEFAULT 25,
  tiles_revealed INTEGER[] DEFAULT '{}',
  mine_positions INTEGER[] DEFAULT '{}',
  current_multiplier NUMERIC DEFAULT 1,
  final_multiplier NUMERIC,
  profit NUMERIC,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'busted')),
  server_seed TEXT,
  client_seed TEXT,
  nonce INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create Mines stats table
CREATE TABLE IF NOT EXISTS public.mines_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE DEFAULT CURRENT_DATE,
  total_wagered NUMERIC DEFAULT 0,
  total_paidout NUMERIC DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  current_profit_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mines_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mines_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mines_settings
CREATE POLICY "Anyone can view mines settings"
  ON public.mines_settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can update mines settings"
  ON public.mines_settings FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for mines_bets
CREATE POLICY "Users can view their own mines bets"
  ON public.mines_bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mines bets"
  ON public.mines_bets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mines bets"
  ON public.mines_bets FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for mines_stats
CREATE POLICY "Anyone can view mines stats"
  ON public.mines_stats FOR SELECT
  USING (true);

-- Insert default settings
INSERT INTO public.mines_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Create function to update mines stats
CREATE OR REPLACE FUNCTION public.update_mines_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only update stats when game is finished (cashed_out or busted)
  IF NEW.status IN ('cashed_out', 'busted') THEN
    INSERT INTO mines_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
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
      total_wagered = mines_stats.total_wagered + NEW.amount,
      total_paidout = mines_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
      total_bets = mines_stats.total_bets + 1,
      current_profit_percent = CASE 
        WHEN mines_stats.total_wagered > 0 
        THEN ((mines_stats.total_wagered - mines_stats.total_paidout) / mines_stats.total_wagered * 100)
        ELSE 0
      END,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for mines stats
CREATE TRIGGER update_mines_stats_trigger
  AFTER UPDATE ON public.mines_bets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_mines_stats();