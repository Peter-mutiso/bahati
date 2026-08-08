-- Cycle Race: player-facing Predictions system.
--
-- Design goals (do not relax these when touching this file later):
--   1. cycling_race_races.winner_cyclist, queued via the 'upcoming' status
--      (20260805000000_cycling_race_upcoming_queue.sql) and made immutable
--      once activated (20260805010000_cycling_race_outcome_immutability.sql),
--      remains the ONLY value ever used for settlement. Nothing in this
--      migration touches activate_next_cycling_race(), ensure_cycling_race_queue(),
--      prevent_cycling_race_outcome_edit(), or the cycling-race-engine edge
--      function's processRaceBets().
--   2. A prediction row is a frozen SNAPSHOT taken the moment a race is
--      queued, not a live read of cycling_race_races. Editing, regenerating,
--      or deleting a prediction can never change a real race outcome, and
--      there is no trigger anywhere on cycling_race_races that reacts to
--      this table - the relationship is one-way (predictions -> races).
--   3. Who sees what is resolved entirely inside list_cycling_race_predictions()
--      below, server-side, based on the caller's role/account_type. Real
--      players never get row-level or column-level access to the raw
--      real_outcome_cyclist value - there is no RLS SELECT policy exposing
--      it to them, so bypassing the app UI cannot leak it either.
--   4. The actual "what should the house prediction look like" logic lives
--      in exactly one function, generate_house_cycling_race_prediction(),
--      driven by cycling_race_prediction_settings. Adjust behavior there;
--      nothing else needs to change.

-- ── 1. Configurable house logic settings (singleton, mirrors the
--       cycling_race_settings "most recently updated row wins" convention) ──
CREATE TABLE public.cycling_race_prediction_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bias_mode TEXT NOT NULL DEFAULT 'uniform' CHECK (bias_mode IN ('uniform', 'favor_low', 'favor_high')),
  confidence_min NUMERIC(5,2) NOT NULL DEFAULT 55.00 CHECK (confidence_min BETWEEN 0 AND 100),
  confidence_max NUMERIC(5,2) NOT NULL DEFAULT 95.00 CHECK (confidence_max BETWEEN 0 AND 100),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (confidence_min <= confidence_max)
);

INSERT INTO public.cycling_race_prediction_settings (bias_mode, confidence_min, confidence_max)
VALUES ('uniform', 55.00, 95.00);

ALTER TABLE public.cycling_race_prediction_settings ENABLE ROW LEVEL SECURITY;

-- Only admins need this table at all: the trigger/RPCs below read it as
-- SECURITY DEFINER (bypassing RLS), and no client other than the admin
-- panel has a reason to see or change house-logic tuning.
CREATE POLICY "Admins can view prediction settings"
  ON public.cycling_race_prediction_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update prediction settings"
  ON public.cycling_race_prediction_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 2. The prediction snapshot table ──────────────────────────────────────
CREATE TABLE public.cycling_race_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  race_id UUID NOT NULL UNIQUE REFERENCES public.cycling_race_races(id) ON DELETE CASCADE,
  race_number INTEGER NOT NULL,
  real_outcome_cyclist INTEGER NOT NULL,
  house_prediction_cyclist INTEGER NOT NULL CHECK (house_prediction_cyclist BETWEEN 1 AND 10),
  confidence_percentage NUMERIC(5,2) NOT NULL CHECK (confidence_percentage BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Schema-level backstop for the "never shown the truth" business rule:
  -- house_prediction_cyclist must differ from real_outcome_cyclist. This
  -- holds even if a future code change to the generator forgets to pass
  -- p_exclude_cyclist - the insert/update would fail loudly instead of
  -- silently leaking the real outcome to real players. Only reachable
  -- edge case is number_of_cyclists = 1, which the admin UI already
  -- prevents (clamped to 2-10).
  CONSTRAINT cycling_race_predictions_house_differs_from_real
    CHECK (house_prediction_cyclist <> real_outcome_cyclist)
);

CREATE INDEX idx_cycling_race_predictions_tenant_status_number
  ON public.cycling_race_predictions (tenant_id, status, race_number);

ALTER TABLE public.cycling_race_predictions ENABLE ROW LEVEL SECURITY;

