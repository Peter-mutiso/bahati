-- Create chicken_road_settings table
CREATE TABLE public.chicken_road_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  min_bet NUMERIC NOT NULL DEFAULT 10,
  max_bet NUMERIC NOT NULL DEFAULT 10000,
  rtp_percentage NUMERIC NOT NULL DEFAULT 95 CHECK (rtp_percentage >= 50 AND rtp_percentage <= 100),
  house_edge NUMERIC NOT NULL DEFAULT 5,
  auto_rtp_enabled BOOLEAN DEFAULT true,
  rtp_mode TEXT DEFAULT 'balanced',
  -- Manual lane control for each difficulty (null = auto, number = specific lane to crash)
  manual_crash_lane_easy INTEGER DEFAULT NULL CHECK (manual_crash_lane_easy IS NULL OR (manual_crash_lane_easy >= 0 AND manual_crash_lane_easy <= 4)),
  manual_crash_lane_medium INTEGER DEFAULT NULL CHECK (manual_crash_lane_medium IS NULL OR (manual_crash_lane_medium >= 0 AND manual_crash_lane_medium <= 6)),
  manual_crash_lane_hard INTEGER DEFAULT NULL CHECK (manual_crash_lane_hard IS NULL OR (manual_crash_lane_hard >= 0 AND manual_crash_lane_hard <= 8)),
  manual_crash_lane_expert INTEGER DEFAULT NULL CHECK (manual_crash_lane_expert IS NULL OR (manual_crash_lane_expert >= 0 AND manual_crash_lane_expert <= 10)),
  manual_control_enabled BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.chicken_road_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public read access to chicken_road_settings"
ON public.chicken_road_settings
FOR SELECT
USING (true);

CREATE POLICY "Allow admin update access to chicken_road_settings"
ON public.chicken_road_settings
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.chicken_road_settings (id) VALUES (gen_random_uuid());

-- Create chicken_road_stats table for RTP tracking
CREATE TABLE public.chicken_road_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  total_wagered NUMERIC DEFAULT 0,
  total_paidout NUMERIC DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  current_profit_percent NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chicken_road_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for stats
CREATE POLICY "Allow public read access to chicken_road_stats"
ON public.chicken_road_stats
FOR SELECT
USING (true);

CREATE POLICY "Allow admin full access to chicken_road_stats"
ON public.chicken_road_stats
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create update trigger for stats
CREATE OR REPLACE FUNCTION public.update_chicken_road_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chicken_road_settings_timestamp
BEFORE UPDATE ON public.chicken_road_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_chicken_road_settings_timestamp();