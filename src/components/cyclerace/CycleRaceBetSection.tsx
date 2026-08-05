import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrency } from "@/hooks/useCurrency";
import { useIsMobile } from "@/hooks/use-mobile";
import { Minus, Plus, TrendingUp } from "lucide-react";

interface Cyclist {
  number: number;
  name: string;
  color: string;
  flag: string;
  recentWins: number;
  winRate: number;
  multiplierRange: string;
  odds?: number;
}

interface CycleRaceBetSectionProps {
  betAmount: number;
  setBetAmount: (amount: number) => void;
  selectedCyclist: number | null;
  onSelectCyclist: (number: number) => void;
  onPlaceBet: () => void;
  onCancelPendingBet: () => void;
  myBet: any;
  pendingBet: { cyclist: number; amount: number } | null;
  raceState: {
    status: string;
  };
  minBet: number;
  maxBet: number;
  cyclists: Cyclist[];
}

const CycleRaceBetSection = ({
  betAmount,
  setBetAmount,
  selectedCyclist,
  onSelectCyclist,
  onPlaceBet,
  onCancelPendingBet,
  myBet,
  pendingBet,
  raceState,
  minBet,
  maxBet,
  cyclists
}: CycleRaceBetSectionProps) => {
  const { symbol } = useCurrency();
  const isMobile = useIsMobile();

  const quickPresets = [
    { label: "x1", multiplier: 1 },
    { label: "x5", multiplier: 5 },
    { label: "x10", multiplier: 10 }
  ];

  const selectedCyclistData = cyclists.find(c => c.number === selectedCyclist);
  const estimatedPayout = selectedCyclist && selectedCyclistData?.odds ? betAmount * selectedCyclistData.odds : 0;
  const canBet = selectedCyclist && betAmount >= minBet;

  return (
    <Card className="p-2 sm:p-4 space-y-2 sm:space-y-4 bg-card/50 backdrop-blur-lg border-border/50 lg:bg-card/50">
      <div>
        <h3 className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-muted-foreground">Select Cyclist</h3>
        <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-2 sm:mb-4">
          {cyclists.map((cyclist) => {
            const button = (
              <Button
                variant={selectedCyclist === cyclist.number ? "default" : "outline"}
                size="sm"
                onClick={() => onSelectCyclist(cyclist.number)}
                className={`rounded-lg h-9 sm:h-12 font-bold text-xs sm:text-base ${
                  selectedCyclist === cyclist.number 
                    ? "ring-2 ring-primary shadow-lg" 
                    : ""
                }`}
                style={
                  selectedCyclist === cyclist.number 
                    ? { backgroundColor: cyclist.color, color: 'white' }
                    : {}
                }
              >
                {cyclist.number}
              </Button>
            );

            // Hide tooltips on mobile
            if (isMobile) {
              return <div key={cyclist.number}>{button}</div>;
            }

            return (
              <TooltipProvider key={cyclist.number} delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    {button}
                  </TooltipTrigger>
                  <TooltipContent 
                    side="top" 
                    className="p-3 max-w-[200px] bg-popover/95 backdrop-blur-lg border-border"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ backgroundColor: cyclist.color, color: 'white' }}
                        >
                          {cyclist.number}
                        </div>
                        <div>
                          <p className="font-semibold text-xs">{cyclist.name}</p>
                          <p className="text-[10px] text-muted-foreground">{cyclist.flag}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Win Rate:</span>
                          <span className="font-semibold text-primary">{cyclist.winRate}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Recent Wins:</span>
                          <span className="font-semibold">{cyclist.recentWins}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Multiplier:</span>
                          <span className="font-semibold text-green-500">{cyclist.multiplierRange}</span>
                        </div>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2 text-muted-foreground">Bet Amount</h3>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setBetAmount(Math.max(minBet, betAmount - 10))}
            className="rounded-lg h-8 w-8 sm:h-10 sm:w-10"
          >
            <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
          <div className="flex-1 relative">
            <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-xs sm:text-sm text-muted-foreground">
              {symbol}
            </span>
            <Input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="pl-6 sm:pl-8 rounded-lg text-center font-semibold h-8 text-xs sm:h-10 sm:text-base"
              min={minBet}
              max={maxBet}
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setBetAmount(Math.min(maxBet, betAmount + 10))}
            className="rounded-lg h-8 w-8 sm:h-10 sm:w-10"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </div>
      </div>

      {myBet ? (
        <div className="p-2 sm:p-4 rounded-lg bg-green-500/10 border border-green-500/20">
          <p className="text-xs sm:text-sm font-semibold text-green-500 mb-1 sm:mb-2">✓ Bet Placed</p>
          <div className="space-y-0.5 text-[10px] sm:text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount:</span>
              <span className="font-semibold">{symbol}{myBet.amount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cyclist:</span>
              <span className="font-semibold">#{myBet.cyclist_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Potential:</span>
              <span className="font-semibold text-green-500">
                {symbol}{myBet.potential_payout.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      ) : pendingBet ? (
        <div className="space-y-2">
          <div className="p-2 sm:p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-xs sm:text-sm font-semibold text-yellow-500 mb-1 sm:mb-2">⏳ Queued for Next Round</p>
            <div className="space-y-0.5 text-[10px] sm:text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-semibold">{symbol}{pendingBet.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cyclist:</span>
                <span className="font-semibold">#{pendingBet.cyclist}</span>
              </div>
            </div>
          </div>
          <Button
            onClick={onCancelPendingBet}
            variant="destructive"
            className="w-full rounded-lg h-9 sm:h-12 text-xs sm:text-base font-semibold"
          >
            Cancel Bet
          </Button>
        </div>
      ) : (
        <Button
          onClick={onPlaceBet}
          disabled={!canBet}
          className="w-full rounded-lg h-9 sm:h-12 text-xs sm:text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
        >
          {!selectedCyclist ? "Select Cyclist" : "Place Bet"}
        </Button>
      )}
    </Card>
  );
};

export default CycleRaceBetSection;
