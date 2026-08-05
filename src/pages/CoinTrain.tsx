import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import CoinTrainCanvas from "@/components/cointrain/CoinTrainCanvas";
import CoinTrainBetControls from "@/components/cointrain/CoinTrainBetControls";
import CoinTrainLiveBets from "@/components/cointrain/CoinTrainLiveBets";
import CoinTrainRecentCrashes from "@/components/cointrain/CoinTrainRecentCrashes";
import CoinTrainStats from "@/components/cointrain/CoinTrainStats";
import CoinTrainBetHistory from "@/components/cointrain/CoinTrainBetHistory";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { useCoinTrainEngine } from "@/hooks/useCoinTrainEngine";
import { Train, ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { useCurrency } from "@/hooks/useCurrency";
import { useGameSounds } from "@/hooks/useGameSounds";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import RegionBlockedDialog from "@/components/game/RegionBlockedDialog";
import { CoinTrainProvablyFair } from "@/components/cointrain/CoinTrainProvablyFair";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CoinTrain = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [isRegionBlocked, setIsRegionBlocked] = useState(false);
  const [isCheckingRegion, setIsCheckingRegion] = useState(true);
  const { gameState, placeBet, cashout, isConnected, ping } = useCoinTrainEngine();
  const { symbol } = useCurrency();
  const { playCrash, playBetPlaced, playCashout, playTrainBell, playTrainWhistle, playTrainSteam, playTrainHighSpeed } = useGameSounds();
  const [lastStatus, setLastStatus] = useState<string>('');
  const [lastTimeLeft, setLastTimeLeft] = useState<number>(0);
  const steamIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      } else {
        setBalance(0);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkRegion = async () => {
      try {
        const { data: settings } = await supabase
          .from("game_settings")
          .select("country_blocking_enabled, blocked_countries")
          .single();

        if (!settings?.country_blocking_enabled) {
          setIsRegionBlocked(false);
          setIsCheckingRegion(false);
          return;
        }

        const { data: countryData } = await supabase.functions.invoke("get-user-country");
        
        const userCountry = countryData?.country_code;
        const blockedCountries = settings.blocked_countries || [];

        if (blockedCountries.includes(userCountry)) {
          setIsRegionBlocked(true);
        } else {
          setIsRegionBlocked(false);
        }
      } catch (error) {
        console.error("Error checking region:", error);
        setIsRegionBlocked(false);
      } finally {
        setIsCheckingRegion(false);
      }
    };

    checkRegion();
  }, []);

  // Bell sound during countdown
  useEffect(() => {
    if (gameState.status === 'preparing' && gameState.timeLeft !== undefined) {
      const timeLeft = gameState.timeLeft;
      // Play bell on each second during countdown (when timeLeft decreases)
      if (timeLeft > 0 && timeLeft <= 5 && timeLeft !== lastTimeLeft) {
        playTrainBell();
      }
      setLastTimeLeft(timeLeft);
    }
  }, [gameState.status, gameState.timeLeft, lastTimeLeft, playTrainBell]);

  // Sound effects for train
  useEffect(() => {
    // Play whistle when train starts flying
    if (gameState.status === 'flying' && lastStatus !== 'flying') {
      playTrainWhistle();
      
      // Start steam chug sounds
      steamIntervalRef.current = setInterval(() => {
        if (gameState.multiplier >= 5) {
          playTrainHighSpeed();
        } else {
          playTrainSteam();
        }
      }, 300);
    }
    
    // Play crash sound and stop steam when crashed
    if (gameState.status === 'crashed') {
      playCrash();
      if (steamIntervalRef.current) {
        clearInterval(steamIntervalRef.current);
        steamIntervalRef.current = null;
      }
    }
    
    // Stop steam sounds when preparing
    if (gameState.status === 'preparing' && steamIntervalRef.current) {
      clearInterval(steamIntervalRef.current);
      steamIntervalRef.current = null;
    }
    
    setLastStatus(gameState.status);
    
    return () => {
      if (steamIntervalRef.current) {
        clearInterval(steamIntervalRef.current);
      }
    };
  }, [gameState.status, gameState.multiplier, lastStatus, playCrash, playTrainWhistle, playTrainSteam, playTrainHighSpeed]);

  const loadBalance = async (userId: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("wallet_cash, wallet_bonus")
      .eq("user_id", userId)
      .single();
    
    if (data) {
      setBalance(parseFloat(data.wallet_cash.toString()) + parseFloat(data.wallet_bonus.toString()));
    }
  };

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("wallet_updates_cointrain")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallets",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          setBalance(parseFloat(payload.new.wallet_cash) + parseFloat(payload.new.wallet_bonus));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (isCheckingRegion) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Coin Train...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AuthDrawer open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} />
      {isRegionBlocked && <RegionBlockedDialog />}
      <DesktopNav 
        isAuthenticated={!!user}
        onAuthRequired={() => setAuthDrawerOpen(true)}
      />
      <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl border-b border-emerald-600/20 px-2 sm:px-4 py-2 sm:py-3 shadow-xl">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9 text-emerald-500/80 hover:text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-500/20">
                  <Train className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-slate-900" />
                </div>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-500 bg-clip-text text-transparent">Coin Train</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-medium">Provably Fair</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 text-xs border border-slate-700/50">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", ping < 100 ? "bg-emerald-400" : ping < 200 ? "bg-amber-400" : "bg-red-400")} />
                  <span className="text-slate-400">{ping}ms</span>
                </div>
              )}
              <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-emerald-600/90 to-emerald-700/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-lg shadow-emerald-500/20 border border-emerald-500/30">
                <span className="text-emerald-100 font-bold text-sm sm:text-base">{symbol}</span>
                <span className="font-bold text-sm sm:text-base text-white">{balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 max-w-7xl mx-auto w-full p-2 md:p-4 space-y-2 md:space-y-4">
          <CoinTrainStats isAuthenticated={!!user} />
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-emerald-600/10">
            <CoinTrainRecentCrashes />
          </div>
          
          <div className="grid lg:grid-cols-[1fr,400px] gap-4">
            {/* Game Area */}
            <div className="space-y-4">
              <CoinTrainCanvas 
                currentMultiplier={gameState.multiplier}
                isFlying={gameState.status === 'flying'}
                crashed={gameState.status === 'crashed'}
                isPreparing={gameState.status === 'preparing'}
                timeLeft={gameState.timeLeft || 0}
              />
              <CoinTrainBetControls 
                userId={user?.id || ""}
                balance={balance}
                gameState={gameState}
                placeBet={placeBet}
                cashout={cashout}
                onAuthRequired={() => setAuthDrawerOpen(true)}
                playBetPlaced={playBetPlaced}
                playCashout={playCashout}
                disabled={isRegionBlocked}
              />
                
              {/* Bet History - Desktop below game */}
              <div className="hidden lg:block">
                <Tabs defaultValue="history" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50">
                    <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white">Bet History</TabsTrigger>
                    <TabsTrigger value="provably-fair" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white">Provably Fair</TabsTrigger>
                  </TabsList>
                  <TabsContent value="history">
                    <CoinTrainBetHistory userId={user?.id || ""} />
                  </TabsContent>
                  <TabsContent value="provably-fair">
                    <CoinTrainProvablyFair
                      serverSeed={gameState.serverSeed}
                      serverSeedHash={gameState.serverSeedHash}
                      clientSeed={gameState.clientSeed}
                      nonce={gameState.nonce}
                      crashPoint={gameState.crashPoint}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </div>

            {/* Side Panel */}
            <div className="hidden lg:block space-y-4">
              <CoinTrainLiveBets />
            </div>
          </div>

          {/* Mobile Views */}
          <div className="lg:hidden space-y-4">
            <CoinTrainLiveBets />
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-slate-700/50">
                <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white">Bet History</TabsTrigger>
                <TabsTrigger value="provably-fair" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-emerald-700 data-[state=active]:text-white">Provably Fair</TabsTrigger>
              </TabsList>
              <TabsContent value="history">
                <CoinTrainBetHistory userId={user?.id || ""} />
              </TabsContent>
              <TabsContent value="provably-fair">
                <CoinTrainProvablyFair
                  serverSeed={gameState.serverSeed}
                  serverSeedHash={gameState.serverSeedHash}
                  clientSeed={gameState.clientSeed}
                  nonce={gameState.nonce}
                  crashPoint={gameState.crashPoint}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <BottomNav onAuthRequired={() => setAuthDrawerOpen(true)} isAuthenticated={!!user} />
      </div>
    </>
  );
};

export default CoinTrain;