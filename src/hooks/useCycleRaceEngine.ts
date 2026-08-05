import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RaceState {
  raceId: string | null;
  status: 'preparing' | 'locking' | 'racing' | 'finished';
  phase: number;
  timeLeft: number;
  winnerCyclist: number | null;
}

interface RaceSettings {
  betting_duration_seconds: number;
  race_duration_seconds: number;
}

export const useCycleRaceEngine = () => {
  const [raceState, setRaceState] = useState<RaceState>({
    raceId: null,
    status: 'preparing',
    phase: 3,
    timeLeft: 5,
    winnerCyclist: null
  });

  const [settings, setSettings] = useState<RaceSettings>({
    betting_duration_seconds: 5,
    race_duration_seconds: 8
  });

  const timerRef = useRef<number | null>(null);
  const currentRaceIdRef = useRef<string | null>(null);
  const lifecycleTimeoutRef = useRef<number | null>(null);
  const settingsLoadedRef = useRef(false);

  // Fetch admin settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('cycling_race_settings')
        .select('betting_duration_seconds, race_duration_seconds')
        .single();
      
      if (!error && data) {
        setSettings({
          betting_duration_seconds: data.betting_duration_seconds || 5,
          race_duration_seconds: data.race_duration_seconds || 8
        });
      }
      settingsLoadedRef.current = true;
    };

    fetchSettings();
  }, []);

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = window.setInterval(() => {
      setRaceState(prev => ({
        ...prev,
        timeLeft: Math.max(0, prev.timeLeft - 1)
      }));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [raceState.phase]);

  // Race lifecycle management
  useEffect(() => {
    if (!settingsLoadedRef.current) return;

    const bettingDuration = settings.betting_duration_seconds;
    const raceDuration = settings.race_duration_seconds;
    const lockingDuration = 3; // Fixed 3s locking
    const finishedDuration = 3; // Fixed 3s finished

    const runRaceLifecycle = async () => {
      try {
        // Fetch user's tenant_id
        const { data: { user } } = await supabase.auth.getUser();
        let tenantId = 'aaaaaaaa-0000-0000-0000-000000000001'; // Default
        
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('tenant_id')
            .eq('id', user.id)
            .single();
          if (profile?.tenant_id) tenantId = profile.tenant_id;
        }

        // Create race with tenantId
        const { data: createData, error: createError } = await supabase.functions.invoke('cycling-race-engine', {
          body: { action: 'create-race', tenantId }
        });

        if (createError) {
          console.error('Create race error:', createError);
          lifecycleTimeoutRef.current = window.setTimeout(() => runRaceLifecycle(), 5000);
          return;
        }

        if (!createData?.race) {
          console.error('No race data returned');
          lifecycleTimeoutRef.current = window.setTimeout(() => runRaceLifecycle(), 5000);
          return;
        }

        const raceId = createData.race.id;
        const winnerCyclist = createData.race.winner_cyclist;
        currentRaceIdRef.current = raceId;

        // Phase 1: Starting/Betting
        setRaceState({
          raceId,
          status: 'preparing',
          phase: 3,
          timeLeft: bettingDuration,
          winnerCyclist
        });

        lifecycleTimeoutRef.current = window.setTimeout(async () => {
          // Phase 2: Racing (skip locking phase)
          setRaceState(prev => ({ ...prev, status: 'racing', phase: 6, timeLeft: raceDuration }));
          
          await supabase.functions.invoke('cycling-race-engine', {
            body: { action: 'update-race', raceId, status: 'racing', tenantId }
          });

          lifecycleTimeoutRef.current = window.setTimeout(async () => {
            // Phase 3: Finished
            setRaceState(prev => ({ ...prev, status: 'finished', phase: 8, timeLeft: finishedDuration }));
            
            await supabase.functions.invoke('cycling-race-engine', {
              body: { action: 'update-race', raceId, status: 'finished', tenantId }
            });

            // Start new race
            lifecycleTimeoutRef.current = window.setTimeout(() => {
              runRaceLifecycle();
            }, finishedDuration * 1000);
          }, raceDuration * 1000);
        }, bettingDuration * 1000);

      } catch (error) {
        console.error('Race lifecycle error:', error);
        lifecycleTimeoutRef.current = window.setTimeout(() => runRaceLifecycle(), 5000);
      }
    };

    runRaceLifecycle();

    return () => {
      if (lifecycleTimeoutRef.current) {
        clearTimeout(lifecycleTimeoutRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [settings]);

  return raceState;
};