-- Admins and assigned marketers may read the raw table directly - this is
-- how they "always see the real queued winner": both real_outcome_cyclist
-- and house_prediction_cyclist are visible to them side by side for
-- oversight. No INSERT/UPDATE/DELETE policy is granted to either - rows are
-- created by the trigger below and the only mutation path is the
-- regenerate RPC, both SECURITY DEFINER and both leaving real_outcome_cyclist
-- untouched.
CREATE POLICY "Admins can view all predictions"
  ON public.cycling_race_predictions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "marketer_select_assigned_cycling_race_predictions"
  ON public.cycling_race_predictions FOR SELECT TO authenticated
  USING (public.is_authorized_marketer_for_game(tenant_id, 'cycling-race'));

-- Deliberately NO policy for plain authenticated users: real players (and
-- demo/bot accounts) have zero direct table access. They can only reach
-- this data through list_cycling_race_predictions(), which decides what to
-- hand back based on who is asking.

CREATE OR REPLACE FUNCTION public.touch_cycling_race_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_touch_cycling_race_predictions_updated_at
BEFORE UPDATE ON public.cycling_race_predictions
FOR EACH ROW EXECUTE FUNCTION public.touch_cycling_race_predictions_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.cycling_race_predictions;

-- ── 3. House prediction generator - the ONE place to adjust "what does the
--       decoy look like". Deliberately takes no input derived from the real
--       winner beyond p_exclude_cyclist, which it uses ONLY to rule that one
--       number out of the draw - the selection among the remaining cyclists
--       is still independent of the real outcome, so there is no
--       statistical link to reverse-engineer.
--
--       Business rule: for real players, house_prediction_cyclist must
--       never equal real_outcome_cyclist. Pass the real winner as
--       p_exclude_cyclist (both call sites below do) and this function
--       guarantees the returned predicted_cyclist is a different cyclist,
--       while still honoring the configured bias_mode weighting over the
--       remaining candidates. Pass NULL to draw with no exclusion (unused
--       today, kept for callers that don't have a real outcome to avoid).
CREATE OR REPLACE FUNCTION public.generate_house_cycling_race_prediction(
  p_number_of_cyclists INTEGER,
  p_exclude_cyclist INTEGER DEFAULT NULL
)
RETURNS TABLE(predicted_cyclist INTEGER, confidence_percentage NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings public.cycling_race_prediction_settings;
  v_weights NUMERIC[];
  v_total NUMERIC := 0;
  v_roll NUMERIC;
  v_cursor NUMERIC := 0;
  v_cyclists INTEGER := GREATEST(1, COALESCE(p_number_of_cyclists, 6));
  i INTEGER;
BEGIN
  SELECT * INTO v_settings
  FROM public.cycling_race_prediction_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_settings IS NULL THEN
    v_settings.bias_mode := 'uniform';
    v_settings.confidence_min := 55;
    v_settings.confidence_max := 95;
  END IF;

  FOR i IN 1..v_cyclists LOOP
    v_weights[i] := CASE v_settings.bias_mode
      WHEN 'favor_low' THEN (v_cyclists - i + 1)::numeric
      WHEN 'favor_high' THEN i::numeric
      ELSE 1
    END;

    -- Zero out the real outcome's weight so it can never be drawn, unless
    -- it's the only cyclist that exists at all (v_cyclists = 1), in which
    -- case there is no "different cyclist" to fall back to.
    IF p_exclude_cyclist IS NOT NULL AND i = p_exclude_cyclist AND v_cyclists > 1 THEN
      v_weights[i] := 0;
    END IF;

    v_total := v_total + v_weights[i];
  END LOOP;

  v_roll := random() * v_total;
  FOR i IN 1..v_cyclists LOOP
    v_cursor := v_cursor + v_weights[i];
    IF v_roll <= v_cursor AND v_weights[i] > 0 THEN
      predicted_cyclist := i;
      EXIT;
    END IF;
  END LOOP;

  IF predicted_cyclist IS NULL THEN
    -- Fallback (e.g. floating-point edge case at the top of the range, or
    -- v_cyclists = 1): pick the last cyclist with positive weight, which is
    -- never the excluded one when an alternative exists.
    FOR i IN REVERSE v_cyclists..1 LOOP
      IF v_weights[i] > 0 THEN
        predicted_cyclist := i;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  IF predicted_cyclist IS NULL THEN
    predicted_cyclist := COALESCE(p_exclude_cyclist, v_cyclists);
  END IF;

  confidence_percentage := round(
    (v_settings.confidence_min + random() * (v_settings.confidence_max - v_settings.confidence_min))::numeric,
    2
  );

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_house_cycling_race_prediction(INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_house_cycling_race_prediction(INTEGER, INTEGER) TO service_role;

-- ── 4. Auto-generate a prediction snapshot the instant a race is queued ──
-- AFTER INSERT so it can never block, delay, or roll back the actual queue
-- insert (activate_next_cycling_race / ensure_cycling_race_queue / the
-- cold-start fallback in the edge function are all unmodified). Wrapped in
-- EXCEPTION WHEN OTHERS so any failure here (e.g. no settings row somehow)
-- degrades to "no prediction shown" rather than ever breaking race creation.
CREATE OR REPLACE FUNCTION public.handle_new_cycling_race_prediction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_number_of_cyclists INTEGER;
  v_house RECORD;
BEGIN
  IF NEW.winner_cyclist IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT number_of_cyclists INTO v_number_of_cyclists
  FROM public.cycling_race_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT * INTO v_house
  FROM public.generate_house_cycling_race_prediction(COALESCE(v_number_of_cyclists, 6), NEW.winner_cyclist);

  INSERT INTO public.cycling_race_predictions (
    tenant_id, race_id, race_number, real_outcome_cyclist,
    house_prediction_cyclist, confidence_percentage
  ) VALUES (
    NEW.tenant_id, NEW.id, NEW.race_number, NEW.winner_cyclist,
    v_house.predicted_cyclist, v_house.confidence_percentage
  )
  ON CONFLICT (race_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_cycling_race_prediction failed for race %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_cycling_race_prediction
AFTER INSERT ON public.cycling_race_races
FOR EACH ROW EXECUTE FUNCTION public.handle_new_cycling_race_prediction();

-- ── 5. The service every client actually calls ────────────────────────────
-- Admins, assigned marketers, and demo/bot accounts always get the real
-- queued winner as their "prediction". Genuine real-money players get the
-- independently generated house_prediction_cyclist. This is the single
-- chokepoint that decides real-vs-house; the player Predictions page and
-- the admin Predictions panel both go through it (admins additionally have
-- raw table access for side-by-side oversight, per policy above).
CREATE OR REPLACE FUNCTION public.list_cycling_race_predictions(p_tenant_id UUID, p_limit INTEGER DEFAULT 20)
RETURNS TABLE(race_number INTEGER, predicted_cyclist INTEGER, confidence_percentage NUMERIC, is_verified_outcome BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reveal_real BOOLEAN := false;
BEGIN
  SELECT
    public.has_role(auth.uid(), 'admin')
    OR public.is_authorized_marketer_for_game(p_tenant_id, 'cycling-race')
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_type IN ('demo', 'bot')
    )
  INTO v_reveal_real;

  RETURN QUERY
  SELECT
    p.race_number,
    CASE WHEN v_reveal_real THEN p.real_outcome_cyclist ELSE p.house_prediction_cyclist END,
    p.confidence_percentage,
    v_reveal_real
  FROM public.cycling_race_predictions p
  WHERE p.tenant_id = p_tenant_id
    AND p.status = 'active'
  ORDER BY p.race_number ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 100));
END;
$$;

REVOKE ALL ON FUNCTION public.list_cycling_race_predictions(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_cycling_race_predictions(UUID, INTEGER) TO authenticated;

-- ── 6. Admin/marketer action: re-roll only the house-facing decoy ─────────
-- Never touches real_outcome_cyclist or cycling_race_races - purely lets an
-- operator refresh what real players see for a given already-queued race,
-- using the same generator the auto-creation trigger uses.
CREATE OR REPLACE FUNCTION public.regenerate_house_cycling_race_prediction(p_prediction_id UUID)
RETURNS public.cycling_race_predictions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cycling_race_predictions;
  v_number_of_cyclists INTEGER;
  v_real_outcome INTEGER;
  v_house RECORD;
  v_authorized BOOLEAN;
BEGIN
  SELECT
    public.has_role(auth.uid(), 'admin')
      OR public.is_authorized_marketer_for_game(p.tenant_id, 'cycling-race'),
    p.real_outcome_cyclist
  INTO v_authorized, v_real_outcome
  FROM public.cycling_race_predictions p
  WHERE p.id = p_prediction_id;

  IF v_authorized IS NOT TRUE THEN
    RAISE EXCEPTION 'Not authorized to regenerate this prediction';
  END IF;

  SELECT number_of_cyclists INTO v_number_of_cyclists
  FROM public.cycling_race_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  SELECT * INTO v_house
  FROM public.generate_house_cycling_race_prediction(COALESCE(v_number_of_cyclists, 6), v_real_outcome);

  UPDATE public.cycling_race_predictions
  SET house_prediction_cyclist = v_house.predicted_cyclist,
      confidence_percentage = v_house.confidence_percentage
  WHERE id = p_prediction_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_house_cycling_race_prediction(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_house_cycling_race_prediction(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
