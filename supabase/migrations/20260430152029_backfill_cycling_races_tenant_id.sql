-- Backfill tenant_id for cycling races that don't have one
-- This ensures they show up on the Marketer Dashboard

UPDATE public.cycling_race_races
SET tenant_id = 'aaaaaaaa-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;
