import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type RaceStatus = 'preparing' | 'locking' | 'racing' | 'finished';

interface RaceState {
  raceId: string | null;
  status: RaceStatus;
  phase: number;
  timeLeft: number;
  winnerCyclist: number | null;
}

interface RaceSettings {
  betting_duration_seconds: number;
  race_duration_seconds: number;
}

const DEFAULT_TENANT_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
const FINISHED_DURATION_SECONDS = 3;
const RETRY_DELAY_MS = 5000;
const TICK_MS = 1000;

const INITIAL_STATE: RaceState = {
  raceId: null,
  status: 'preparing',
  phase: 3,
  timeLeft: 5,
  winnerCyclist: null,
};

export const useCycleRaceEngine = () => {
  const [raceState, setRaceState] = useState<RaceState>(INITIAL_STATE);

  // Mirrors `raceState` synchronously. The interval tick and the state
  // machine below are created ONCE (effect deps = []) and never
  // recreated, so they can't read `raceState` from the render closure
  // without it going stale - they read this ref instead.
  const stateRef = useRef<RaceState>(INITIAL_STATE);

  const settingsRef = useRef<RaceSettings>({
    betting_duration_seconds: 5,
    race_duration_seconds: 8,
  });
  const tenantIdRef = useRef<string>(DEFAULT_TENANT_ID);
  const phaseDeadlineRef = useRef<number>(0);
  const transitioningRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  // Bumped once per effect run. Every async continuation below checks this
  // before touching state, refs, or the network again. This is what makes
  // a React StrictMode double-invoke (mount -> cleanup -> mount) inert: the
  // cancelled first run's in-flight promises still resolve, but they see
  // their token is stale and become no-ops instead of starting a second,
  // parallel lifecycle.
  const runTokenRef = useRef(0);

  useEffect(() => {
    // TEMPORARY DEBUG INSTRUMENTATION - remove once root cause is confirmed.
    console.count('useCycleRaceEngine mounted');

    const myToken = ++runTokenRef.current;
    const isCurrent = () => runTokenRef.current === myToken;

    const applyState = (updater: (prev: RaceState) => RaceState) => {
      if (!isCurrent()) return;
      setRaceState(prev => {
        const next = updater(prev);
        stateRef.current = next;
        return next;
      });
    };

    const enterPhase = (
      status: RaceStatus,
      phase: number,
      durationSeconds: number,
      extra: Partial<RaceState> = {}
    ) => {
      phaseDeadlineRef.current = Date.now() + durationSeconds * 1000;
      applyState(prev => ({ ...prev, ...extra, status, phase, timeLeft: durationSeconds }));
    };

    const scheduleRetry = () => {
      phaseDeadlineRef.current = Date.now() + RETRY_DELAY_MS;
    };

    const invokeEngine = (body: Record<string, unknown>) =>
      supabase.functions.invoke('cycling-race-engine', { body });

    const loadSettings = async () => {
      const { data, error } = await supabase
        .from('cycling_race_settings')
        .select('betting_duration_seconds, race_duration_seconds')
        .maybeSingle();
      if (!isCurrent()) return;
      if (!error && data) {
        settingsRef.current = {
          betting_duration_seconds: data.betting_duration_seconds || 5,
          race_duration_seconds: data.race_duration_seconds || 8,
        };
      }
    };

    const resolveTenantId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isCurrent() || !user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      if (!isCurrent()) return;
      if (profile?.tenant_id) tenantIdRef.current = profile.tenant_id;
    };

    const startNewRace = async () => {
      if (!isCurrent()) return;
      try {
        // TEMPORARY DEBUG INSTRUMENTATION - identifies the exact caller of
        // every create-race invoke.
        console.log('CREATE RACE', Date.now(), new Error().stack);
        const { data: createData, error: createError } = await invokeEngine({
          action: 'create-race',
          tenantId: tenantIdRef.current,
        });
        if (!isCurrent()) return;

        if (createError || !createData?.race) {
          console.error('Create race error:', createError ?? 'No race data returned');
          scheduleRetry();
          return;
        }

        enterPhase('preparing', 3, settingsRef.current.betting_duration_seconds, {
          raceId: createData.race.id,
          winnerCyclist: createData.race.winner_cyclist,
        });
      } catch (error) {
        if (!isCurrent()) return;
        console.error('Race lifecycle error:', error);
        scheduleRetry();
      }
    };

    // The single state-machine step: preparing -> racing -> finished -> (new race).
    // Guarded by transitioningRef so a slow network response can never
    // overlap with another transition triggered by the next tick.
    const advancePhase = async () => {
      if (!isCurrent() || transitioningRef.current) return;
      // TEMPORARY DEBUG INSTRUMENTATION - fires on every attempted lifecycle
      // step, including ones the guards above would otherwise let through.
      console.count('runRaceLifecycle');
      transitioningRef.current = true;
      try {
        const { status, raceId } = stateRef.current;

        if (!raceId) {
          await startNewRace();
          return;
        }

        if (status === 'preparing') {
          enterPhase('racing', 6, settingsRef.current.race_duration_seconds);
          // TEMPORARY DEBUG INSTRUMENTATION
          console.log('UPDATE RACE', Date.now(), 'racing', new Error().stack);
          await invokeEngine({ action: 'update-race', raceId, status: 'racing', tenantId: tenantIdRef.current });
          return;
        }

        if (status === 'racing') {
          enterPhase('finished', 8, FINISHED_DURATION_SECONDS);
          // TEMPORARY DEBUG INSTRUMENTATION
          console.log('UPDATE RACE', Date.now(), 'finished', new Error().stack);
          await invokeEngine({ action: 'update-race', raceId, status: 'finished', tenantId: tenantIdRef.current });
          return;
        }

        // status === 'finished' -> start the next race
        applyState(prev => ({ ...prev, raceId: null }));
        await startNewRace();
      } catch (error) {
        if (!isCurrent()) return;
        console.error('Race lifecycle error:', error);
        scheduleRetry();
      } finally {
        transitioningRef.current = false;
      }
    };

    const tick = () => {
      if (!isCurrent()) return;
      const remaining = Math.max(0, Math.round((phaseDeadlineRef.current - Date.now()) / 1000));
      if (remaining !== stateRef.current.timeLeft) {
        applyState(prev => ({ ...prev, timeLeft: remaining }));
      }
      if (remaining <= 0) {
        void advancePhase();
      }
    };

    const initialize = async () => {
      await Promise.all([loadSettings(), resolveTenantId()]);
      if (!isCurrent()) return;
      // TEMPORARY DEBUG INSTRUMENTATION - the bootstrap lifecycle execution;
      // every subsequent one is counted inside advancePhase().
      console.count('runRaceLifecycle');
      await startNewRace();
      if (!isCurrent()) return;
      // One interval for the lifetime of this hook - it both drives the
      // visible countdown and triggers phase transitions when a deadline
      // passes. No nested setTimeout chains, nothing else can create a
      // second timer.
      intervalRef.current = window.setInterval(tick, TICK_MS);
    };

    void initialize();

    return () => {
      // TEMPORARY DEBUG INSTRUMENTATION
      console.count('useCycleRaceEngine unmounted');
      // Invalidate this run so any already-in-flight await above becomes a
      // no-op the moment it resumes, then tear down the one timer we own.
      runTokenRef.current += 1;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return raceState;
};
