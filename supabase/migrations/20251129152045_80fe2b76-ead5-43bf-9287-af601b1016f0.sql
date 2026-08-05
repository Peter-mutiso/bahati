-- Change round_number to bigint to support larger period numbers
ALTER TABLE public.wingo_rounds 
  ALTER COLUMN round_number TYPE bigint;

-- Now set the sequence to start at 20252469655
DO $$
DECLARE
  seq_name text;
BEGIN
  SELECT pg_get_serial_sequence('public.wingo_rounds', 'round_number') INTO seq_name;
  
  IF seq_name IS NOT NULL THEN
    -- Drop the old sequence
    EXECUTE format('DROP SEQUENCE IF EXISTS %s', seq_name);
    
    -- Create new bigint sequence
    EXECUTE format('CREATE SEQUENCE %s AS bigint START WITH 20252469655', seq_name);
    
    -- Set the column default to use the new sequence
    EXECUTE format('ALTER TABLE public.wingo_rounds ALTER COLUMN round_number SET DEFAULT nextval(%L)', seq_name);
  END IF;
END $$;