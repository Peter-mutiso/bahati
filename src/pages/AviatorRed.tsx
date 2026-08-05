import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import AviatorCanvas from "@/components/aviator/AviatorCanvas";
import AviatorBetControls from "@/components/aviator/AviatorBetControls";
import AviatorLiveBets from "@/components/aviator/AviatorLiveBets";
import AviatorRecentCrashes from "@/components/aviator/AviatorRecentCrashes";
import AviatorBetHistory from "@/components/aviator/AviatorBetHistory";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { useAviatorEngine } from "@/hooks/useAviatorEngine";
import { Plane, ShieldCheck, ArrowLeft, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AuthDrawer } from "@/components/auth/AuthDrawer";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import RegionBlockedDialog from "@/components/game/RegionBlockedDialog";
import { AviatorProvablyFair } from "@/components/aviator/AviatorProvablyFair";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useJetEngineSound } from "@/hooks/useJetEngineSound";

const AviatorRed = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [balance, setBalance] = useState(0);
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [isRegionBlocked, setIsRegionBlocked] = useState(false);
  const [isCheckingRegion, setIsCheckingRegion] = useState(true);
  const { gameState, placeBet, cashout, isConnected, ping } = useAviatorEngine();
  const { symbol } = useCurrency();
  const { startEngine, stopEngine, updateIntensity, isPlaying, isMuted, toggleMute } = useJetEngineSound();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadBalance(session.user.id);
      else setBalance(0);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) loadBalance(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkRegion = async () => {
      try {
        const { data: settings } = await supabase.from("game_settings").select("country_blocking_enabled, blocked_countries").single();
        if (!settings?.country_blocking_enabled) { setIsRegionBlocked(false); setIsCheckingRegion(false); return; }
        const { data: countryData } = await supabase.functions.invoke("get-user-country");
        const blockedCountries = settings.blocked_countries || [];
        setIsRegionBlocked(blockedCountries.includes(countryData?.country_code));
      } catch (error) { setIsRegionBlocked(false); }
      finally { setIsCheckingRegion(false); }
    };
    checkRegion();
  }, []);

  const loadBalance = async (userId: string) => {
    const { data } = await supabase.from("wallets").select("wallet_cash, wallet_bonus").eq("user_id", userId).single();
    if (data) setBalance(parseFloat(data.wallet_cash.toString()) + parseFloat(data.wallet_bonus.toString()));
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase.channel("wallet_updates_aviator").on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets", filter: `user_id=eq.${user.id}` }, (payload: any) => {
      setBalance(parseFloat(payload.new.wallet_cash) + parseFloat(payload.new.wallet_bonus));
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Jet engine sound control
  useEffect(() => {
    if (gameState.status === 'preparing' || gameState.status === 'flying') {
      if (!isPlaying && !isMuted) {
        startEngine();
      }
    }
    
    if (isPlaying) {
      // Calculate intensity based on multiplier (0-1 scale, capped at 10x)
      const intensity = Math.min((gameState.multiplier - 1) / 9, 1);
      updateIntensity({
        isFlying: gameState.status === 'flying',
        isPreparing: gameState.status === 'preparing',
        crashed: gameState.status === 'crashed',
        intensity,
      });
    }

    // Stop engine when crashed
    if (gameState.status === 'crashed' && isPlaying) {
      setTimeout(() => {
        if (gameState.status === 'crashed') {
          stopEngine();
        }
      }, 1000);
    }
  }, [gameState.status, gameState.multiplier, isPlaying, isMuted, startEngine, stopEngine, updateIntensity]);

  if (isCheckingRegion) {
    return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto mb-4"></div><p className="text-muted-foreground">Loading Red Jet...</p></div></div>);
  }

  return (
    <>
      <AuthDrawer open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} />
      {isRegionBlocked && <RegionBlockedDialog />}
      <DesktopNav isAuthenticated={!!user} onAuthRequired={() => setAuthDrawerOpen(true)} />
      <div className="min-h-screen flex flex-col pb-20 md:pb-0 md:pt-16 bg-gradient-to-b from-slate-950 via-red-950/10 to-slate-950">
        <header className="sticky top-0 z-10 bg-gradient-to-r from-slate-900/95 via-red-950/50 to-slate-900/95 backdrop-blur-xl border-b border-red-900/30 px-2 sm:px-4 py-2 sm:py-3 shadow-xl">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <div className="flex items-center gap-1 sm:gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 text-red-500/80 hover:text-red-400 hover:bg-red-500/10" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 rounded-lg bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-500/20">
                  <Plane className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                </div>
                <h1 className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-red-400 via-red-300 to-red-500 bg-clip-text text-transparent">Red Jet</h1>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30">
                <ShieldCheck className="w-4 h-4 text-red-400" />
                <span className="text-xs text-red-400 font-medium">Provably Fair</span>
              </div>
              {isConnected && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/80 text-xs border border-slate-700/50">
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", ping < 100 ? "bg-green-400" : ping < 200 ? "bg-amber-400" : "bg-red-400")} />
                  <span className="text-slate-400">{ping}ms</span>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className={cn(
                  "h-8 w-8 sm:h-9 sm:w-9 rounded-full transition-all",
                  isMuted 
                    ? "text-slate-500 hover:text-slate-400 hover:bg-slate-700/50" 
                    : "text-red-400 hover:text-red-300 hover:bg-red-500/20"
                )}
              >
                {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
              </Button>
              <div className="flex items-center gap-1 sm:gap-2 bg-gradient-to-r from-red-600/90 to-red-700/90 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl shadow-lg shadow-red-500/20 border border-red-500/30">
                <span className="text-red-100 font-bold text-sm sm:text-base">{symbol}</span>
                <span className="font-bold text-sm sm:text-base text-white">{balance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-7xl mx-auto w-full p-2 md:p-4 space-y-2 md:space-y-4">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-red-900/20">
            <AviatorRecentCrashes />
          </div>
          
          <div className="grid lg:grid-cols-[1fr,400px] gap-4">
            <div className="space-y-4">
              <AviatorCanvas currentMultiplier={gameState.multiplier} isFlying={gameState.status === 'flying'} crashed={gameState.status === 'crashed'} isPreparing={gameState.status === 'preparing'} timeLeft={gameState.timeLeft || 0} />
              <AviatorBetControls userId={user?.id || ""} balance={balance} gameState={gameState} placeBet={placeBet} cashout={cashout} onAuthRequired={() => setAuthDrawerOpen(true)} disabled={isRegionBlocked} />
              <div className="hidden lg:block">
                <Tabs defaultValue="history" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-red-900/30">
                    <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white">Bet History</TabsTrigger>
                    <TabsTrigger value="provably-fair" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white">Provably Fair</TabsTrigger>
                  </TabsList>
                  <TabsContent value="history"><AviatorBetHistory userId={user?.id || ""} /></TabsContent>
                  <TabsContent value="provably-fair"><AviatorProvablyFair serverSeed={gameState.serverSeed} serverSeedHash={gameState.serverSeedHash} clientSeed={gameState.clientSeed} nonce={gameState.nonce} crashPoint={gameState.crashPoint} /></TabsContent>
                </Tabs>
              </div>
            </div>
            <div className="hidden lg:block space-y-4"><AviatorLiveBets /></div>
          </div>

          <div className="lg:hidden space-y-4">
            <AviatorLiveBets />
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-800/50 border border-red-900/30">
                <TabsTrigger value="history" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white">Bet History</TabsTrigger>
                <TabsTrigger value="provably-fair" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-700 data-[state=active]:text-white">Provably Fair</TabsTrigger>
              </TabsList>
              <TabsContent value="history"><AviatorBetHistory userId={user?.id || ""} /></TabsContent>
              <TabsContent value="provably-fair"><AviatorProvablyFair serverSeed={gameState.serverSeed} serverSeedHash={gameState.serverSeedHash} clientSeed={gameState.clientSeed} nonce={gameState.nonce} crashPoint={gameState.crashPoint} /></TabsContent>
            </Tabs>
          </div>
        </div>
        <BottomNav onAuthRequired={() => setAuthDrawerOpen(true)} isAuthenticated={!!user} />
      </div>
    </>
  );
};

export default AviatorRed;