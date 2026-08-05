-- Create chicken_road_bets table for storing game bets
CREATE TABLE public.chicken_road_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy',
  lanes_crossed INTEGER NOT NULL DEFAULT 0,
  total_lanes INTEGER NOT NULL DEFAULT 7,
  final_multiplier NUMERIC,
  profit NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chicken_road_bets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own chicken road bets"
ON public.chicken_road_bets
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chicken road bets"
ON public.chicken_road_bets
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all chicken road bets"
ON public.chicken_road_bets
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can update chicken road bets"
ON public.chicken_road_bets
FOR UPDATE
USING (true);