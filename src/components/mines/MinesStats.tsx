import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Gem, Bomb } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";

interface MinesStatsProps {
  tilesRevealed: number;
  currentMultiplier: number;
  potentialWin: number;
  minesCount: number;
  gameStatus: 'idle' | 'active' | 'busted' | 'cashed_out';
}

export const MinesStats = ({
  tilesRevealed,
  currentMultiplier,
  potentialWin,
  minesCount,
  gameStatus
}: MinesStatsProps) => {
  const { formatCurrency } = useCurrency();
  
  const safetilesLeft = 25 - minesCount - tilesRevealed;

  return (
    <Card className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Game Statistics
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 gap-3">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 border-2 border-emerald-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="w-5 h-5 text-emerald-400" />
                <p className="text-xs text-muted-foreground font-medium">Gems Found</p>
              </div>
              <p className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]">
                {tilesRevealed}
              </p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="relative p-4 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/10 border-2 border-destructive/30 overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Bomb className="w-5 h-5 text-destructive" />
                <p className="text-xs text-muted-foreground font-medium">Mines</p>
              </div>
              <p className="text-3xl font-bold text-destructive drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                {minesCount}
              </p>
            </div>
          </motion.div>
        </div>

        <motion.div 
          animate={{ scale: [1, 1.01, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="relative p-5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <p className="text-sm text-muted-foreground font-medium">Current Multiplier</p>
            </div>
            <p className="text-4xl font-bold text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.6)]">
              {currentMultiplier.toFixed(2)}x
            </p>
          </div>
        </motion.div>

        {gameStatus === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-400/5 border-2 border-emerald-500/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Potential Win</p>
                <p className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.4)]">
                  {formatCurrency(potentialWin)}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-card/50 border border-border/50">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Safe Tiles Remaining</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-muted/50 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(safetilesLeft / (25 - minesCount)) * 100}%` }}
                    transition={{ duration: 0.5 }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
                <span className="text-lg font-bold text-foreground min-w-[2rem] text-right">
                  {safetilesLeft}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
};
