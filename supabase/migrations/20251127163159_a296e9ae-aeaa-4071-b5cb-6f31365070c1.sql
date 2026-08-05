-- Fix nonce column type in mines_bets table to support larger timestamp values
ALTER TABLE mines_bets ALTER COLUMN nonce TYPE bigint;