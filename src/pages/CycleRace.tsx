import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import CycleRaceHeader from "@/components/cyclerace/CycleRaceHeader";
import CycleRaceCanvas from "@/components/cyclerace/CycleRaceCanvas";
import CycleRaceBetSection from "@/components/cyclerace/CycleRaceBetSection";
import CycleRaceTimer from "@/components/cyclerace/CycleRaceTimer";
import CycleRaceHistory from "@/components/cyclerace/CycleRaceHistory";
import CycleRaceWinnersBar from "@/components/cyclerace/CycleRaceWinnersBar";
import CycleRaceLiveBets from "@/components/cyclerace/CycleRaceLiveBets";
import ProvablyFairModal from "@/components/cyclerace/ProvablyFairModal";
import CycleRaceCyclistCustomizer from "@/components/cyclerace/CycleRaceCyclistCustomizer";
import BottomNav from "@/components/layout/BottomNav";
import { useCycleRaceEngine } from "@/hooks/useCycleRaceEngine";
import { useCyclistCustomNames } from "@/hooks/useCyclistCustomNames";
import cycleRacePoster from "@/assets/games/cycle-race-poster.jpg";

// Lottie animation URL to preload
const LOTTIE_URL = "https://lottie.host/2469cf0b-96f6-4781-82ea-54935423d864/HLwQXyYKw6.lottie";

// Cache for preloaded assets
const preloadedAssets = new Map<string, any>();

interface RaceState {
  status: "lobby" | "warmup" | "betting" | "locking" | "syncing" | "racing" | "midrace" | "finished";
  raceId: string;
  timeLeft: number;
  phase: number;
  cyclists: CyclistData[];
  winnerNumber?: number;
}

interface CyclistData {
  number: number;
  name: string;
  color: string;
  flag: string;
  recentWins: number;
  winRate: number;
  multiplierRange: string;
  odds?: number;
}

