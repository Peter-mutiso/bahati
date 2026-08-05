import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import CoinFlipHeader from "@/components/coinflip/CoinFlipHeader";
import CoinFlipCanvas from "@/components/coinflip/CoinFlipCanvas";
import CoinFlipBetSection from "@/components/coinflip/CoinFlipBetSection";
import CoinFlipTimer from "@/components/coinflip/CoinFlipTimer";
import CoinFlipHistory from "@/components/coinflip/CoinFlipHistory";
import CoinFlipLiveBets from "@/components/coinflip/CoinFlipLiveBets";
import CoinFlipProvablyFairModal from "@/components/coinflip/CoinFlipProvablyFairModal";
import BottomNav from "@/components/layout/BottomNav";
import { useCoinFlipEngine } from "@/hooks/useCoinFlipEngine";
import { Loader2 } from "lucide-react";

const CoinFlip = () => {
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState(0);
  const [showProvablyFair, setShowProvablyFair] = useState(false);
  const [selectedSide, setSelectedSide] = useState<"heads" | "tails" | null>(null);

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Use the coin flip engine hook
  const {
    gameState,
    liveBets,
    history,
    currentBet,
    isLoading,
    placeBet,
  } = useCoinFlipEngine(user?.id ?? null);

  // Load balance
  useEffect(() => {
    if (user) {
      loadBalance();
      
      // Subscribe to wallet changes
      const channel = supabase
        .channel('wallet_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'wallets',
            filter: `user_id=eq.${user.id}`
          },
          () => loadBalance()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadBalance = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("wallets")
      .select("wallet_cash, wallet_bonus")
      .eq("user_id", user.id)
      .single();
    
    if (data) {
      setBalance(data.wallet_cash + data.wallet_bonus);
    }
  };

  const handlePlaceBet = async (amount: number) => {
    if (!selectedSide) return;
    
    const success = await placeBet(selectedSide, amount);
    if (success) {
      loadBalance();
    }
  };

  const totalHeads = liveBets.filter(b => b.side === "heads").reduce((sum, b) => sum + b.amount, 0);
  const totalTails = liveBets.filter(b => b.side === "tails").reduce((sum, b) => sum + b.amount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <CoinFlipHeader
        balance={balance}
        onOpenProvablyFair={() => setShowProvablyFair(true)}
      />

      <div className="container mx-auto px-2 sm:px-4 pt-16 pb-20 md:pt-20 md:pb-4 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4">
          {/* Left Panel - Bet Section (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <CoinFlipBetSection
                balance={balance}
                selectedSide={selectedSide}
                onSelectSide={setSelectedSide}
                onPlaceBet={handlePlaceBet}
                gameStatus={gameState.status}
                currentBet={currentBet}
              />
            </div>
          </div>

          {/* Center - Game Canvas */}
          <div className="lg:col-span-6 space-y-3">
            {/* Coin Canvas with Timer Overlay */}
            <div className="relative bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl p-3 sm:p-4">
              {/* Timer Overlay - Left Side */}
              <div className="absolute left-2 top-2 z-10">
                <CoinFlipTimer
                  phase={gameState.status}
                  timeLeft={gameState.timeLeft}
                />
              </div>
              
              <CoinFlipCanvas
                gameState={gameState}
                selectedSide={selectedSide}
              />
            </div>

            {/* History */}
            <div className="bg-card/30 backdrop-blur-xl border border-border/50 rounded-xl p-3">
              <CoinFlipHistory history={history} />
            </div>
          </div>

          {/* Right Panel - Live Bets (Desktop) */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-20">
              <CoinFlipLiveBets
                bets={liveBets}
                totalHeads={totalHeads}
                totalTails={totalTails}
              />
            </div>
          </div>

          {/* Mobile Bet Section */}
          <div className="lg:hidden">
            <CoinFlipBetSection
              balance={balance}
              selectedSide={selectedSide}
              onSelectSide={setSelectedSide}
              onPlaceBet={handlePlaceBet}
              gameStatus={gameState.status}
              currentBet={currentBet}
            />
          </div>

          {/* Mobile Live Bets */}
          <div className="lg:hidden">
            <CoinFlipLiveBets
              bets={liveBets}
              totalHeads={totalHeads}
              totalTails={totalTails}
            />
          </div>
        </div>
      </div>

      <CoinFlipProvablyFairModal
        open={showProvablyFair}
        onClose={() => setShowProvablyFair(false)}
        serverSeedHash={gameState.serverSeedHash}
        revealedServerSeed={gameState.revealedServerSeed}
        clientSeed={gameState.clientSeed}
        nonce={gameState.nonce}
        result={gameState.result}
      />

      <BottomNav isAuthenticated={!!user} />
    </div>
  );
};

export default CoinFlip;
