-- Cycle Race: make outcome immutability a hard DB guarantee.
--
-- RLS stops the API/PostgREST layer from letting anyone but the engine's
-- service-role key write to cycling_race_races, but RLS is bypassed by the
-- service role and by anyone using the SQL editor. This trigger closes that
-- gap: once a race has left the 'upcoming' queue, its winner_cyclist can
-- never be changed again by anyone or anything, including future bugs in
-- the engine itself. The only legitimate place winner_cyclist changes after
-- being queued is inside activate_next_cycling_race(), and that happens
-- while the row's status is still 'upcoming', which this trigger allows.

CREATE OR REPLACE FUNCTION public.prevent_cycling_race_outcome_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.winner_cyclist IS DISTINCT FROM OLD.winner_cyclist
     AND OLD.status <> 'upcoming' THEN
    RAISE EXCEPTION
      'winner_cyclist is immutable once a race leaves the upcoming queue (race #%, status %)',
      OLD.race_number, OLD.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_cycling_race_outcome_edit ON public.cycling_race_races;
CREATE TRIGGER trg_prevent_cycling_race_outcome_edit
BEFORE UPDATE ON public.cycling_race_races
FOR EACH ROW
EXECUTE FUNCTION public.prevent_cycling_race_outcome_edit();

NOTIFY pgrst, 'reload schema';
