import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LiveBet {
  id: string;
  username: string;
  avatarUrl?: string;
  side: "heads" | "tails";
  amount: number;
  timestamp: string;
  isSimulated?: boolean;
}

interface CoinFlipLiveBetsProps {
  bets: LiveBet[];
  totalHeads: number;
  totalTails: number;
}

const FAKE_USERNAMES = [
  "CoinMaster", "FlipKing", "LuckyFlip", "HeadsUp", "TailsWin",
  "GoldenCoin", "SilverFlip", "BronzeBet", "DiamondToss", "PlatinumFlip",
  "CryptoFlipper", "TossLord", "CoinWhiz", "FlipChamp", "DoubleSide",
  "EdgeRunner", "CoinHero", "FlipStar", "TossKing", "CoinAce"
];

const generateFakePlayer = (): LiveBet => {
  const sides: ("heads" | "tails")[] = ["heads", "tails"];
  const side = sides[Math.floor(Math.random() * sides.length)];
  const amount = Math.floor(Math.random() * 500) + 10;

  return {
    id: `fake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)],
    side,
    amount,
    timestamp: new Date().toISOString(),
    isSimulated: true,
  };
};

const CoinFlipLiveBets = ({ bets, totalHeads, totalTails }: CoinFlipLiveBetsProps) => {
  const { symbol } = useCurrency();
  const [simulatedBets, setSimulatedBets] = useState<LiveBet[]>([]);

  // Generate initial simulated bets
  useEffect(() => {
    const initialFakes = Array.from({ length: 5 }, () => generateFakePlayer());
    setSimulatedBets(initialFakes);
  }, []);

  // Periodically update simulated bets
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedBets(prev => {
        const updated = [...prev];

        // Add new fake player occasionally
        if (Math.random() > 0.5 && updated.length < 10) {
          updated.unshift(generateFakePlayer());
        }

        // Remove old bets occasionally
        if (updated.length > 6 && Math.random() > 0.6) {
          updated.pop();
        }

        return updated.slice(0, 10);
      });
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Combine real and simulated bets
  const allBets = [...bets, ...simulatedBets];

  // Calculate totals including simulated bets
  const simulatedHeads = simulatedBets.filter(b => b.side === "heads").reduce((sum, b) => sum + b.amount, 0);
  const simulatedTails = simulatedBets.filter(b => b.side === "tails").reduce((sum, b) => sum + b.amount, 0);
  const combinedHeads = totalHeads + simulatedHeads;
  const combinedTails = totalTails + simulatedTails;

  const totalPool = combinedHeads + combinedTails;
  const headsPercent = totalPool > 0 ? (combinedHeads / totalPool) * 100 : 50;
  const tailsPercent = totalPool > 0 ? (combinedTails / totalPool) * 100 : 50;

  return (
    <Card className="p-3 lg:p-5 bg-card/50 backdrop-blur-xl border-border/50 rounded-xl">
      <div className="space-y-3 lg:space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm lg:text-base font-semibold text-foreground">Live Bets</h3>
          <span className="text-[10px] lg:text-xs text-muted-foreground">{allBets.length} bets</span>
        </div>

        {/* Pool Distribution */}
        <div className="space-y-1.5 lg:space-y-2">
          <div className="flex justify-between text-[10px] lg:text-xs">
            <span className="text-yellow-500 font-medium">
              H: {symbol}{combinedHeads.toLocaleString("en-IN")}
            </span>
            <span className="text-gray-400 font-medium">
              T: {symbol}{combinedTails.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="h-2 lg:h-3 rounded-full bg-muted/30 overflow-hidden flex">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-500 to-orange-500"
              initial={false}
              animate={{ width: `${headsPercent}%` }}
              transition={{ duration: 0.5 }}
            />
            <motion.div
              className="h-full bg-gradient-to-r from-gray-400 to-gray-600"
              initial={false}
              animate={{ width: `${tailsPercent}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Bet List */}
        <ScrollArea className="h-40 lg:h-72">
          <AnimatePresence mode="popLayout">
            {allBets.map((bet) => (
              <motion.div
                key={bet.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center justify-between py-2 lg:py-3 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-2 lg:gap-3">
                  <Avatar className="h-7 w-7 lg:h-9 lg:w-9">
                    <AvatarImage src={bet.avatarUrl} />
                    <AvatarFallback className="text-xs lg:text-sm bg-muted">
                      {bet.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-xs lg:text-sm font-medium text-foreground">
                      {bet.username}
                    </span>
                    <span className="text-[10px] lg:text-xs text-muted-foreground">
                      {new Date(bet.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className={`w-5 h-5 lg:w-7 lg:h-7 rounded-full flex items-center justify-center ${
                    bet.side === "heads"
                      ? "bg-gradient-to-br from-yellow-500 to-orange-500"
                      : "bg-gradient-to-br from-gray-400 to-gray-600"
                  }`}>
                    <span className="text-[10px] lg:text-xs font-bold text-white">
                      {bet.side === "heads" ? "H" : "T"}
                    </span>
                  </div>
                  <span className={`text-sm lg:text-base font-semibold ${
                    bet.side === "heads" ? "text-yellow-500" : "text-gray-400"
                  }`}>
                    {symbol}{bet.amount.toLocaleString("en-IN")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {allBets.length === 0 && (
            <div className="py-8 text-center text-sm lg:text-base text-muted-foreground">
              No bets placed yet
            </div>
          )}
        </ScrollArea>
      </div>
    </Card>
  );
};

export default CoinFlipLiveBets;
