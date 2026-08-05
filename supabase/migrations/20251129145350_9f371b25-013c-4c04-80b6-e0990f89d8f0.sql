-- Create a sequence for wingo round numbers
CREATE SEQUENCE IF NOT EXISTS wingo_round_number_seq START WITH 1;

-- Set the sequence to continue from the current maximum round number
SELECT setval('wingo_round_number_seq', COALESCE((SELECT MAX(round_number) FROM wingo_rounds), 0));

-- Set the round_number column to use the sequence as default
ALTER TABLE wingo_rounds 
  ALTER COLUMN round_number SET DEFAULT nextval('wingo_round_number_seq');