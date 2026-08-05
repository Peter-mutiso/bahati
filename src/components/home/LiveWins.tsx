import { useEffect, useState, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Crown, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface Win {
  id: string;
  username: string;
  amount: number;
  multiplier: number;
  game: string;
  avatarColor: string;
}

// Random player names pool
const playerNames = [
  "ChickenMaster", "RoadRunner", "LuckyHen", "GoldenEgg", "FastFowl",
  "CluckKing", "WingMan", "EggChamp", "FeatherPro", "PeckerAce",
  "HenHero", "RoosterBoss", "ChickWinner", "EggHunter", "WingLord",
  "CluckStar", "PoultryKing", "NestMaster", "CoopChamp", "BirdBrain",
  "HatchMaster", "FlockLeader", "PlumeAce", "TalonPro", "BeakBoss",
  "CrestKing", "WaddleWin", "ScratchPro", "LayerLuck", "BroilerBet",
  "CockerelCash", "PulletPro", "CaponChamp", "BantamBoss", "SilkieWin"
];

// Avatar colors pool
const avatarColors = [
  "from-amber-400 to-amber-600",
  "from-emerald-400 to-emerald-600",
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-red-400 to-red-600",
  "from-orange-400 to-orange-600",
  "from-cyan-400 to-cyan-600",
  "from-indigo-400 to-indigo-600",
  "from-teal-400 to-teal-600"
];

// Generate a seed based on the current date (changes daily)
const getDailySeed = () => {
  const today = new Date();
  return today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
};

// Seeded random number generator
const seededRandom = (seed: number, index: number) => {
  const x = Math.sin(seed + index * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

// Generate random wins based on daily seed
const generateDailyWins = (count: number): Win[] => {
  const seed = getDailySeed();
  const wins: Win[] = [];
  const usedNames = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // Get unique random name
    let nameIndex = Math.floor(seededRandom(seed, i * 3) * playerNames.length);
    while (usedNames.has(playerNames[nameIndex])) {
      nameIndex = (nameIndex + 1) % playerNames.length;
    }
    usedNames.add(playerNames[nameIndex]);
    
    // Generate random amount (bigger wins for top positions)
    const baseAmount = i < 3 ? 5000 : i < 6 ? 2000 : 500;
    const amount = baseAmount + seededRandom(seed, i * 3 + 1) * baseAmount * 2;
    
    // Generate random multiplier
    const multiplier = 1.5 + seededRandom(seed, i * 3 + 2) * (i < 3 ? 50 : 20);
    
    // Get avatar color
    const colorIndex = Math.floor(seededRandom(seed, i * 5) * avatarColors.length);
    
    wins.push({
      id: `win-${i}-${seed}`,
      username: playerNames[nameIndex],
      amount: Math.round(amount * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
      game: "Chicken Road",
      avatarColor: avatarColors[colorIndex]
    });
  }
  
  // Sort by amount descending
  return wins.sort((a, b) => b.amount - a.amount);
};

export const LiveWins = () => {
  const { symbol } = useCurrency();
  const { ref, isVisible } = useScrollAnimation();
  
  // Generate wins using daily seed (memoized so it doesn't change on re-render)
  const wins = useMemo(() => generateDailyWins(10), []);

  return (
    <div 
      ref={ref}
      className={`w-full bg-background py-4 md:py-8 overflow-hidden relative transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 md:px-4 relative z-10">
        {/* Main Leaderboard Container with Rounded Border */}
        <div className="bg-gradient-to-b from-card/80 via-card/60 to-card/80 rounded-2xl md:rounded-3xl border-2 border-border/30 shadow-xl overflow-hidden p-3 md:p-6 backdrop-blur-sm">
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-4 md:mb-6">
              <div className="relative flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/60 backdrop-blur-sm shadow-md shadow-emerald-500/20">
                <div className="relative">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  <div className="absolute inset-0 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                </div>
                <span className="text-emerald-400 font-bold text-xs uppercase tracking-wide">Live Wins</span>
              </div>
              <span className="text-muted-foreground text-xs">🐔 Chicken Road</span>
            </div>

            {/* Top 3 Podium */}
            <div className="flex items-end justify-center gap-1.5 md:gap-4 mb-4 md:mb-6 px-1">
              {/* 2nd Place */}
              <div className="flex flex-col items-center animate-fade-in flex-1 max-w-[100px] md:max-w-[140px]" style={{ animationDelay: '0.1s' }}>
                <div className="relative mb-1.5 md:mb-2">
                  <Avatar className="w-12 h-12 md:w-20 md:h-20 border-2 md:border-3 border-slate-400 shadow-lg shadow-slate-400/50 ring-1 md:ring-2 ring-slate-950">
                    <AvatarFallback className={`bg-gradient-to-br ${wins[1].avatarColor} text-white font-bold text-xl md:text-2xl`}>
                      {wins[1].username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 md:-bottom-1 left-1/2 -translate-x-1/2">
                    <div className="relative w-7 h-7 md:w-10 md:h-10 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full shadow-md shadow-slate-400/50" />
                      <Crown className="w-4 h-4 md:w-5 md:h-5 text-slate-700 relative z-10" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5 md:mt-3">
                  <div className="font-bold text-foreground text-[10px] md:text-sm mb-0.5 truncate max-w-full">{wins[1].username}</div>
                  <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-xs md:text-base">
                    <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-sm">{symbol}{wins[1].amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[8px] md:text-xs text-amber-400 font-semibold">{wins[1].multiplier}x</div>
                </div>
              </div>

              {/* 1st Place - Elevated */}
              <div className="flex flex-col items-center -mt-2 md:-mt-4 animate-fade-in flex-1 max-w-[110px] md:max-w-[160px]" style={{ animationDelay: '0s' }}>
                <div className="relative mb-1.5 md:mb-2">
                  <Avatar className="w-16 h-16 md:w-24 md:h-24 border-2 md:border-3 border-amber-400 shadow-xl shadow-amber-500/60 ring-1 md:ring-2 ring-amber-950">
                    <AvatarFallback className={`bg-gradient-to-br ${wins[0].avatarColor} text-white font-bold text-2xl md:text-3xl`}>
                      {wins[0].username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 md:-bottom-1 left-1/2 -translate-x-1/2">
                    <div className="relative w-8 h-8 md:w-11 md:h-11 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full shadow-md shadow-amber-500/50" />
                      <Crown className="w-5 h-5 md:w-6 md:h-6 text-amber-950 relative z-10" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5 md:mt-3">
                  <div className="font-black text-amber-400 text-xs md:text-base mb-0.5 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] truncate max-w-full">
                    {wins[0].username}
                  </div>
                  <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-sm md:text-lg">
                    <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                    <span className="text-xs md:text-base">{symbol}{wins[0].amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[9px] md:text-sm text-amber-400 font-semibold">{wins[0].multiplier}x</div>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center animate-fade-in flex-1 max-w-[100px] md:max-w-[140px]" style={{ animationDelay: '0.2s' }}>
                <div className="relative mb-1.5 md:mb-2">
                  <Avatar className="w-12 h-12 md:w-20 md:h-20 border-2 md:border-3 border-orange-600 shadow-lg shadow-orange-600/50 ring-1 md:ring-2 ring-orange-950">
                    <AvatarFallback className={`bg-gradient-to-br ${wins[2].avatarColor} text-white font-bold text-xl md:text-2xl`}>
                      {wins[2].username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-0.5 md:-bottom-1 left-1/2 -translate-x-1/2">
                    <div className="relative w-7 h-7 md:w-10 md:h-10 flex items-center justify-center">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full shadow-md shadow-orange-600/50" />
                      <Crown className="w-4 h-4 md:w-5 md:h-5 text-orange-950 relative z-10" fill="currentColor" />
                    </div>
                  </div>
                </div>
                <div className="text-center mt-1.5 md:mt-3">
                  <div className="font-bold text-foreground text-[10px] md:text-sm mb-0.5 truncate max-w-full">{wins[2].username}</div>
                  <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-xs md:text-base">
                    <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                    <span className="text-[10px] md:text-sm">{symbol}{wins[2].amount.toFixed(2)}</span>
                  </div>
                  <div className="text-[8px] md:text-xs text-amber-400 font-semibold">{wins[2].multiplier}x</div>
                </div>
              </div>
            </div>

            {/* Rest of the Rankings */}
            <div className="mt-4 md:mt-6 space-y-1.5 max-w-2xl mx-auto">
              {wins.slice(3, 10).map((win, index) => {
                const rank = index + 4;
                return (
                  <div
                    key={win.id}
                    className="group relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-lg md:rounded-xl p-2 md:p-3 hover:border-amber-500/30 transition-all duration-300 animate-fade-in shadow-md hover:shadow-lg"
                    style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                  >
                    <div className="flex items-center gap-1.5 md:gap-3">
                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-card border border-border/50 shadow-md">
                          <span className="text-[10px] md:text-xs font-bold text-muted-foreground">#{rank}</span>
                        </div>
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-border/50 shadow-md">
                        <AvatarFallback className={`bg-gradient-to-br ${win.avatarColor} text-white font-bold text-sm md:text-base`}>
                          {win.username[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground text-[10px] md:text-sm truncate">{win.username}</div>
                        <div className="text-[9px] md:text-xs text-muted-foreground flex items-center gap-1">
                          <span>🐔</span>
                          <span>{win.game}</span>
                        </div>
                      </div>

                      {/* Win Amount */}
                      <div className="text-right">
                        <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-[10px] md:text-sm">
                          <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                          <span>{symbol}{win.amount.toFixed(2)}</span>
                        </div>
                        <div className="text-[8px] md:text-xs text-amber-400 font-semibold">{win.multiplier}x</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
