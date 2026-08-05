import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, Zap, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

// Get day of year for steadily rising figures
const getDayOfYear = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
};

// Format date for display
const formatWinDate = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  const day = date.getDate();
  const month = date.toLocaleString('default', { month: 'short' });
  return `${day} ${month}`;
};

// Generate wins with steadily rising multipliers based on day of year
const generateBigWins = () => {
  const dayOfYear = getDayOfYear();
  const baseMultipliers = [97.50, 84.32, 72.10, 65.50, 48.75, 36.80];
  const players = ["ChickenMaster", "RoadRunner", "LuckyCross", "SafeChicken", "TrafficDodger", "GoldenEgg"];
  
  return players.map((player, index) => {
    // Add daily boost to multipliers (increases by ~0.5x each day)
    const dailyBoost = (dayOfYear % 30) * 0.5;
    const multiplier = baseMultipliers[index] + dailyBoost + (index === 0 ? dailyBoost * 0.3 : 0);
    
    // Assign dates - top wins are today, others from recent days
    const daysAgo = index < 2 ? 0 : Math.min(index - 1, 4);
    
    return {
      multiplier: `${multiplier.toFixed(2)}x`,
      game: "Chicken Road",
      player,
      color: "text-amber-500",
      bgColor: "from-amber-500/20",
      date: formatWinDate(daysAgo)
    };
  });
};

export const FeaturedMultipliers = () => {
  const { ref, isVisible } = useScrollAnimation();
  const recentBigWins = generateBigWins();

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-4 md:py-6 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-5 h-5 text-red-500 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Massive Wins Today
            </h2>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground">
            Recent highest multipliers across all games
          </p>
        </div>
        <Badge className="bg-red-500 text-white animate-pulse hidden md:flex">
          <Zap className="w-3 h-3 mr-1" />
          LIVE
        </Badge>
      </div>

      {/* Mobile: Horizontal Scroll */}
      <div 
        className="md:hidden flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {recentBigWins.map((win, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 w-[45%] snap-center"
          >
            <Card className={`relative overflow-hidden bg-gradient-to-br ${win.bgColor} to-transparent border-0 hover:scale-105 transition-all duration-300 cursor-pointer group`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
              <div className="relative p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[60%]">
                    {win.player}
                  </span>
                  <TrendingUp className={`w-3 h-3 ${win.color} group-hover:scale-110 transition-transform`} />
                </div>
                <p className="text-[8px] text-amber-400/80 font-medium mb-1">
                  🐔 {win.game}
                </p>
                <p className={`text-xl font-black ${win.color} group-hover:scale-110 transition-transform`}>
                  {win.multiplier}
                </p>
                <p className="text-[9px] text-muted-foreground mt-1">
                  {win.date}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Desktop: Grid */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        {recentBigWins.map((win, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className={`relative overflow-hidden bg-gradient-to-br ${win.bgColor} to-transparent border-0 hover:scale-105 transition-all duration-300 cursor-pointer group`}>
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
              <div className="relative p-3 md:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] md:text-[10px] text-muted-foreground font-medium truncate max-w-[60%]">
                    {win.player}
                  </span>
                  <TrendingUp className={`w-3 h-3 md:w-4 md:h-4 ${win.color} group-hover:scale-110 transition-transform`} />
                </div>
                <p className="text-[8px] md:text-[9px] text-amber-400/80 font-medium mb-1">
                  🐔 {win.game}
                </p>
                <p className={`text-xl md:text-2xl font-black ${win.color} group-hover:scale-110 transition-transform`}>
                  {win.multiplier}
                </p>
                <p className="text-[9px] md:text-[10px] text-muted-foreground mt-1">
                  {win.date}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
