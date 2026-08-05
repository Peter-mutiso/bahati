import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { Wallet, Play, TrendingUp, Bomb } from "lucide-react";
import { motion } from "framer-motion";

interface MinesBetControlsProps {
  balance: number;
  currentBet: any;
  onBetStart: (bet: any) => void;
  onCashOut: () => void;
  gameStatus: 'idle' | 'active' | 'busted' | 'cashed_out';
  currentMultiplier: number;
  userId?: string;
}

export const MinesBetControls = ({
  balance,
  currentBet,
  onBetStart,
  onCashOut,
  gameStatus,
  currentMultiplier,
  userId
}: MinesBetControlsProps) => {
  const [betAmount, setBetAmount] = useState("10");
  const [minesCount, setMinesCount] = useState(3);
  const { formatCurrency } = useCurrency();

  const quickBetAmounts = [10, 50, 100, 500];

  const generateMinePositions = (count: number): number[] => {
    const positions: number[] = [];
    while (positions.length < count) {
      const pos = Math.floor(Math.random() * 25);
      if (!positions.includes(pos)) {
        positions.push(pos);
      }
    }
    return positions;
  };

  const handleStartBet = async () => {
    if (!userId) {
      toast.error("Please sign in to play");
      return;
    }

    const amount = parseFloat(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }

    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    // Generate mine positions
    const minePositions = generateMinePositions(minesCount);
    
    // Generate seeds for provably fair
    const serverSeed = Math.random().toString(36).substring(2);
    const clientSeed = Math.random().toString(36).substring(2);
    const nonce = Date.now();

    try {
      // Create bet in database
      const { data: bet, error } = await supabase
        .from('mines_bets')
        .insert({
          user_id: userId,
          amount,
          mines_count: minesCount,
          mine_positions: minePositions,
          server_seed: serverSeed,
          client_seed: clientSeed,
          nonce: nonce
        })
        .select()
        .single();

      if (error) throw error;

      // Deduct bet from wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({ wallet_cash: wallet.wallet_cash - amount })
          .eq('user_id', userId);
      }

      onBetStart(bet);
      toast.success("Game started! Click tiles to reveal gems");
    } catch (error: any) {
      toast.error(error.message || "Failed to start game");
    }
  };

  const potentialWin = currentBet ? parseFloat(betAmount) * currentMultiplier : 0;
  const riskLevel = minesCount <= 5 ? 'Low' : minesCount <= 10 ? 'Medium' : minesCount <= 15 ? 'High' : 'Extreme';
  const riskColor = minesCount <= 5 ? 'text-emerald-400' : minesCount <= 10 ? 'text-yellow-400' : minesCount <= 15 ? 'text-orange-400' : 'text-destructive';

  return (
    <Card className="relative overflow-hidden border-2 border-border/50 shadow-lg">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent backdrop-blur-[2px]" />
      
      <CardContent className="space-y-4 p-4 relative z-10">
        {/* Action Buttons at Top */}
        {gameStatus === 'idle' || gameStatus === 'busted' || gameStatus === 'cashed_out' ? (
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={handleStartBet}
              className="w-full h-12 font-bold text-base shadow-[0_0_20px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] transition-all duration-300 bg-gradient-to-r from-primary to-primary/80"
              disabled={!userId}
            >
              <Play className="w-5 h-5 mr-2" />
              Start Game
            </Button>
          </motion.div>
        ) : (
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            animate={{ boxShadow: ['0 0 20px rgba(52,211,153,0.4)', '0 0 30px rgba(52,211,153,0.6)', '0 0 20px rgba(52,211,153,0.4)'] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Button
              onClick={onCashOut}
              className="w-full h-12 font-bold text-base bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all duration-300"
            >
              💎 Cash Out {formatCurrency(potentialWin)}
            </Button>
          </motion.div>
        )}

        {/* Bet Amount Section */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Bet Amount</Label>
          
          {/* Quick Bet Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {quickBetAmounts.map((amount) => (
              <motion.div key={amount} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setBetAmount(amount.toString())}
                  disabled={gameStatus === 'active'}
                  className={`w-full h-9 transition-all duration-300 ${
                    parseFloat(betAmount) === amount 
                      ? 'border-primary bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]' 
                      : 'hover:border-primary/50'
                  }`}
                >
                  {formatCurrency(amount)}
                </Button>
              </motion.div>
            ))}
          </div>
          
          {/* Bet Input with Multiplier Buttons */}
          <div className="relative">
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              disabled={gameStatus === 'active'}
              placeholder="Enter amount"
              className="pr-24 h-11 font-semibold text-base border-2 focus:shadow-[0_0_15px_hsl(var(--primary)/0.2)] transition-all"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBetAmount((parseFloat(betAmount) / 2).toString())}
                disabled={gameStatus === 'active'}
                className="h-8 px-3 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
              >
                ½
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setBetAmount((parseFloat(betAmount) * 2).toString())}
                disabled={gameStatus === 'active'}
                className="h-8 px-3 text-xs font-semibold hover:bg-primary/10 hover:text-primary transition-colors"
              >
                2×
              </Button>
            </div>
          </div>
        </div>

        {/* Mines Count Section */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Bomb className="w-5 h-5 text-destructive" />
              Mines Count
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-primary">{minesCount}</span>
              <span className={`text-xs px-2.5 py-1 rounded-full bg-muted ${riskColor} font-semibold ring-2 ring-current/20`}>
                {riskLevel}
              </span>
            </div>
          </div>
          
          <Slider
            value={[minesCount]}
            onValueChange={([value]) => setMinesCount(value)}
            min={1}
            max={24}
            step={1}
            disabled={gameStatus === 'active'}
            className="py-4"
          />
          
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>1 Mine (Easy)</span>
            <span>24 Mines (Extreme)</span>
          </div>
        </div>

        {/* Active Game Stats */}
        {gameStatus === 'active' && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 p-4 bg-gradient-to-br from-primary/10 to-emerald-500/10 rounded-xl border-2 border-primary/30 shadow-[0_0_20px_hsl(var(--primary)/0.2)] relative overflow-hidden"
          >
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground font-medium">Multiplier</span>
              </div>
              <motion.span 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="text-3xl font-bold text-primary drop-shadow-[0_0_10px_hsl(var(--primary)/0.5)]"
              >
                {currentMultiplier.toFixed(2)}x
              </motion.span>
            </div>
            
            <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            
            <div className="relative flex items-center justify-between">
              <span className="text-sm text-muted-foreground font-medium">Potential Win</span>
              <span className="text-2xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                {formatCurrency(potentialWin)}
              </span>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
