-- Ensure game_settings always has exactly one seed row.
-- Uses INSERT ... ON CONFLICT DO NOTHING so it's safe to run multiple times.

-- First, identify the primary key column
DO $$
BEGIN
  -- Insert a default row only if the table is empty
  IF NOT EXISTS (SELECT 1 FROM public.game_settings LIMIT 1) THEN
    INSERT INTO public.game_settings DEFAULT VALUES;
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
