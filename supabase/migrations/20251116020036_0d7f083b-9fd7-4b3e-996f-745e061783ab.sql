-- Add RTP fields to game_settings table
ALTER TABLE game_settings 
ADD COLUMN IF NOT EXISTS rtp_percentage numeric DEFAULT 95.00 CHECK (rtp_percentage >= 70 AND rtp_percentage <= 99),
ADD COLUMN IF NOT EXISTS auto_rtp_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS rtp_mode text DEFAULT 'balanced' CHECK (rtp_mode IN ('high', 'balanced', 'low'));

-- Create game_stats table for tracking wagers and payouts
CREATE TABLE IF NOT EXISTS game_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  total_wagered numeric DEFAULT 0.00,
  total_paidout numeric DEFAULT 0.00,
  total_bets bigint DEFAULT 0,
  current_profit_percent numeric DEFAULT 0.00,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create unique index on date
CREATE UNIQUE INDEX IF NOT EXISTS game_stats_date_idx ON game_stats(date);

-- Create admin_activity_logs table for tracking RTP changes
CREATE TABLE IF NOT EXISTS admin_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action_type text NOT NULL,
  old_value text,
  new_value text,
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_stats
CREATE POLICY "Admins can view all stats"
  ON game_stats FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update stats"
  ON game_stats FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert stats"
  ON game_stats FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for admin_activity_logs
CREATE POLICY "Admins can view all logs"
  ON admin_activity_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert logs"
  ON admin_activity_logs FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create function to update game stats
CREATE OR REPLACE FUNCTION update_game_stats()
RETURNS trigger AS $$
BEGIN
  -- Update or insert today's stats
  INSERT INTO game_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
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
    total_wagered = game_stats.total_wagered + NEW.amount,
    total_paidout = game_stats.total_paidout + COALESCE(NEW.profit + NEW.amount, NEW.amount),
    total_bets = game_stats.total_bets + 1,
    current_profit_percent = CASE 
      WHEN game_stats.total_wagered > 0 
      THEN ((game_stats.total_wagered - game_stats.total_paidout) / game_stats.total_wagered * 100)
      ELSE 0
    END,
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on bets table to auto-update stats
DROP TRIGGER IF EXISTS update_stats_on_bet ON bets;
CREATE TRIGGER update_stats_on_bet
  AFTER INSERT OR UPDATE ON bets
  FOR EACH ROW
  EXECUTE FUNCTION update_game_stats();

-- Create trigger for admin_activity_logs updated_at
CREATE OR REPLACE FUNCTION update_admin_logs_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Insert default game stats for today if not exists
INSERT INTO game_stats (date, total_wagered, total_paidout, total_bets, current_profit_percent)
VALUES (CURRENT_DATE, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;