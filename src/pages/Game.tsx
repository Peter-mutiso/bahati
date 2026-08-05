import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import GameCanvas from "@/components/game/GameCanvas";
import BetControls from "@/components/game/BetControls";
import LiveBets from "@/components/game/LiveBets";
import RecentCrashes from "@/components/game/RecentCrashes";
import GameStats from "@/components/game/GameStats";
import BetHistory from "@/components/game/BetHistory";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { useGameEngineContext } from "@/contexts/GameEngineContext";
import { Menu, Trophy, ShieldCheck, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { useCurrency } from "@/hooks/useCurrency";
import { useGameSounds } from "@/hooks/useGameSounds";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import RegionBlockedDialog from "@/components/game/RegionBlockedDialog";
import { ProvablyFairVerification } from "@/components/game/ProvablyFairVerification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Game = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [isRegionBlocked, setIsRegionBlocked] = useState(false);
  const [isCheckingRegion, setIsCheckingRegion] = useState(true);
  const { gameState, placeBet, cashout, isConnected, ping } = useGameEngineContext();
  const { symbol } = useCurrency();
  const { volume, setVolume, playCrash, playBetPlaced, playCashout } = useGameSounds();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadBalance(session.user.id);
      } else {
        setBalance(0);
      }
    });

    // THEN check for existing session
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
        // Fetch game settings to check if country blocking is enabled
        const { data: settings } = await supabase
          .from("game_settings")
          .select("country_blocking_enabled, blocked_countries")
          .single();

        if (!settings?.country_blocking_enabled) {
          setIsRegionBlocked(false);
          setIsCheckingRegion(false);
          return;
        }

        // Fetch user's country by IP
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

  useEffect(() => {
    if (gameState.status === 'crashed') {
      playCrash();
    }
  }, [gameState.status, playCrash]);

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
      .channel("wallet_updates")
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking access...</p>
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
      <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 sm:h-9 sm:w-9"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              <h1 className="text-[10px] sm:text-lg md:text-xl font-bold text-foreground">Provably Fair</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
            </div>
            {isConnected && (
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-muted text-xs">
                <div className={cn("w-2 h-2 rounded-full", ping < 100 ? "bg-success" : ping < 200 ? "bg-warning" : "bg-destructive")} />
                <span className="text-muted-foreground">{ping}ms</span>
              </div>
            )}
            <div className="flex items-center gap-1 sm:gap-2 bg-muted px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg">
              <span className="text-success font-bold text-sm sm:text-base">{symbol}</span>
              <span className="font-bold text-sm sm:text-base">{balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full p-2 md:p-4 space-y-2 md:space-y-4">
        <GameStats isAuthenticated={!!user} />
        <div className="bg-card/50 backdrop-blur-sm rounded-lg p-2 md:p-3 border border-border/50">
          <RecentCrashes />
        </div>
        
        <div className="grid lg:grid-cols-[1fr,400px] gap-4">
          {/* Game Area */}
          <div className="space-y-4">
            <GameCanvas 
              currentMultiplier={gameState.multiplier}
              isFlying={gameState.status === 'flying'}
              crashed={gameState.status === 'crashed'}
              isPreparing={gameState.status === 'preparing'}
              timeLeft={gameState.timeLeft || 0}
            />
          <BetControls 
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="history">Bet History</TabsTrigger>
                  <TabsTrigger value="provably-fair">Provably Fair</TabsTrigger>
                </TabsList>
                <TabsContent value="history">
                  <BetHistory userId={user?.id || ""} />
                </TabsContent>
                <TabsContent value="provably-fair">
                  <ProvablyFairVerification
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
            <LiveBets />
          </div>
        </div>

        {/* Mobile Views */}
        <div className="lg:hidden space-y-4">
          <LiveBets />
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="history">Bet History</TabsTrigger>
              <TabsTrigger value="provably-fair">Provably Fair</TabsTrigger>
            </TabsList>
            <TabsContent value="history">
              <BetHistory userId={user?.id || ""} />
            </TabsContent>
            <TabsContent value="provably-fair">
              <ProvablyFairVerification
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

export default Game;