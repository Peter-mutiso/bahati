-- Create table for Chicken Road how to play content
CREATE TABLE public.chicken_road_how_to_play (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'How to Play',
  content TEXT NOT NULL DEFAULT 'Select your difficulty level and place your bet. Guide your chicken across the road by clicking GO. Each successful lane crossing increases your multiplier. Cash out anytime to secure your winnings. Hit a car and lose your bet!',
  rules JSONB NOT NULL DEFAULT '["Choose difficulty: Easy (30 lanes), Medium (25 lanes), Hard (22 lanes), Expert (18 lanes)", "Place your bet using preset buttons or custom amount", "Click GO to move the chicken forward one lane", "Each lane crossed increases your multiplier", "Click CASHOUT anytime to secure your winnings", "If the chicken hits a car, you lose your bet", "Higher difficulty = Higher risk = Higher rewards"]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.chicken_road_how_to_play ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view how to play" 
ON public.chicken_road_how_to_play 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update how to play" 
ON public.chicken_road_how_to_play 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default content
INSERT INTO public.chicken_road_how_to_play (title, content) VALUES (
  'How to Play',
  'Select your difficulty level and place your bet. Guide your chicken across the road by clicking GO. Each successful lane crossing increases your multiplier. Cash out anytime to secure your winnings. Hit a car and lose your bet!'
);