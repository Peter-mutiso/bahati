import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Minus, Plus, TrendingUp, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";
import { Badge } from "@/components/ui/badge";

interface BetControlsProps {
  userId: string;
  balance: number;
  gameState: {
    status: 'preparing' | 'flying' | 'crashed';
    multiplier: number;
    crashPoint: number;
    roundNumber: number;
    roundId?: string | null;
    timeLeft?: number;
  };
  placeBet: (userId: string, amount: number, autoCashout: number | null, roundId: string, onSuccess?: (betId: string) => void) => void;
  cashout: (betId: string, userId: string, onSuccess?: (profit: number, multiplier: number) => void, onError?: (error: string) => void) => void;
  onAuthRequired?: () => void;
  playBetPlaced?: () => void;
  playCashout?: () => void;
  disabled?: boolean;
}

const CoinTrainBetControls = ({ userId, balance, gameState, placeBet, cashout, onAuthRequired, playBetPlaced, playCashout, disabled = false }: BetControlsProps) => {
  const { symbol } = useCurrency();
  const { toast } = useToast();
  const [bet1Amount, setBet1Amount] = useState(50);
  const [bet2Amount, setBet2Amount] = useState(50);
  const [bet1AutoCashout, setBet1AutoCashout] = useState<number | null>(null);
  const [bet2AutoCashout, setBet2AutoCashout] = useState<number | null>(null);
  const [bet1Active, setBet1Active] = useState(false);
  const [bet2Active, setBet2Active] = useState(false);
  const [bet1Id, setBet1Id] = useState<string | null>(null);
  const [bet2Id, setBet2Id] = useState<string | null>(null);
  const [bet1Profit, setBet1Profit] = useState(0);
  const [bet2Profit, setBet2Profit] = useState(0);
  const [bet1AutoCashedOut, setBet1AutoCashedOut] = useState(false);
  const [bet2AutoCashedOut, setBet2AutoCashedOut] = useState(false);
  const [showBet2, setShowBet2] = useState(true);

  const presetAmounts = [50, 100, 200, 500];

  // Auto-cashout logic
  useEffect(() => {
    if (gameState.status === 'flying' && gameState.multiplier > 1.0) {
      if (bet1Active && bet1AutoCashout && bet1Id && !bet1AutoCashedOut && Number(gameState.multiplier) > Number(bet1AutoCashout)) {
        cashout(
          bet1Id, 
          userId,
          (profit, multiplier) => {
            setBet1Profit(profit);
            setBet1Active(false);
            setBet1Id(null);
            setBet1AutoCashedOut(true);
            sonnerToast.success("🚂 Auto Cashout!", {
              description: `Bet 1 cashed out at ${multiplier.toFixed(2)}x for ${symbol}${profit.toFixed(2)}`,
            });
          },
          (error) => {
            setBet1AutoCashedOut(true);
            toast({
              title: "Auto Cashout Failed",
              description: error || "Failed to auto cashout Bet 1",
              variant: "destructive",
            });
          }
        );
      }
      
      if (bet2Active && bet2AutoCashout && bet2Id && !bet2AutoCashedOut && Number(gameState.multiplier) > Number(bet2AutoCashout)) {
        cashout(
          bet2Id, 
          userId,
          (profit, multiplier) => {
            setBet2Profit(profit);
            setBet2Active(false);
            setBet2Id(null);
            setBet2AutoCashedOut(true);
            sonnerToast.success("🚂 Auto Cashout!", {
              description: `Bet 2 cashed out at ${multiplier.toFixed(2)}x for ${symbol}${profit.toFixed(2)}`,
            });
          },
          (error) => {
            setBet2AutoCashedOut(true);
            toast({
              title: "Auto Cashout Failed",
              description: error || "Failed to auto cashout Bet 2",
              variant: "destructive",
            });
          }
        );
      }

      if (bet1Active && bet1Id) {
        setBet1Profit(bet1Amount * (gameState.multiplier - 1));
      }
      if (bet2Active && bet2Id) {
        setBet2Profit(bet2Amount * (gameState.multiplier - 1));
      }
    }

    if (gameState.status === 'crashed') {
      if (bet1Active && bet1Id) {
        setBet1Active(false);
        setBet1Id(null);
        setBet1Profit(0);
      }
      if (bet2Active && bet2Id) {
        setBet2Active(false);
        setBet2Id(null);
        setBet2Profit(0);
      }
    }
    
    if (gameState.status === 'preparing') {
      setBet1AutoCashedOut(false);
      setBet2AutoCashedOut(false);
    }
  }, [gameState.status, gameState.multiplier, bet1Active, bet2Active, bet1AutoCashout, bet2AutoCashout, bet1Id, bet2Id, userId, cashout, bet1Amount, bet2Amount, toast, bet1AutoCashedOut, bet2AutoCashedOut]);

  const adjustAmount = (current: number, delta: number, setter: (value: number) => void) => {
    const newAmount = Math.max(10, Math.min(balance, current + delta));
    setter(newAmount);
  };

  const handleBet1 = () => {
    if (disabled) {
      toast({ title: "Betting Disabled", description: "Betting is not available in your region", variant: "destructive" });
      return;
    }

    if (!userId) {
      onAuthRequired?.();
      return;
    }

    if (bet1Active && gameState.status === 'flying' && bet1Id) {
      cashout(
        bet1Id, 
        userId,
        (profit, multiplier) => {
          playCashout?.();
          setBet1Profit(profit);
          setBet1Active(false);
          setBet1Id(null);
          setBet1AutoCashedOut(true);
          sonnerToast.success("🚂 Cashed Out!", {
            description: `Bet 1 cashed out at ${multiplier.toFixed(2)}x for ${symbol}${profit.toFixed(2)}`,
          });
        },
        (error) => {
          toast({ title: "Cashout Failed", description: error || "Failed to process cashout.", variant: "destructive" });
        }
      );
    } else if (!bet1Active && gameState.status === 'preparing') {
      if (bet1Amount > balance) {
        toast({ title: "Insufficient Balance", description: "You don't have enough balance for this bet.", variant: "destructive" });
        return;
      }
      
      if (!gameState.roundId) {
        toast({ title: "Please Wait", description: `Next train departing in ${gameState.timeLeft || 0}s...`, variant: "destructive" });
        return;
      }
      
      placeBet(userId, bet1Amount, bet1AutoCashout, gameState.roundId, (betId) => {
        playBetPlaced?.();
        setBet1Id(betId);
        setBet1AutoCashedOut(false);
      });
      setBet1Active(true);
      sonnerToast.success("🎫 Ticket Purchased!", {
        description: `Bet 1: ${symbol}${bet1Amount.toFixed(2)}`,
      });
    }
  };

  const handleBet2 = () => {
    if (disabled) {
      toast({ title: "Betting Disabled", description: "Betting is not available in your region", variant: "destructive" });
      return;
    }

    if (!userId) {
      onAuthRequired?.();
      return;
    }

    if (bet2Active && gameState.status === 'flying' && bet2Id) {
      cashout(
        bet2Id, 
        userId,
        (profit, multiplier) => {
          playCashout?.();
          setBet2Profit(profit);
          setBet2Active(false);
          setBet2Id(null);
          setBet2AutoCashedOut(true);
          sonnerToast.success("🚂 Cashed Out!", {
            description: `Bet 2 cashed out at ${multiplier.toFixed(2)}x for ${symbol}${profit.toFixed(2)}`,
          });
        },
        (error) => {
          toast({ title: "Cashout Failed", description: error || "Failed to process cashout.", variant: "destructive" });
        }
      );
    } else if (!bet2Active && gameState.status === 'preparing') {
      if (bet2Amount > balance) {
        toast({ title: "Insufficient Balance", description: "You don't have enough balance for this bet.", variant: "destructive" });
        return;
      }
      
      if (!gameState.roundId) {
        toast({ title: "Please Wait", description: `Next train departing in ${gameState.timeLeft || 0}s...`, variant: "destructive" });
        return;
      }
      
      placeBet(userId, bet2Amount, bet2AutoCashout, gameState.roundId, (betId) => {
        playBetPlaced?.();
        setBet2Id(betId);
        setBet2AutoCashedOut(false);
      });
      setBet2Active(true);
      sonnerToast.success("🎫 Ticket Purchased!", {
        description: `Bet 2: ${symbol}${bet2Amount.toFixed(2)}`,
      });
    }
  };

  const getBetButtonText = (isActive: boolean, profit: number, betAmount: number) => {
    if (isActive && gameState.status === 'flying') {
      const totalWin = betAmount + profit;
      return (
        <div className="flex flex-row items-center justify-center gap-1.5 sm:gap-2 md:gap-3 w-full px-1 sm:px-2">
          <span className="text-xs sm:text-sm opacity-90 font-medium whitespace-nowrap">Jump Off</span>
          <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold whitespace-nowrap">{symbol}{totalWin.toFixed(2)}</span>
          <span className="text-xs sm:text-sm opacity-90 font-medium whitespace-nowrap">+{symbol}{profit.toFixed(2)}</span>
        </div>
      );
    }
    if (isActive && gameState.status === 'preparing') return 'Boarding...';
    if (!isActive && gameState.status === 'preparing') return 'Buy Ticket';
    return 'Wait...';
  };

  const calculatePotentialWin = (betAmount: number, targetMultiplier: number) => betAmount * targetMultiplier - betAmount;

  return (
    <div className={cn("grid gap-2 sm:gap-3", showBet2 ? "md:grid-cols-2" : "md:grid-cols-1")}>
      {/* Bet Panel 1 */}
      <Card className="p-2 sm:p-3 space-y-2 relative border-emerald-600/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl">
        <div className="flex items-center justify-between">
          <Label className="text-xs sm:text-sm text-slate-300">Bet Amount</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-emerald-500/80 font-medium">{symbol}{balance.toFixed(2)}</span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowBet2(!showBet2)}
              className="h-6 w-6 text-slate-400 hover:text-emerald-500 hover:bg-slate-700/50"
            >
              {showBet2 ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button size="icon" variant="outline" onClick={() => adjustAmount(bet1Amount, -10, setBet1Amount)} className="h-8 w-8 sm:h-9 sm:w-9 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-emerald-500 hover:border-emerald-600/50">
            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <Input
            type="number"
            value={bet1Amount}
            onChange={(e) => setBet1Amount(parseFloat(e.target.value) || 0)}
            className="text-center font-bold text-base sm:text-lg h-8 sm:h-10 bg-slate-800/80 border-slate-600 text-slate-100 focus:border-emerald-600/50"
          />
          <Button size="icon" variant="outline" onClick={() => adjustAmount(bet1Amount, 10, setBet1Amount)} className="h-8 w-8 sm:h-9 sm:w-9 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-emerald-500 hover:border-emerald-600/50">
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {presetAmounts.map((amount) => (
            <Button
              key={amount}
              variant="outline"
              size="sm"
              onClick={() => setBet1Amount(amount)}
              disabled={amount > balance}
              className="h-7 text-xs sm:h-8 sm:text-sm px-1 border-slate-600 text-slate-300 hover:bg-emerald-600/20 hover:text-emerald-500 hover:border-emerald-600/50"
            >
              {symbol}{amount}
            </Button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="auto-cashout-1" className="text-xs sm:text-sm text-slate-300">Auto Jump</Label>
          <Switch
            id="auto-cashout-1"
            checked={bet1AutoCashout !== null}
            onCheckedChange={(checked) => setBet1AutoCashout(checked ? 2.0 : null)}
            className="data-[state=checked]:bg-emerald-600"
          />
        </div>

        {bet1AutoCashout !== null && (
          <Input
            type="number"
            step="0.1"
            value={bet1AutoCashout}
            onChange={(e) => setBet1AutoCashout(parseFloat(e.target.value) || 2.0)}
            placeholder="2.00x"
            className="text-center h-8 sm:h-10 bg-slate-800/80 border-slate-600 text-slate-100 focus:border-emerald-600/50"
          />
        )}

        <Button
          className={cn(
            "w-full font-bold text-sm sm:text-base py-3 sm:py-4 min-h-[48px] sm:min-h-[52px] transition-all",
            bet1Active && gameState.status === 'flying'
              ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
              : bet1Active
              ? "bg-slate-700 hover:bg-slate-600 cursor-not-allowed text-slate-300"
              : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/30"
          )}
          onClick={handleBet1}
          disabled={(bet1Active && gameState.status === 'preparing') || gameState.status === 'crashed'}
        >
          {getBetButtonText(bet1Active, bet1Profit, bet1Amount)}
        </Button>
      </Card>

      {/* Bet Panel 2 */}
      {showBet2 && (
        <Card className="p-2 sm:p-3 space-y-2 border-emerald-600/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl">
          <div className="flex items-center justify-between">
            <Label className="text-xs sm:text-sm text-slate-300">Bet Amount</Label>
            <span className="text-xs text-emerald-500/80 font-medium">{symbol}{balance.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button size="icon" variant="outline" onClick={() => adjustAmount(bet2Amount, -10, setBet2Amount)} className="h-8 w-8 sm:h-9 sm:w-9 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-emerald-500 hover:border-emerald-600/50">
              <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
            <Input
              type="number"
              value={bet2Amount}
              onChange={(e) => setBet2Amount(parseFloat(e.target.value) || 0)}
              className="text-center font-bold text-base sm:text-lg h-8 sm:h-10 bg-slate-800/80 border-slate-600 text-slate-100 focus:border-emerald-600/50"
            />
            <Button size="icon" variant="outline" onClick={() => adjustAmount(bet2Amount, 10, setBet2Amount)} className="h-8 w-8 sm:h-9 sm:w-9 border-slate-600 text-slate-300 hover:bg-slate-700/50 hover:text-emerald-500 hover:border-emerald-600/50">
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {presetAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                size="sm"
                onClick={() => setBet2Amount(amount)}
                disabled={amount > balance}
                className="h-7 text-xs sm:h-8 sm:text-sm px-1 border-slate-600 text-slate-300 hover:bg-emerald-600/20 hover:text-emerald-500 hover:border-emerald-600/50"
              >
                {symbol}{amount}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-cashout-2" className="text-xs sm:text-sm text-slate-300">Auto Jump</Label>
            <Switch
              id="auto-cashout-2"
              checked={bet2AutoCashout !== null}
              onCheckedChange={(checked) => setBet2AutoCashout(checked ? 2.0 : null)}
              className="data-[state=checked]:bg-emerald-600"
            />
          </div>

          {bet2AutoCashout !== null && (
            <Input
              type="number"
              step="0.1"
              value={bet2AutoCashout}
              onChange={(e) => setBet2AutoCashout(parseFloat(e.target.value) || 2.0)}
              placeholder="2.00x"
              className="text-center h-8 sm:h-10 bg-slate-800/80 border-slate-600 text-slate-100 focus:border-emerald-600/50"
            />
          )}

          <Button
            className={cn(
              "w-full font-bold text-sm sm:text-base py-3 sm:py-4 min-h-[48px] sm:min-h-[52px] transition-all",
              bet2Active && gameState.status === 'flying'
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg shadow-amber-500/30"
                : bet2Active
                ? "bg-slate-700 hover:bg-slate-600 cursor-not-allowed text-slate-300"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/30"
            )}
            onClick={handleBet2}
            disabled={(bet2Active && gameState.status === 'preparing') || gameState.status === 'crashed'}
          >
            {getBetButtonText(bet2Active, bet2Profit, bet2Amount)}
          </Button>
        </Card>
      )}
    </div>
  );
};

export default CoinTrainBetControls;