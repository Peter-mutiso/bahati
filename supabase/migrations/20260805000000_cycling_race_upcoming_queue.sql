-- Cycle Race: pre-generated "upcoming" queue + admin read-only visibility
--
-- Adds an 'upcoming' race status so the engine can maintain a queue of
-- pre-generated races (winner already decided, not yet running) instead of
-- generating a winner at the exact moment each race starts. Also locks down
-- who can see races before they are live, since a 100-race lookahead queue
-- would otherwise leak every future outcome to any authenticated player.

-- 1. Allow 'upcoming' as a valid status
ALTER TABLE public.cycling_race_races DROP CONSTRAINT IF EXISTS cycling_race_races_status_check;
ALTER TABLE public.cycling_race_races ADD CONSTRAINT cycling_race_races_status_check
  CHECK (status IN ('upcoming', 'preparing', 'betting', 'locking', 'racing', 'finished'));

-- 2. Index to make queue lookups (pop next / count / list) cheap at 100+ rows
CREATE INDEX IF NOT EXISTS idx_cycling_race_races_tenant_status_number
  ON public.cycling_race_races (tenant_id, status, race_number);

-- 3. Atomically pop the earliest queued race and promote it to active.
-- Runs as one statement inside the function so two concurrent callers can
-- never activate the same queued race (FOR UPDATE SKIP LOCKED). Manual
-- winner override, if currently enabled, is applied at activation time so
-- toggling it in the admin panel still takes effect on the very next race
-- instead of waiting for the whole queue to drain.
CREATE OR REPLACE FUNCTION public.activate_next_cycling_race(
  p_tenant_id uuid,
  p_manual_winner_enabled boolean,
  p_manual_winner_cyclist integer,
  p_race_duration integer
)
RETURNS public.cycling_race_races
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_race_id uuid;
  v_race public.cycling_race_races;
BEGIN
  SELECT id INTO v_race_id
  FROM public.cycling_race_races
  WHERE tenant_id = p_tenant_id
    AND status = 'upcoming'
  ORDER BY race_number ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1;

  IF v_race_id IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.cycling_race_races
  SET
    status = 'preparing',
    started_at = now(),
    race_duration = COALESCE(p_race_duration, race_duration),
    winner_cyclist = CASE
      WHEN p_manual_winner_enabled AND p_manual_winner_cyclist IS NOT NULL
        THEN p_manual_winner_cyclist
      ELSE winner_cyclist
    END
  WHERE id = v_race_id
  RETURNING * INTO v_race;

  RETURN v_race;
END;
$$;

-- Only the engine (service role) may activate races - never end users.
REVOKE ALL ON FUNCTION public.activate_next_cycling_race(uuid, boolean, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_next_cycling_race(uuid, boolean, integer, integer) TO service_role;

-- 4. Tighten player visibility: the queue now holds up to 100 future
-- outcomes at once, so the old "Anyone can view races" (USING true) policy
-- would let any authenticated player read every future winner in advance.
-- Players keep seeing everything they could see before (preparing, betting,
-- locking, racing, finished) - only 'upcoming' rows are newly hidden from them.
DROP POLICY IF EXISTS "Anyone can view races" ON public.cycling_race_races;
CREATE POLICY "Players can view non-upcoming races"
  ON public.cycling_race_races FOR SELECT TO authenticated
  USING (status <> 'upcoming');

-- 5. Admins get explicit, dedicated read-only access to every race
-- (including the upcoming queue). No INSERT/UPDATE/DELETE policy is granted
-- to admins here, so this cannot be used to edit outcomes.
DROP POLICY IF EXISTS "Admins can view all cycling races" ON public.cycling_race_races;
CREATE POLICY "Admins can view all cycling races"
  ON public.cycling_race_races FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

NOTIFY pgrst, 'reload schema';