const CycleRace = () => {
  const engineState = useCycleRaceEngine();
  const [cyclists, setCyclists] = useState<CyclistData[]>([]);
  const [selectedCyclist, setSelectedCyclist] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState<number>(0);
  const [myBet, setMyBet] = useState<any>(null);
  const [pendingBet, setPendingBet] = useState<{ cyclist: number; amount: number } | null>(null);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [showCustomizeCyclists, setShowCustomizeCyclists] = useState(false);
  const { customNames, getDisplayName, saveCustomName, clearCustomName } = useCyclistCustomNames();

  // `cyclists` always holds the real, shared default names (used internally
  // and as the "default" label in the customizer dialog). `displayCyclists`
  // is the presentation-only view with the current user's own custom names
  // overlaid - this is the only thing rendered in the race UI, so
  // cyclist_number/winner_cyclist and everything derived from `cyclists`
  // itself is never affected by personalization.
  const displayCyclists = useMemo(
    () => cyclists.map((c) => ({ ...c, name: getDisplayName(c.number, c.name) })),
    [cyclists, getDisplayName]
  );
  
  // Asset preloading state
  const [showSplash, setShowSplash] = useState(true);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Preload all assets on mount
  useEffect(() => {
    let isMounted = true;
    
    const preloadAssets = async () => {
      const assets = [
        { type: 'image', src: cycleRacePoster },
        { type: 'lottie', src: LOTTIE_URL }
      ];
      
      let loadedCount = 0;
      const totalAssets = assets.length;
      
      const updateProgress = () => {
        loadedCount++;
        if (isMounted) {
          setLoadingProgress(Math.round((loadedCount / totalAssets) * 100));
        }
      };
      
      const loadPromises = assets.map(async (asset) => {
        if (preloadedAssets.has(asset.src)) {
          updateProgress();
          return;
        }
        
        try {
          if (asset.type === 'image') {
            await new Promise<void>((resolve) => {
              const img = new Image();
              img.onload = () => {
                preloadedAssets.set(asset.src, img);
                updateProgress();
                resolve();
              };
              img.onerror = () => {
                updateProgress();
                resolve();
              };
              img.src = asset.src;
            });
          } else if (asset.type === 'lottie') {
            // Fetch and cache the lottie JSON
            const response = await fetch(asset.src);
            if (response.ok) {
              const data = await response.arrayBuffer();
              preloadedAssets.set(asset.src, data);
            }
            updateProgress();
          }
        } catch (err) {
          console.warn('Failed to preload asset:', asset.src);
          updateProgress();
        }
      });
      
      await Promise.all(loadPromises);
      
      if (isMounted) {
        setAssetsLoaded(true);
        // Small delay for smooth transition
        setTimeout(() => {
          if (isMounted) {
            setShowSplash(false);
          }
        }, 500);
      }
    };
    
    preloadAssets();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const raceState: RaceState = {
    status: engineState.status === 'preparing' ? 'betting' : 
            engineState.status === 'locking' ? 'locking' :
            engineState.status === 'racing' ? 'racing' : 'finished',
    raceId: engineState.raceId || '',
    timeLeft: engineState.timeLeft,
    phase: engineState.phase,
    cyclists: displayCyclists,
    winnerNumber: engineState.winnerCyclist || undefined
  };

  const { data: user } = useQuery({
    queryKey: ["user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    }
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();
      return data;
    },
    enabled: !!user?.id
  });

  const { data: settings } = useQuery({
    queryKey: ["cycling-race-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cycling_race_settings")
        .select("*")
        .single();
      return data;
    }
  });

  // Generate cyclists data based on settings
  useEffect(() => {
    if (!settings) return;
    
    const defaultNames = ["Lightning", "Thunder", "Storm", "Blaze", "Flash", "Rocket", "Turbo", "Bolt", "Swift", "Arrow"];
    const colors = ["#00d4ff", "#ff006e", "#ffbe0b", "#8338ec", "#3a86ff", "#06ffa5", "#ff4757", "#2ed573", "#ffa502", "#a55eea"];
    const defaultFlags = ["🇰🇪", "🇺🇸", "🇬🇧", "🇯🇵", "🇩🇪", "🇫🇷", "🇧🇷", "🇦🇺", "🇨🇦", "🇰🇷"];
    
    const numCyclists = settings.number_of_cyclists || 6;
    const customOdds = settings.use_custom_odds && Array.isArray(settings.cyclist_odds) 
      ? settings.cyclist_odds as number[] 
      : null;
    
    // Load custom names and flags from settings
    const customization = Array.isArray(settings.cyclist_customization)
      ? (settings.cyclist_customization as { name: string; flag: string }[])
      : null;
    
    const cyclistsData: CyclistData[] = Array.from({ length: numCyclists }, (_, i) => {
      const odds = customOdds ? customOdds[i] || (1.5 + i * 1.5) : (1.5 + i * 1.5);
      const cyclistName = customization?.[i]?.name || defaultNames[i] || `Cyclist ${i + 1}`;
      const cyclistFlag = customization?.[i]?.flag || defaultFlags[i] || "🏁";
      
      return {
        number: i + 1,
        name: cyclistName,
        color: colors[i] || colors[i % colors.length],
        flag: cyclistFlag,
        recentWins: Math.floor(Math.random() * 10),
        winRate: Math.floor(Math.random() * 40) + 30,
        multiplierRange: `${odds.toFixed(1)}x`,
        odds: odds
      };
    });

    setCyclists(cyclistsData);
  }, [settings]);

  // Clear bet when race finishes and auto-place pending bet when betting phase starts
  useEffect(() => {
    if (raceState.status === 'finished') {
      setMyBet(null);
    }
    
    // Auto-place pending bet when betting phase starts
    if (raceState.status === 'betting' && pendingBet && !myBet) {
      setSelectedCyclist(pendingBet.cyclist);
      setBetAmount(pendingBet.amount);
      // Trigger bet placement after state updates
      setTimeout(() => {
        handlePlaceBetInternal(pendingBet.cyclist, pendingBet.amount);
        setPendingBet(null);
      }, 100);
    }
  }, [raceState.status, pendingBet, myBet]);

  // Real-time wallet updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wallet-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          refetchWallet();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, refetchWallet]);

  // Process referral bet commission
  const processReferralCommission = useCallback(async (betUserId: string, betAmount: number, betId: string) => {
    try {
      // Check if user was referred by someone
      const { data: referralData } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_user_id', betUserId)
        .eq('status', 'completed')
        .single();

      if (!referralData) return;

      // Get commission percentage from settings
      const { data: gameSettings } = await supabase
        .from('game_settings')
        .select('referral_bet_commission_percent')
        .single();

      if (!gameSettings || gameSettings.referral_bet_commission_percent <= 0) return;

      const commissionAmount = betAmount * (gameSettings.referral_bet_commission_percent / 100);

      // Get referrer's current wallet
      const { data: referrerWallet } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', referralData.referrer_id)
        .single();

      if (!referrerWallet) return;

      // Credit commission to referrer
      const newReferrerBalance = parseFloat(referrerWallet.wallet_cash.toString()) + commissionAmount;
      await supabase
        .from('wallets')
        .update({ wallet_cash: newReferrerBalance })
        .eq('user_id', referralData.referrer_id);

      // Log the commission transaction
      await supabase
        .from('commission_transactions')
        .insert({
          referrer_id: referralData.referrer_id,
          referred_user_id: betUserId,
          commission_type: 'bet_commission',
          amount: commissionAmount,
          reference_id: betId
        });

      console.log(`Cycle Race bet commission awarded: ${commissionAmount} to ${referralData.referrer_id}`);
    } catch (error) {
      console.error('Error processing referral commission:', error);
    }
  }, []);

  const handlePlaceBetInternal = async (cyclist: number, amount: number) => {
    if (!user || !raceState.raceId) return;
    
    try {
      const customOdds = settings?.use_custom_odds && Array.isArray(settings.cyclist_odds) 
        ? settings.cyclist_odds as number[] 
        : null;
      const multiplier = customOdds 
        ? (customOdds[cyclist - 1] || (1.5 + (cyclist - 1) * 1.5)) 
        : (1.5 + (cyclist - 1) * 1.5);
      const potentialPayout = amount * multiplier;

      // Get current wallet with wager tracking
      const { data: walletData } = await supabase
        .from("wallets")
        .select("wallet_cash, wallet_bonus, wager_completed, wager_required")
        .eq("user_id", user.id)
        .single();

      if (!walletData) throw new Error("Wallet not found");

      let newCash = Number(walletData.wallet_cash);
      let newBonus = Number(walletData.wallet_bonus);
      let wagerCompleted = Number(walletData.wager_completed) || 0;
      const wagerRequired = Number(walletData.wager_required) || 0;

      // Deduct from bonus first, then cash
      if (newBonus >= amount) {
        newBonus -= amount;
      } else {
        const remaining = amount - newBonus;
        newBonus = 0;
        newCash -= remaining;
      }

      // Track wager progress
      if (wagerRequired > 0) {
        wagerCompleted = Math.min(wagerCompleted + amount, wagerRequired);
      }

      const { error: walletError } = await supabase
        .from("wallets")
        .update({
          wallet_cash: newCash,
          wallet_bonus: newBonus,
          wager_completed: wagerCompleted
        })
        .eq("user_id", user.id);

      if (walletError) throw walletError;

      const { data: bet, error } = await supabase
        .from("cycling_race_bets")
        .insert({
          race_id: raceState.raceId,
          user_id: user.id,
          cyclist_number: cyclist,
          amount: amount,
          potential_payout: potentialPayout,
          status: "pending"
        })
        .select()
        .single();

      if (error) throw error;

      setMyBet(bet);
      refetchWallet();
      
      // Process referral commission
      processReferralCommission(user.id, amount, bet.id);
      
      toast.success("Bet placed successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to place bet");
    }
  };

  const handlePlaceBet = async () => {
    if (!user) {
      toast.error("Please sign in to place bets");
      return;
    }

    if (!selectedCyclist) {
      toast.error("Please select a cyclist");
      return;
    }

    if (betAmount < (settings?.min_bet || 10)) {
      toast.error(`Minimum bet is ₹${settings?.min_bet || 10}`);
      return;
    }

    if (betAmount > (settings?.max_bet || 10000)) {
      toast.error(`Maximum bet is ₹${settings?.max_bet || 10000}`);
      return;
    }

    const totalBalance = (wallet?.wallet_cash || 0) + (wallet?.wallet_bonus || 0);
    if (betAmount > totalBalance) {
      toast.error("Insufficient balance");
      return;
    }

    // If race is in progress, queue for next round
    if (raceState.status === 'racing' || raceState.status === 'locking') {
      setPendingBet({ cyclist: selectedCyclist, amount: betAmount });
      toast.success("Bet queued for next round!");
      return;
    }

    if (!raceState.raceId) {
      toast.error("Waiting for next race...");
      return;
    }

    await handlePlaceBetInternal(selectedCyclist, betAmount);
  };

  const handleCancelPendingBet = () => {
    setPendingBet(null);
    toast.info("Pending bet cancelled");
  };

  // Splash screen during asset loading
  if (showSplash) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--primary)/0.1) 50%, hsl(var(--background)) 100%)'
        }}
      >
        {/* Logo/Poster */}
        <div className="w-40 h-40 md:w-56 md:h-56 rounded-3xl overflow-hidden shadow-2xl mb-8 border-2 border-primary/30">
          <img 
            src={cycleRacePoster} 
            alt="Cycle Race" 
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
          Cycle Race
        </h1>
        <p className="text-muted-foreground text-sm mb-8">Premium Racing Experience</p>
        
        {/* Loading Progress Bar */}
        <div 
          className="w-64 md:w-80 h-2 rounded-full overflow-hidden"
          style={{
            background: 'hsl(var(--muted))',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <div 
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${loadingProgress}%`,
              background: 'linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary)/0.7))',
              boxShadow: '0 0 10px hsl(var(--primary)/0.5)'
            }}
          />
        </div>
        
        {/* Loading Text */}
        <p className="text-muted-foreground text-sm mt-4">
          {assetsLoaded ? 'Starting...' : `Loading assets ${loadingProgress}%`}
        </p>
        
        {/* Animated dots */}
        <div className="flex gap-1 mt-4">
          {[0, 1, 2].map((i) => (
            <div 
              key={i}
              className="w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <CycleRaceHeader
        balance={wallet ? (wallet.wallet_cash + wallet.wallet_bonus) : 0}
        onOpenProvablyFair={() => setShowProvablyFair(true)}
      />

      <div className="container mx-auto px-2 sm:px-4 pt-16 pb-20 md:pt-24 md:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 lg:gap-6">
          {/* Left Section - Bet Panel (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
            <CycleRaceBetSection
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              selectedCyclist={selectedCyclist}
              onSelectCyclist={setSelectedCyclist}
              onPlaceBet={handlePlaceBet}
              onCancelPendingBet={handleCancelPendingBet}
              myBet={myBet}
              pendingBet={pendingBet}
              raceState={raceState}
              minBet={settings?.min_bet || 10}
              maxBet={settings?.max_bet || 10000}
              cyclists={raceState.cyclists}
              onOpenCustomizeCyclists={() => setShowCustomizeCyclists(true)}
            />
          </div>

          {/* Center Section - Game Canvas & Timer */}
          <div className="lg:col-span-6 space-y-2 sm:space-y-3">
            <CycleRaceTimer phase={raceState.phase} timeLeft={raceState.timeLeft} />
            
            <CycleRaceWinnersBar />
            
            <CycleRaceCanvas
              cyclists={raceState.cyclists}
              raceState={raceState}
              selectedCyclist={selectedCyclist}
              phase={raceState.phase}
              timeLeft={raceState.timeLeft}
            />
          </div>

          {/* Mobile Bet Section - Scrolls with page */}
          <div className="lg:hidden">
            <CycleRaceBetSection
              betAmount={betAmount}
              setBetAmount={setBetAmount}
              selectedCyclist={selectedCyclist}
              onSelectCyclist={setSelectedCyclist}
              onPlaceBet={handlePlaceBet}
              onCancelPendingBet={handleCancelPendingBet}
              myBet={myBet}
              pendingBet={pendingBet}
              raceState={raceState}
              minBet={settings?.min_bet || 10}
              maxBet={settings?.max_bet || 10000}
              cyclists={raceState.cyclists}
              onOpenCustomizeCyclists={() => setShowCustomizeCyclists(true)}
            />
          </div>

          {/* Right Section - Live Bets (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
            <CycleRaceLiveBets />
          </div>

          {/* Mobile Live Bets Section */}
          <div className="lg:hidden">
            <CycleRaceLiveBets />
          </div>
        </div>
      </div>

      <ProvablyFairModal
        open={showProvablyFair}
        onClose={() => setShowProvablyFair(false)}
      />

      <CycleRaceCyclistCustomizer
        open={showCustomizeCyclists}
        onClose={() => setShowCustomizeCyclists(false)}
        cyclists={cyclists}
        customNames={customNames}
        saveCustomName={saveCustomName}
        clearCustomName={clearCustomName}
      />

      <BottomNav isAuthenticated={!!user} />
    </div>
  );
};

export default CycleRace;
