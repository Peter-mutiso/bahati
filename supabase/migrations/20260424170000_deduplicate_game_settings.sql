-- game_settings should only ever have ONE row.
-- Keep the most recently updated row and delete the rest.

DO $$
DECLARE
  keeper_id UUID;
BEGIN
  -- Find the row with the most data (non-null website_name preferred, else latest updated_at)
  SELECT id INTO keeper_id
  FROM public.game_settings
  ORDER BY 
    (website_name IS NOT NULL) DESC,
    updated_at DESC NULLS LAST
  LIMIT 1;

  -- Delete all other rows
  DELETE FROM public.game_settings
  WHERE id != keeper_id;

  RAISE NOTICE 'Kept game_settings row: %', keeper_id;
END;
$$;

NOTIFY pgrst, 'reload schema';
