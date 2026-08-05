import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

interface Cyclist {
  number: number;
  name: string;
  color: string;
  flag: string;
  recentWins: number;
  winRate: number;
  multiplierRange: string;
}

interface CycleRaceCyclistSelectorProps {
  cyclists: Cyclist[];
  selectedCyclist: number | null;
  onSelectCyclist: (number: number) => void;
}

const CycleRaceCyclistSelector = ({
  cyclists,
  selectedCyclist,
  onSelectCyclist
}: CycleRaceCyclistSelectorProps) => {
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (number: number) => {
    setFavorites(prev =>
      prev.includes(number)
        ? prev.filter(n => n !== number)
        : [...prev, number]
    );
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">Select Cyclist</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cyclists.map((cyclist) => (
          <motion.div
            key={cyclist.number}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Card
              onClick={() => onSelectCyclist(cyclist.number)}
              className={`p-3 cursor-pointer transition-all duration-300 relative overflow-hidden ${
                selectedCyclist === cyclist.number
                  ? "ring-2 ring-primary bg-primary/5"
                  : "hover:bg-accent/5"
              }`}
            >
              {/* Favorite Star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite(cyclist.number);
                }}
                className="absolute top-2 right-2 z-10"
              >
                <Star
                  className={`w-4 h-4 ${
                    favorites.includes(cyclist.number)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground"
                  }`}
                />
              </button>

              {/* Cyclist Info */}
              <div className="flex items-start gap-2 mb-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ backgroundColor: cyclist.color }}
                >
                  {cyclist.number}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{cyclist.name}</p>
                  <p className="text-xs text-muted-foreground">{cyclist.flag}</p>
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Win Rate</span>
                  <Badge variant="secondary" className="text-xs">
                    {cyclist.winRate}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Recent Wins</span>
                  <span className="font-semibold">{cyclist.recentWins}</span>
                </div>
                <div className="flex items-center gap-1 text-xs pt-1 border-t border-border/50">
                  <TrendingUp className="w-3 h-3 text-primary" />
                  <span className="text-muted-foreground">Range:</span>
                  <span className="font-semibold text-primary">{cyclist.multiplierRange}</span>
                </div>
              </div>

              {/* Selection Indicator */}
              {selectedCyclist === cyclist.number && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
                />
              )}
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default CycleRaceCyclistSelector;
