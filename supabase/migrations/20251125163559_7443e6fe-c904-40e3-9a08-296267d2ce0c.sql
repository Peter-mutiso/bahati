-- Enable realtime for coin flip bets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_flip_bets;

-- Enable realtime for coin flip rounds table
ALTER PUBLICATION supabase_realtime ADD TABLE public.coin_flip_rounds;