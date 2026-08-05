import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { useGameSounds } from "@/hooks/useGameSounds";
import { toast } from "sonner";

interface CoinFlipBetSectionProps {
  balance: number;
  selectedSide: "heads" | "tails" | null;
  onSelectSide: (side: "heads" | "tails") => void;
  onPlaceBet: (amount: number) => void;
  gameStatus: "waiting" | "betting" | "flipping" | "result";
  currentBet: { side: "heads" | "tails"; amount: number } | null;
}

const CoinFlipBetSection = ({
  balance,
  selectedSide,
  onSelectSide,
  onPlaceBet,
  gameStatus,
  currentBet,
}: CoinFlipBetSectionProps) => {
  const { symbol } = useCurrency();
  const { playCoinFlipBet } = useGameSounds();
  const [betAmount, setBetAmount] = useState<string>("100");
  const quickBets = [50, 100, 500, 1000];
  const multipliers = [2, 5, 10];

  const canBet = gameStatus === "betting" && !currentBet;
  const estimatedPayout = parseFloat(betAmount) * 1.95 || 0;

  const handleQuickBet = (amount: number) => {
    setBetAmount(amount.toString());
  };

  const handleMultiplier = (mult: number) => {
    const current = parseFloat(betAmount) || 0;
    setBetAmount((current * mult).toString());
  };

  const handlePlaceBet = () => {
    const amount = parseFloat(betAmount);
    if (!selectedSide) {
      toast.error("Please select Heads or Tails");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid bet amount");
      return;
    }
    if (amount > balance) {
      toast.error("Insufficient balance");
      return;
    }
    playCoinFlipBet();
    onPlaceBet(amount);
  };

  return (
    <Card className="p-3 lg:p-5 bg-card/50 backdrop-blur-xl border-border/50 rounded-xl">
      <div className="space-y-2.5 lg:space-y-4">
        {/* Side Selection */}
        <div className="space-y-1.5 lg:space-y-2">
          <label className="text-xs lg:text-sm font-medium text-muted-foreground">Choose Side</label>
          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSide("heads")}
              disabled={!canBet && !currentBet}
              className={`relative p-2.5 lg:p-4 rounded-lg border-2 transition-all ${
                selectedSide === "heads"
                  ? "border-yellow-500 bg-yellow-500/10"
                  : "border-border/50 bg-card/50 hover:border-yellow-500/50"
              } ${(!canBet && !currentBet) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                  <span className="text-base lg:text-xl font-bold text-yellow-900">H</span>
                </div>
                <div className="text-left">
                  <span className="font-semibold text-foreground text-sm lg:text-base block">Heads</span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">1.95x</span>
                </div>
              </div>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectSide("tails")}
              disabled={!canBet && !currentBet}
              className={`relative p-2.5 lg:p-4 rounded-lg border-2 transition-all ${
                selectedSide === "tails"
                  ? "border-gray-400 bg-gray-400/10"
                  : "border-border/50 bg-card/50 hover:border-gray-400/50"
              } ${(!canBet && !currentBet) ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-center gap-2 lg:gap-3">
                <div className="w-8 h-8 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                  <span className="text-base lg:text-xl font-bold text-gray-800">T</span>
                </div>
                <div className="text-left">
                  <span className="font-semibold text-foreground text-sm lg:text-base block">Tails</span>
                  <span className="text-[10px] lg:text-xs text-muted-foreground">1.95x</span>
                </div>
              </div>
            </motion.button>
          </div>
        </div>

        {/* Quick Bet + Amount in row */}
        <div className="space-y-1.5 lg:space-y-2">
          <label className="text-xs lg:text-sm font-medium text-muted-foreground">Bet Amount</label>
          <div className="flex gap-1.5 lg:gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 lg:left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs lg:text-sm">
                {symbol}
              </span>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                disabled={!canBet}
                className="pl-5 lg:pl-7 h-8 lg:h-11 text-sm lg:text-base bg-background/50"
                placeholder="Amount"
              />
            </div>
            {multipliers.map((mult) => (
              <Button
                key={mult}
                variant="outline"
                size="sm"
                onClick={() => handleMultiplier(mult)}
                disabled={!canBet}
                className="h-8 lg:h-11 px-2 lg:px-3 text-xs lg:text-sm"
              >
                x{mult}
              </Button>
            ))}
          </div>
          <div className="flex gap-1 lg:gap-2">
            {quickBets.map((amount) => (
              <Button
                key={amount}
                variant="ghost"
                size="sm"
                onClick={() => handleQuickBet(amount)}
                disabled={!canBet}
                className="flex-1 text-[10px] lg:text-xs px-1 h-6 lg:h-8"
              >
                {symbol}{amount}
              </Button>
            ))}
          </div>
        </div>

        {/* Estimated Payout */}
        <div className="p-2 lg:p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between items-center">
            <span className="text-xs lg:text-sm text-muted-foreground">Payout</span>
            <span className="font-bold text-sm lg:text-lg text-primary">
              {symbol}{estimatedPayout.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Current Bet Display */}
        {currentBet && (
          <div className="p-2 lg:p-3 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5 lg:gap-2">
                <div className={`w-5 h-5 lg:w-7 lg:h-7 rounded-full ${
                  currentBet.side === "heads" 
                    ? "bg-gradient-to-br from-yellow-500 to-orange-500" 
                    : "bg-gradient-to-br from-gray-400 to-gray-600"
                } flex items-center justify-center`}>
                  <span className="text-[10px] lg:text-xs font-bold">
                    {currentBet.side === "heads" ? "H" : "T"}
                  </span>
                </div>
                <span className="text-xs lg:text-sm font-medium">Your Bet</span>
              </div>
              <span className="font-bold text-sm lg:text-base text-green-500">
                {symbol}{currentBet.amount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        )}

        {/* Place Bet Button */}
        <Button
          onClick={handlePlaceBet}
          disabled={!canBet || !selectedSide}
          className="w-full h-9 lg:h-12 text-sm lg:text-base font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          {currentBet 
            ? "Bet Placed" 
            : gameStatus === "flipping" 
              ? "Flipping..." 
              : gameStatus === "result"
                ? "Next Round..."
                : "Place Bet"
          }
        </Button>
      </div>
    </Card>
  );
};

export default CoinFlipBetSection;
