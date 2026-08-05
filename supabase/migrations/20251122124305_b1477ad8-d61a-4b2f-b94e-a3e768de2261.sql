-- Enable anonymous read access to bets table for leaderboard
CREATE POLICY "Allow anonymous read access to bets for leaderboard"
ON public.bets
FOR SELECT
TO anon
USING (true);

-- Enable anonymous read access to profiles table for leaderboard
CREATE POLICY "Allow anonymous read access to profiles for leaderboard"
ON public.profiles
FOR SELECT
TO anon
USING (true);

-- Enable anonymous read access to game_rounds for today's high
CREATE POLICY "Allow anonymous read access to game_rounds"
ON public.game_rounds
FOR SELECT
TO anon
USING (true);