-- Fix wingo_rounds round_number to use simple incrementing numbers instead of timestamps
-- Remove any default value that might be generating timestamp-like numbers
ALTER TABLE wingo_rounds 
  ALTER COLUMN round_number DROP DEFAULT,
  ALTER COLUMN round_number SET NOT NULL;

-- Reset existing round numbers to start from 1 if there are any rounds with timestamp-like numbers
-- This will renumber all rounds sequentially
WITH numbered_rounds AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_number
  FROM wingo_rounds
)
UPDATE wingo_rounds 
SET round_number = numbered_rounds.new_number
FROM numbered_rounds
WHERE wingo_rounds.id = numbered_rounds.id;