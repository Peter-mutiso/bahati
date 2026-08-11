-- Backfill missing cycling_race_predictions rows for still-relevant races.
--
-- trg_generate_cycling_race_prediction only fires AFTER INSERT on
-- cycling_race_races, so any race row that existed before that trigger was
-- deployed never got a prediction snapshot. This is a one-time, read-only-
-- on-races / insert-only-on-predictions backfill using the exact same
-- generate_house_cycling_race_prediction() the trigger already uses - no
-- new logic, no change to cycling_race_races, no change to winner_cyclist.
--
-- Deliberately scoped to status IN ('upcoming', 'preparing', 'racing') -
-- i.e. races whose outcome is already queued but not yet publicly revealed.
-- 'finished' races are excluded on purpose: they have already been settled
-- and shown to everyone, so a "prediction" for one has no product value and
-- backfilling ~8000 of them would just be noise. This matches the client's
-- literal ask ("predictions for EVERY upcoming round"), not "for every race
-- that has ever existed."
--
-- Idempotent: NOT EXISTS + ON CONFLICT (race_id) DO NOTHING means re-running
-- this migration (or any future migration touching the same rows) is a
-- no-op the second time.
INSERT INTO public.cycling_race_predictions (
  tenant_id, race_id, race_number, real_outcome_cyclist,
  house_prediction_cyclist, confidence_percentage
)
SELECT
  r.tenant_id,
  r.id,
  r.race_number,
  r.winner_cyclist,
  h.predicted_cyclist,
  h.confidence_percentage
FROM public.cycling_race_races r
CROSS JOIN LATERAL public.generate_house_cycling_race_prediction(
  COALESCE(
    (SELECT number_of_cyclists FROM public.cycling_race_settings ORDER BY updated_at DESC LIMIT 1),
    6
  ),
  r.winner_cyclist
) h
WHERE r.winner_cyclist IS NOT NULL
  AND r.status IN ('upcoming', 'preparing', 'racing')
  AND NOT EXISTS (
    SELECT 1 FROM public.cycling_race_predictions p WHERE p.race_id = r.id
  )
ON CONFLICT (race_id) DO NOTHING;
