import { useState, useEffect } from "react";
import { ArrowLeft, Bomb, Wallet, Shield, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MinesCanvas } from "@/components/mines/MinesCanvas";
import { MinesBetControls } from "@/components/mines/MinesBetControls";
import { MinesHistory } from "@/components/mines/MinesHistory";
import { MinesProvablyFair } from "@/components/mines/MinesProvablyFair";
import { MinesStats } from "@/components/mines/MinesStats";
import { MinesLiveBets } from "@/components/mines/MinesLiveBets";
import { GuestBanner } from "@/components/game/GuestBanner";
import DesktopNav from "@/components/layout/DesktopNav";
import BottomNav from "@/components/layout/BottomNav";
import { useGameSounds } from "@/hooks/useGameSounds";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Mines = () => {
  const navigate = useNavigate();
  const { playGemReveal, playMineExplosion, playMinesCashout, playTileHover } = useGameSounds();
  const { formatCurrency } = useCurrency();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [currentBet, setCurrentBet] = useState<any>(null);
  const [revealedTiles, setRevealedTiles] = useState<number[]>([]);
  const [gameStatus, setGameStatus] = useState<'idle' | 'active' | 'busted' | 'cashed_out'>('idle');
  const [currentMultiplier, setCurrentMultiplier] = useState(1);
  const [provablyFairOpen, setProvablyFairOpen] = useState(false);

  // Reset game after bust
  useEffect(() => {
    if (gameStatus === 'busted') {
      setTimeout(() => {
        setCurrentBet(null);
        setRevealedTiles([]);
        setGameStatus('idle');
        setCurrentMultiplier(1);
      }, 2000);
    }
  }, [gameStatus]);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
      
      if (session?.user) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("wallet_cash, wallet_bonus")
          .eq("user_id", session.user.id)
          .single();
        
        if (wallet) {
          setBalance(wallet.wallet_cash + wallet.wallet_bonus);
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real-time wallet balance updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('wallet-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wallets',
          filter: `user_id=eq.${user.id}`
        },
        (payload: any) => {
          if (payload.new) {
            setBalance(Number(payload.new.wallet_cash) + Number(payload.new.wallet_bonus));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleTileClick = async (tileIndex: number) => {
    if (!currentBet || gameStatus !== 'active' || revealedTiles.includes(tileIndex)) return;

    // Check if tile is a mine
    const isMine = currentBet.mine_positions?.includes(tileIndex);
    
    if (isMine) {
      // Busted!
      playMineExplosion();
      setGameStatus('busted');
      toast.error("Mine hit! Better luck next time");
      
      await supabase
        .from('mines_bets')
        .update({ 
          status: 'busted',
          final_multiplier: 0,
          profit: -currentBet.amount
        })
        .eq('id', currentBet.id);
    } else {
      // Safe tile - play gem reveal sound
      playGemReveal();
      
      const newRevealed = [...revealedTiles, tileIndex];
      setRevealedTiles(newRevealed);
      
      // Calculate new multiplier
      const totalTiles = 25;
      const minesCount = currentBet.mines_count;
      const safeTiles = totalTiles - minesCount;
      const tilesRevealed = newRevealed.length;
      
      // Calculate multiplier using house edge
      const newMultiplier = calculateMultiplier(tilesRevealed, minesCount, safeTiles);
      setCurrentMultiplier(newMultiplier);
      
      toast.success(`Gem found! ${newMultiplier.toFixed(2)}x`, {
        duration: 1500
      });
      
      await supabase
        .from('mines_bets')
        .update({ 
          tiles_revealed: newRevealed,
          current_multiplier: newMultiplier
        })
        .eq('id', currentBet.id);
    }
  };

  const calculateMultiplier = (revealed: number, mines: number, safeTiles: number) => {
    let mult = 1;
    for (let i = 0; i < revealed; i++) {
      const remaining = safeTiles - i;
      const totalRemaining = 25 - i;
      mult *= totalRemaining / remaining;
    }
    // Apply house edge (97% RTP)
    return mult * 0.97;
  };

  const handleCashOut = async () => {
    if (!currentBet || gameStatus !== 'active') return;

    const profit = currentBet.amount * (currentMultiplier - 1);
    
    playMinesCashout();
    
    toast.success(`Successfully cashed out ${(currentBet.amount + profit).toFixed(2)}!`, {
      duration: 3000
    });
    
    await supabase
      .from('mines_bets')
      .update({ 
        status: 'cashed_out',
        final_multiplier: currentMultiplier,
        profit: profit
      })
      .eq('id', currentBet.id);

    // Update wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('wallet_cash')
      .eq('user_id', user.id)
      .single();

    if (wallet) {
      await supabase
        .from('wallets')
        .update({ wallet_cash: wallet.wallet_cash + profit })
        .eq('user_id', user.id);
      
      setBalance(wallet.wallet_cash + profit);
    }

    // Reset game state for new round
    setTimeout(() => {
      setCurrentBet(null);
      setRevealedTiles([]);
      setGameStatus('idle');
      setCurrentMultiplier(1);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DesktopNav isAuthenticated={!!user} isAdmin={false} />
      
      {/* Sticky Header with Wallet and Back Button */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/")}
                className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl md:text-3xl font-bold">Mines</h1>
            </div>
            
            <div className="flex items-center gap-3">
              {currentBet && (
                <Dialog open={provablyFairOpen} onOpenChange={setProvablyFairOpen}>
                  <DialogTrigger asChild>
                    <button className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 transition-all duration-200 flex items-center gap-2 group">
                      <Shield className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-medium text-emerald-400">Provably Fair</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-emerald-400" />
                        Provably Fair Verification
                      </DialogTitle>
                    </DialogHeader>
                    <MinesProvablyFair
                      serverSeed={currentBet.server_seed}
                      clientSeed={currentBet.client_seed}
                      nonce={currentBet.nonce}
                    />
                  </DialogContent>
                </Dialog>
              )}
              
              {user && (
                <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-accent/50 to-accent/30 border border-accent">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    <span className="text-sm text-muted-foreground">Balance</span>
                    <span className="font-bold">{formatCurrency(balance)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {!user && <GuestBanner onSignUp={() => window.location.href = '/auth'} />}

      <div className="flex-1 container mx-auto px-4 py-4 md:py-6 pb-24 md:pb-6">
        {/* Desktop: 3-Column Layout | Mobile: Stacked */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            
            {/* Left Column: Bet Controls (Desktop) */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              <MinesBetControls
                balance={balance}
                currentBet={currentBet}
                onBetStart={(bet) => {
                  setCurrentBet(bet);
                  setRevealedTiles([]);
                  setGameStatus('active');
                  setCurrentMultiplier(1);
                }}
                onCashOut={handleCashOut}
                gameStatus={gameStatus}
                currentMultiplier={currentMultiplier}
                userId={user?.id}
              />
            </div>

            {/* Center Column: Mines Board */}
            <div className="lg:col-span-6 order-1 lg:order-2">
              <MinesCanvas
                revealedTiles={revealedTiles}
                minePositions={currentBet?.mine_positions || []}
                gameStatus={gameStatus}
                onTileClick={handleTileClick}
                onTileHover={playTileHover}
              />
            </div>

            {/* Right Column: Stats, History, Live Bets */}
            <div className="lg:col-span-3 order-3 space-y-4">
              {gameStatus === 'active' && currentBet && (
                <MinesStats
                  tilesRevealed={revealedTiles.length}
                  currentMultiplier={currentMultiplier}
                  potentialWin={currentBet.amount * currentMultiplier}
                  minesCount={currentBet.mines_count}
                  gameStatus={gameStatus}
                />
              )}
              <MinesHistory userId={user?.id} />
              <MinesLiveBets />
            </div>

          </div>
        </div>
      </div>

      <BottomNav isAuthenticated={!!user} />
    </div>
  );
};

export default Mines;
