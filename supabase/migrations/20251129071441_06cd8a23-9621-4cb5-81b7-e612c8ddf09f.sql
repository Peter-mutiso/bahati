-- Add RLS policy for service role to access wingo_settings
CREATE POLICY "Service role can access wingo settings"
ON wingo_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);