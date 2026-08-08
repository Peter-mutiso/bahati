-- Cycle Race: harden the upcoming-queue implementation.
--
-- Architect review of the queue found two real race conditions in the
-- application-layer logic:
--
--   1. race_number was computed in JS as "SELECT MAX + 1, then INSERT".
--      Two concurrent callers (or the cold-start fallback firing twice)
--      could read the same max and insert duplicate race numbers - there
--      was no constraint to even catch it.
--   2. Queue top-up was "SELECT count, then INSERT the shortfall" from JS.
--      Two concurrent callers could both read a stale count and both
--      insert, overshooting the target queue size.
--
-- Both are fixed by moving the allocation to Postgres, which can do
-- "check and act" atomically; JS keeps sole ownership of the actual RNG
-- (manual override / weighted RTP), so there is still exactly one place
-- winners are decided.

-- 1. race_number becomes a real sequence instead of an app-computed value.
-- This makes allocation atomic (sequences are concurrency-safe by design)
-- and removes a round trip on every insert path.
CREATE SEQUENCE IF NOT EXISTS public.cycling_race_races_race_number_seq;

-- Seed it to continue from whatever the highest existing race_number is,
-- so this is a no-op change in behavior for existing data.
SELECT setval(
  'public.cycling_race_races_race_number_seq',
  COALESCE((SELECT MAX(race_number) FROM public.cycling_race_races), 0) + 1,
  false
);

ALTER TABLE public.cycling_race_races
  ALTER COLUMN race_number SET DEFAULT nextval('public.cycling_race_races_race_number_seq');

-- Ties the sequence's lifecycle to the column (dropped together).
ALTER SEQUENCE public.cycling_race_races_race_number_seq
  OWNED BY public.cycling_race_races.race_number;

-- 2. Add a UNIQUE constraint to make race_number collisions structurally
-- impossible going forward - but only if no duplicates already exist, so
-- this migration can never fail against real data. If duplicates are found,
-- it logs what to run after they're cleaned up instead of aborting.
DO $$
DECLARE
  v_dupe_count integer;
BEGIN
  SELECT count(*) INTO v_dupe_count
  FROM (
    SELECT race_number
    FROM public.cycling_race_races
    GROUP BY race_number
    HAVING count(*) > 1
  ) dupes;

  IF v_dupe_count = 0 THEN
    ALTER TABLE public.cycling_race_races
      ADD CONSTRAINT cycling_race_races_race_number_key UNIQUE (race_number);
  ELSE
    RAISE NOTICE 'Skipping UNIQUE constraint on cycling_race_races.race_number: % duplicate value(s) found. Resolve them, then run: ALTER TABLE public.cycling_race_races ADD CONSTRAINT cycling_race_races_race_number_key UNIQUE (race_number);', v_dupe_count;
  END IF;
END;
$$;

-- 3. Atomic queue top-up. JS still generates the actual winner values
-- (single source of truth for the RTP/manual-override algorithm) and
-- passes up to QUEUE_SIZE pre-rolled candidates; this function decides
-- under lock how many are actually needed and inserts only those.
--
-- pg_advisory_xact_lock is transaction-scoped (released automatically when
-- the function's implicit transaction ends), which is what makes it safe
-- to use behind PgBouncer/Supavisor transaction-mode pooling - a session
-- level lock taken via a separate RPC call would not be, since a later
-- request could be handed a different underlying connection while the lock
-- is still held.
CREATE OR REPLACE FUNCTION public.ensure_cycling_race_queue(
  p_tenant_id uuid,
  p_queue_size integer,
  p_race_duration integer,
  p_winners integer[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_deficit integer;
  v_inserted integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('cycling_race_queue:' || p_tenant_id::text, 0));

  SELECT count(*) INTO v_count
  FROM public.cycling_race_races
  WHERE tenant_id = p_tenant_id
    AND status = 'upcoming';

  v_deficit := p_queue_size - v_count;
  IF v_deficit <= 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.cycling_race_races (winner_cyclist, race_duration, status, started_at, tenant_id)
  SELECT w, p_race_duration, 'upcoming', NULL, p_tenant_id
  FROM unnest(p_winners) AS w
  LIMIT v_deficit;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_cycling_race_queue(uuid, integer, integer, integer[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_cycling_race_queue(uuid, integer, integer, integer[]) TO service_role;

NOTIFY pgrst, 'reload schema';
