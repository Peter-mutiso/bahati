-- Restrict the normal-player SELECT policy on cycling_race_races to only
-- 'finished' races.
--
-- The previous policy ("Players can view non-upcoming races", USING
-- (status <> 'upcoming')) let any authenticated player read winner_cyclist
-- directly for preparing/betting/locking/racing races - i.e. the real
-- outcome, before it is revealed, completely bypassing the prediction
-- system's real-vs-house separation (list_cycling_race_predictions() /
-- cycling_race_predictions RLS). Since the winner is decided the moment a
-- race is queued (before betting even opens), this let a player query the
-- real winner of the race they could still bet on.
--
-- Confirmed safe to narrow before writing this migration:
--   - Admins keep their own unconditional has_role(auth.uid(),'admin')
--     policy - completely unaffected.
--   - Marketers keep their own is_authorized_marketer_for_game(tenant_id,
--     'cycling-race') policy, which has no status restriction at all - it
--     already independently covers every status, unaffected.
--   - The only two player-facing frontend reads of this table
--     (CycleRaceWinnersBar.tsx, CycleRaceHistory.tsx) already hard-filter
--     status = 'finished', so this is a no-op for existing player UI.
--   - The cycling-race-engine edge function authenticates with the service
--     role key, and activate_next_cycling_race / ensure_cycling_race_queue
--     are SECURITY DEFINER - all three bypass RLS entirely and never
--     depended on this policy.
--
-- Both DROPs use IF EXISTS and the new policy is dropped-then-created so
-- this migration is safe to run more than once.
DROP POLICY IF EXISTS "Players can view non-upcoming races" ON public.cycling_race_races;
DROP POLICY IF EXISTS "Players can view finished races" ON public.cycling_race_races;

CREATE POLICY "Players can view finished races"
  ON public.cycling_race_races FOR SELECT TO authenticated
  USING (status = 'finished');

NOTIFY pgrst, 'reload schema';
