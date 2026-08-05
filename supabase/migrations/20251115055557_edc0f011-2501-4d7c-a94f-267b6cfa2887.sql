-- Allow anonymous users to view profiles (needed for displaying bet information)
CREATE POLICY "Anyone can view profiles"
ON public.profiles
FOR SELECT
USING (true);