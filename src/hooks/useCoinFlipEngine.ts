import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameState {
  status: "waiting" | "betting" | "flipping" | "result";
  result: "heads" | "tails" | null;
  timeLeft: number;
  roundNumber: number;
  roundId: string | null;
  serverSeedHash: string | null;
  revealedServerSeed: string | null;
  clientSeed: string | null;
  nonce: number | null;
}

interface LiveBet {
  id: string;
  username: string;
  avatarUrl?: string;
  side: "heads" | "tails";
  amount: number;
  timestamp: string;
  userId: string;
}

interface HistoryItem {
  roundNumber: number;
  result: "heads" | "tails";
  timestamp: string;
  serverSeedHash?: string;
}

interface Settings {
  betting_duration_seconds: number;
  flip_duration_seconds: number;
  min_bet: number;
  max_bet: number;
  house_edge: number;
  rtp_percentage: number;
}

export const useCoinFlipEngine = (userId: string | null) => {
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    result: null,
    timeLeft: 3,
    roundNumber: 0,
    roundId: null,
    serverSeedHash: null,
    revealedServerSeed: null,
    clientSeed: null,
    nonce: null,
  });
  
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [currentBet, setCurrentBet] = useState<{ side: "heads" | "tails"; amount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const nextRoundTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializedRef = useRef(false);
  const isStartingRoundRef = useRef(false);
  const isCompletingRoundRef = useRef(false);
  const currentRoundIdRef = useRef<string | null>(null);

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase
        .from('coin_flip_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setSettings(data as Settings);
      }
    };
    loadSettings();
  }, []);

  // Load history
  const loadHistory = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('coin-flip-engine', {
      body: { action: 'get_history' }
    });

    if (data?.success && data.history) {
      setHistory(data.history.map((h: any) => ({
        roundNumber: h.round_number,
        result: h.result,
        timestamp: h.created_at,
        serverSeedHash: h.server_seed_hash,
      })));
    }
  }, []);

  // Start a new round
  const startRound = useCallback(async () => {
    // Prevent multiple concurrent round starts
    if (isStartingRoundRef.current) {
      return;
    }
    isStartingRoundRef.current = true;
    
    // Clear any existing timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setGameState(prev => ({ ...prev, status: 'waiting', timeLeft: 3, result: null, revealedServerSeed: null }));
    setCurrentBet(null);
    setLiveBets([]);

    // Wait phase
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      const { data, error } = await supabase.functions.invoke('coin-flip-engine', {
        body: { action: 'start_round' }
      });

      if (error || !data?.success) {
        console.error('Failed to start round:', error || data?.error);
        isStartingRoundRef.current = false;
        // Retry after a delay
        setTimeout(startRound, 5000);
        return;
      }

      const round = data.round;
      const bettingDuration = data.settings?.betting_duration_seconds || 15;

      // Track current round ID for completion validation
      currentRoundIdRef.current = round.id;

      setGameState(prev => ({
        ...prev,
        status: 'betting',
        timeLeft: bettingDuration,
        roundNumber: round.round_number,
        roundId: round.id,
        serverSeedHash: round.server_seed_hash,
        clientSeed: round.client_seed,
        nonce: round.nonce,
      }));

      // Betting countdown
      let timeLeft = bettingDuration;
      
      timerRef.current = setInterval(() => {
        timeLeft--;
        setGameState(prev => ({ ...prev, timeLeft }));

        if (timeLeft <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          // Trigger flip
          startFlipPhase(round.id);
        }
      }, 1000);
      
      isStartingRoundRef.current = false;
    } catch (err) {
      console.error('Error starting round:', err);
      isStartingRoundRef.current = false;
      setTimeout(startRound, 5000);
    }
  }, []);

  // Start flip animation
  const startFlipPhase = useCallback(async (roundId: string) => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    await supabase.functions.invoke('coin-flip-engine', {
      body: { action: 'start_flip', roundId }
    });

    const flipDuration = settings?.flip_duration_seconds || 3;
    setGameState(prev => ({ ...prev, status: 'flipping', timeLeft: flipDuration }));

    // Flip animation countdown
    let timeLeft = flipDuration;
    
    timerRef.current = setInterval(() => {
      timeLeft--;
      setGameState(prev => ({ ...prev, timeLeft }));

      if (timeLeft <= 0) {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        completeRoundPhase(roundId);
      }
    }, 1000);
  }, [settings]);

  // Complete round and get result
  const completeRoundPhase = useCallback(async (roundId: string) => {
    // Prevent multiple completions for the same round
    if (isCompletingRoundRef.current || currentRoundIdRef.current !== roundId) {
      return;
    }
    isCompletingRoundRef.current = true;

    const { data, error } = await supabase.functions.invoke('coin-flip-engine', {
      body: { action: 'complete_round', roundId }
    });

    if (error || !data?.success) {
      console.error('Failed to complete round:', error || data?.error);
      isCompletingRoundRef.current = false;
      return;
    }

    const result = data.result as "heads" | "tails";
    
    setGameState(prev => ({
      ...prev,
      status: 'result',
      result,
      timeLeft: 5,
      revealedServerSeed: data.serverSeed,
    }));

    // Check if user won
    setCurrentBet(prevBet => {
      if (prevBet) {
        if (prevBet.side === result) {
          const winAmount = prevBet.amount * 1.95;
          toast.success(`🎉 You won ${winAmount.toFixed(2)}!`);
        } else {
          toast.error("Better luck next time!");
        }
      }
      return null;
    });

    // Load updated history
    loadHistory();

    // Clear any existing next round timeout
    if (nextRoundTimeoutRef.current) {
      clearTimeout(nextRoundTimeoutRef.current);
    }

    // Wait for result display, then start next round
    nextRoundTimeoutRef.current = setTimeout(() => {
      isCompletingRoundRef.current = false;
      currentRoundIdRef.current = null;
      startRound();
    }, 5000);
  }, [loadHistory]);

  // Place bet
  const placeBet = useCallback(async (side: "heads" | "tails", amount: number) => {
    if (!userId || !gameState.roundId) {
      toast.error("Please sign in to place bets");
      return false;
    }

    if (gameState.status !== 'betting' || gameState.timeLeft <= 2) {
      toast.error("Betting is closed");
      return false;
    }

    if (currentBet) {
      toast.error("You already placed a bet this round");
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('coin-flip-engine', {
        body: {
          action: 'place_bet',
          userId,
          roundId: gameState.roundId,
          side,
          amount
        }
      });

      if (error || !data?.success) {
        toast.error(data?.error || "Failed to place bet");
        return false;
      }

      setCurrentBet({ side, amount });

      // Add to live bets
      const bet = data.bet;
      const newBet: LiveBet = {
        id: bet.id,
        username: bet.profiles?.username || "Player",
        avatarUrl: bet.profiles?.avatar_url,
        side: bet.side,
        amount: bet.amount,
        timestamp: bet.created_at,
        userId: bet.user_id,
      };
      setLiveBets(prev => [newBet, ...prev]);

      toast.success(`Bet placed: ${amount} on ${side}`);
      return true;
    } catch (err) {
      console.error('Error placing bet:', err);
      toast.error("Failed to place bet");
      return false;
    }
  }, [userId, gameState.roundId, gameState.status, currentBet]);

  // Initialize game
  useEffect(() => {
    // Prevent multiple initializations
    if (isInitializedRef.current) {
      return;
    }
    
    const init = async () => {
      if (!settings) return;
      
      isInitializedRef.current = true;
      setIsLoading(true);
      await loadHistory();
      
      // Always start a fresh round - trying to resume mid-round causes sync issues
      startRound();
      
      setIsLoading(false);
    };

    if (settings) {
      init();
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (nextRoundTimeoutRef.current) {
        clearTimeout(nextRoundTimeoutRef.current);
        nextRoundTimeoutRef.current = null;
      }
    };
  }, [settings]);

  // Subscribe to real-time updates for bets
  useEffect(() => {
    if (!gameState.roundId) return;

    const channel = supabase
      .channel(`coin_flip_bets_${gameState.roundId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'coin_flip_bets',
          filter: `round_id=eq.${gameState.roundId}`
        },
        async (payload) => {
          const bet = payload.new as any;
          
          // Don't add if it's our own bet (already added locally)
          if (bet.user_id === userId) return;

          // Fetch profile info
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', bet.user_id)
            .single();

          const newBet: LiveBet = {
            id: bet.id,
            username: profile?.username || "Player",
            avatarUrl: profile?.avatar_url,
            side: bet.side,
            amount: bet.amount,
            timestamp: bet.created_at,
            userId: bet.user_id,
          };

          setLiveBets(prev => [newBet, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameState.roundId, userId]);

  return {
    gameState,
    liveBets,
    history,
    settings,
    currentBet,
    isLoading,
    placeBet,
    setCurrentBet,
  };
};
