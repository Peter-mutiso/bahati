import { useMemo, useState, useEffect } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { Crown, TrendingUp, Trophy, Target, Flame, Gift, Clock, Users } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

// Dummy player names pool
const dummyPlayerNames = [
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

interface LeaderboardPlayer {
  id: string;
  username: string;
  amount: number;
  multiplier: number;
  avatarColor: string;
  isReal: boolean;
  rank?: number;
  winDate?: string;
}

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

interface Challenge {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  icon: string;
  completed: boolean;
  winnerName: string; // Always a dummy
  winnerAvatar: string;
}

// Generate daily leaderboard with mix of real and dummy players
const generateDailyLeaderboard = (realPlayers: LeaderboardPlayer[], seed: number): LeaderboardPlayer[] => {
  const usedNames = new Set(realPlayers.map(p => p.username));
  const dummyPlayers: LeaderboardPlayer[] = [];
  
  // Generate dummy players for top positions (winners are always dummies)
  for (let i = 0; i < 10; i++) {
    let nameIndex = Math.floor(seededRandom(seed, i * 3) * dummyPlayerNames.length);
    while (usedNames.has(dummyPlayerNames[nameIndex])) {
      nameIndex = (nameIndex + 1) % dummyPlayerNames.length;
    }
    usedNames.add(dummyPlayerNames[nameIndex]);
    
    // Top 3 positions always get highest amounts (dummy winners)
    const baseAmount = i < 3 ? 8000 + (3 - i) * 3000 : 2000;
    const amount = baseAmount + seededRandom(seed, i * 3 + 1) * baseAmount;
    const multiplier = 2 + seededRandom(seed, i * 3 + 2) * (i < 3 ? 80 : 40);
    const colorIndex = Math.floor(seededRandom(seed, i * 5) * avatarColors.length);
    
    dummyPlayers.push({
      id: `dummy-${i}-${seed}`,
      username: dummyPlayerNames[nameIndex],
      amount: Math.round(amount * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
      avatarColor: avatarColors[colorIndex],
      isReal: false
    });
  }
  
  // Combine and sort - dummies always on top for rewards
  const allPlayers = [...dummyPlayers, ...realPlayers.slice(0, 5)];
  return allPlayers.sort((a, b) => b.amount - a.amount).slice(0, 15);
};

// Generate daily challenges
const generateDailyChallenges = (seed: number): Challenge[] => {
  const challenges: Challenge[] = [
    {
      id: "cross-lanes",
      title: "Lane Master",
      description: "Cross 100 lanes total today",
      progress: Math.floor(seededRandom(seed, 100) * 85),
      target: 100,
      reward: 500,
      icon: "🛣️",
      completed: false,
      winnerName: dummyPlayerNames[Math.floor(seededRandom(seed, 101) * dummyPlayerNames.length)],
      winnerAvatar: avatarColors[Math.floor(seededRandom(seed, 102) * avatarColors.length)]
    },
    {
      id: "high-multi",
      title: "Multiplier Hunter",
      description: "Hit 50x multiplier or higher",
      progress: Math.floor(seededRandom(seed, 110) * 42),
      target: 50,
      reward: 1000,
      icon: "🎯",
      completed: false,
      winnerName: dummyPlayerNames[Math.floor(seededRandom(seed, 111) * dummyPlayerNames.length)],
      winnerAvatar: avatarColors[Math.floor(seededRandom(seed, 112) * avatarColors.length)]
    },
    {
      id: "streak",
      title: "Win Streak",
      description: "Win 5 games in a row",
      progress: Math.floor(seededRandom(seed, 120) * 4),
      target: 5,
      reward: 750,
      icon: "🔥",
      completed: false,
      winnerName: dummyPlayerNames[Math.floor(seededRandom(seed, 121) * dummyPlayerNames.length)],
      winnerAvatar: avatarColors[Math.floor(seededRandom(seed, 122) * avatarColors.length)]
    },
    {
      id: "volume",
      title: "High Roller",
      description: "Wager 10,000 total today",
      progress: Math.floor(seededRandom(seed, 130) * 8500),
      target: 10000,
      reward: 2000,
      icon: "💰",
      completed: false,
      winnerName: dummyPlayerNames[Math.floor(seededRandom(seed, 131) * dummyPlayerNames.length)],
      winnerAvatar: avatarColors[Math.floor(seededRandom(seed, 132) * avatarColors.length)]
    }
  ];
  
  return challenges;
};

// Generate high rollers / big wins with steadily rising figures
const generateHighRollers = (realBets: any[], seed: number): LeaderboardPlayer[] => {
  const usedNames = new Set<string>();
  const highRollers: LeaderboardPlayer[] = [];
  const dayOfYear = getDayOfYear();
  
  // Base amount increases by ~50 each day of the year
  const dailyBoost = dayOfYear * 50;
  
  // Always have dummies as top winners
  for (let i = 0; i < 8; i++) {
    let nameIndex = Math.floor(seededRandom(seed + 500, i * 3) * dummyPlayerNames.length);
    while (usedNames.has(dummyPlayerNames[nameIndex])) {
      nameIndex = (nameIndex + 1) % dummyPlayerNames.length;
    }
    usedNames.add(dummyPlayerNames[nameIndex]);
    
    // Base amount + daily boost for steadily rising figures
    const baseAmount = 5000 + seededRandom(seed + 500, i * 3 + 1) * 15000;
    const amount = baseAmount + dailyBoost + (i === 0 ? dailyBoost * 0.5 : 0);
    const multiplier = 10 + seededRandom(seed + 500, i * 3 + 2) * 90;
    const colorIndex = Math.floor(seededRandom(seed + 500, i * 5) * avatarColors.length);
    
    // Assign dates - top wins are from today, others from recent days
    const daysAgo = i < 3 ? 0 : Math.floor(seededRandom(seed + 500, i * 7) * 5);
    
    highRollers.push({
      id: `hr-${i}-${seed}`,
      username: dummyPlayerNames[nameIndex],
      amount: Math.round(amount * 100) / 100,
      multiplier: Math.round(multiplier * 100) / 100,
      avatarColor: avatarColors[colorIndex],
      isReal: false,
      winDate: formatWinDate(daysAgo)
    });
  }
  
  // Add some real bets but with lower amounts
  realBets.slice(0, 4).forEach((bet, i) => {
    if (bet.profiles?.username && !usedNames.has(bet.profiles.username)) {
      highRollers.push({
        id: bet.id,
        username: bet.profiles.username,
        amount: Number(bet.profit) || Number(bet.amount) * 0.5,
        multiplier: Number(bet.final_multiplier) || 2,
        avatarColor: avatarColors[i % avatarColors.length],
        isReal: true,
        winDate: formatWinDate(Math.floor(seededRandom(seed, i * 10) * 3))
      });
    }
  });
  
  return highRollers.sort((a, b) => b.amount - a.amount).slice(0, 10);
};

export const LeaderboardSection = () => {
  const { symbol } = useCurrency();
  const { ref, isVisible } = useScrollAnimation();
  const [realPlayers, setRealPlayers] = useState<LeaderboardPlayer[]>([]);
  const [realBets, setRealBets] = useState<any[]>([]);
  const seed = getDailySeed();
  
  // Fetch real player data
  useEffect(() => {
    const fetchRealData = async () => {
      // Fetch recent wins from chicken_road_bets
      const { data: bets } = await supabase
        .from('chicken_road_bets')
        .select('id, amount, profit, final_multiplier, user_id')
        .eq('status', 'won')
        .order('created_at', { ascending: false })
        .limit(20);

      if (bets && bets.length > 0) {
        // Usernames are looked up separately through a narrow view that
        // only ever exposes (id, username) - never email/phone/financial
        // fields - since this section is public and shows other players'
        // identities.
        const userIds = [...new Set(bets.map(bet => bet.user_id))];
        const { data: identities } = await supabase
          .from('profile_public_usernames')
          .select('id, username')
          .in('id', userIds);

        const usernameById = new Map((identities || []).map(p => [p.id, p.username]));
        const betsWithProfiles = bets.map(bet => ({
          ...bet,
          profiles: { username: usernameById.get(bet.user_id) || null },
        }));

        setRealBets(betsWithProfiles);
        const players: LeaderboardPlayer[] = betsWithProfiles.slice(0, 5).map((bet, i) => ({
          id: bet.id,
          username: bet.profiles?.username || `Player${i}`,
          amount: Number(bet.profit) || 0,
          multiplier: Number(bet.final_multiplier) || 1,
          avatarColor: avatarColors[i % avatarColors.length],
          isReal: true
        }));
        setRealPlayers(players);
      }
    };

    fetchRealData();
  }, []);
  
  const leaderboard = useMemo(() => generateDailyLeaderboard(realPlayers, seed), [realPlayers, seed]);
  const challenges = useMemo(() => generateDailyChallenges(seed), [seed]);
  const highRollers = useMemo(() => generateHighRollers(realBets, seed), [realBets, seed]);

  const getTimeRemaining = () => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const diff = endOfDay.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const [timeRemaining, setTimeRemaining] = useState(getTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      ref={ref}
      className={`w-full bg-background py-4 md:py-8 overflow-hidden relative transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="max-w-7xl mx-auto px-2 md:px-4 relative z-10">
        <div className="bg-gradient-to-b from-card/80 via-card/60 to-card/80 rounded-2xl md:rounded-3xl border-2 border-border/30 shadow-xl overflow-hidden p-3 md:p-6 backdrop-blur-sm">
          {/* Premium gradient overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
      
          <div className="relative z-10">
            {/* Header with Timer */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-2 mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 md:w-6 md:h-6 text-amber-500" />
                <h2 className="text-lg md:text-2xl font-black text-foreground">Daily Competition</h2>
                <Badge className="bg-amber-500/20 text-amber-500 text-[10px] md:text-xs">
                  🐔 Chicken Road
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>Resets in: <span className="text-amber-500 font-bold">{timeRemaining}</span></span>
              </div>
            </div>

            <Tabs defaultValue="leaderboard" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-card/50 border border-border/30 mb-4">
                <TabsTrigger value="leaderboard" className="text-xs md:text-sm data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-500">
                  <Crown className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Leaderboard
                </TabsTrigger>
                <TabsTrigger value="challenges" className="text-xs md:text-sm data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-500">
                  <Target className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Challenges
                </TabsTrigger>
                <TabsTrigger value="highrollers" className="text-xs md:text-sm data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-500">
                  <Flame className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  Big Wins
                </TabsTrigger>
              </TabsList>

              {/* Daily Leaderboard */}
              <TabsContent value="leaderboard" className="mt-0">
                {/* Top 3 Podium */}
                <div className="flex items-end justify-center gap-1.5 md:gap-4 mb-4 md:mb-6 px-1">
                  {/* 2nd Place */}
                  {leaderboard[1] && (
                    <div className="flex flex-col items-center animate-fade-in flex-1 max-w-[100px] md:max-w-[140px]">
                      <div className="relative mb-1.5 md:mb-2">
                        <Avatar className="w-12 h-12 md:w-20 md:h-20 border-2 md:border-3 border-slate-400 shadow-lg shadow-slate-400/50 ring-1 md:ring-2 ring-slate-950">
                          <AvatarFallback className={`bg-gradient-to-br ${leaderboard[1].avatarColor} text-white font-bold text-xl md:text-2xl`}>
                            {leaderboard[1].username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 md:-bottom-1 left-1/2 -translate-x-1/2">
                          <div className="relative w-7 h-7 md:w-10 md:h-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-slate-300 to-slate-500 rounded-full shadow-md shadow-slate-400/50" />
                            <span className="text-slate-700 font-bold text-xs md:text-sm relative z-10">2</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-1.5 md:mt-3">
                        <div className="font-bold text-foreground text-[10px] md:text-sm mb-0.5 truncate max-w-full">{leaderboard[1].username}</div>
                        <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-xs md:text-base">
                          <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                          <span className="text-[10px] md:text-sm">{symbol}{leaderboard[1].amount.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 1st Place */}
                  {leaderboard[0] && (
                    <div className="flex flex-col items-center -mt-2 md:-mt-4 animate-fade-in flex-1 max-w-[110px] md:max-w-[160px]">
                      <div className="relative mb-1.5 md:mb-2">
                        <Avatar className="w-16 h-16 md:w-24 md:h-24 border-2 md:border-3 border-amber-400 shadow-xl shadow-amber-500/60 ring-1 md:ring-2 ring-amber-950">
                          <AvatarFallback className={`bg-gradient-to-br ${leaderboard[0].avatarColor} text-white font-bold text-2xl md:text-3xl`}>
                            {leaderboard[0].username[0]?.toUpperCase()}
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
                          {leaderboard[0].username}
                        </div>
                        <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-sm md:text-lg">
                          <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
                          <span className="text-xs md:text-base">{symbol}{leaderboard[0].amount.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3rd Place */}
                  {leaderboard[2] && (
                    <div className="flex flex-col items-center animate-fade-in flex-1 max-w-[100px] md:max-w-[140px]">
                      <div className="relative mb-1.5 md:mb-2">
                        <Avatar className="w-12 h-12 md:w-20 md:h-20 border-2 md:border-3 border-orange-600 shadow-lg shadow-orange-600/50 ring-1 md:ring-2 ring-orange-950">
                          <AvatarFallback className={`bg-gradient-to-br ${leaderboard[2].avatarColor} text-white font-bold text-xl md:text-2xl`}>
                            {leaderboard[2].username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 md:-bottom-1 left-1/2 -translate-x-1/2">
                          <div className="relative w-7 h-7 md:w-10 md:h-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-br from-orange-600 to-orange-800 rounded-full shadow-md shadow-orange-600/50" />
                            <span className="text-orange-950 font-bold text-xs md:text-sm relative z-10">3</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-1.5 md:mt-3">
                        <div className="font-bold text-foreground text-[10px] md:text-sm mb-0.5 truncate max-w-full">{leaderboard[2].username}</div>
                        <div className="flex items-center justify-center gap-0.5 text-emerald-400 font-black text-xs md:text-base">
                          <TrendingUp className="w-2.5 h-2.5 md:w-3.5 md:h-3.5" />
                          <span className="text-[10px] md:text-sm">{symbol}{leaderboard[2].amount.toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Rest of Rankings */}
                <div className="space-y-1.5 max-w-2xl mx-auto">
                  {leaderboard.slice(3, 10).map((player, index) => (
                    <div
                      key={player.id}
                      className="group relative bg-card/60 backdrop-blur-sm border border-border/50 rounded-lg md:rounded-xl p-2 md:p-3 hover:border-amber-500/30 transition-all duration-300 animate-fade-in shadow-md"
                      style={{ animationDelay: `${(index + 3) * 0.05}s` }}
                    >
                      <div className="flex items-center gap-1.5 md:gap-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-card border border-border/50 shadow-md">
                            <span className="text-[10px] md:text-xs font-bold text-muted-foreground">#{index + 4}</span>
                          </div>
                        </div>
                        <Avatar className="w-8 h-8 md:w-10 md:h-10 border border-border/50 shadow-md">
                          <AvatarFallback className={`bg-gradient-to-br ${player.avatarColor} text-white font-bold text-sm md:text-base`}>
                            {player.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-[10px] md:text-sm truncate">{player.username}</div>
                          <div className="text-[9px] md:text-xs text-muted-foreground">{player.multiplier}x multiplier</div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-0.5 text-emerald-400 font-bold text-[10px] md:text-sm">
                            <TrendingUp className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            <span>{symbol}{player.amount.toFixed(0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Daily Challenges */}
              <TabsContent value="challenges" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                  {challenges.map((challenge, index) => {
                    const progressPercent = (challenge.progress / challenge.target) * 100;
                    const gradientColors = [
                      "from-emerald-500/20 via-teal-500/10 to-cyan-500/5",
                      "from-purple-500/20 via-violet-500/10 to-indigo-500/5",
                      "from-orange-500/20 via-amber-500/10 to-yellow-500/5",
                      "from-pink-500/20 via-rose-500/10 to-red-500/5"
                    ];
                    const accentColors = [
                      { border: "border-emerald-500/40", text: "text-emerald-400", bg: "bg-emerald-500", glow: "shadow-emerald-500/30" },
                      { border: "border-purple-500/40", text: "text-purple-400", bg: "bg-purple-500", glow: "shadow-purple-500/30" },
                      { border: "border-orange-500/40", text: "text-orange-400", bg: "bg-orange-500", glow: "shadow-orange-500/30" },
                      { border: "border-pink-500/40", text: "text-pink-400", bg: "bg-pink-500", glow: "shadow-pink-500/30" }
                    ];
                    const colors = accentColors[index % accentColors.length];
                    
                    return (
                      <Card 
                        key={challenge.id}
                        className={`relative overflow-hidden p-4 md:p-5 bg-gradient-to-br ${gradientColors[index % gradientColors.length]} border ${colors.border} animate-fade-in hover:scale-[1.02] transition-all duration-300 group cursor-pointer`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-white/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
                        <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr from-white/3 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
                        
                        <div className="relative z-10">
                          {/* Header with Icon and Reward */}
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-xl ${colors.bg}/20 border ${colors.border} flex items-center justify-center shadow-lg ${colors.glow} group-hover:scale-110 transition-transform duration-300`}>
                                <span className="text-2xl md:text-3xl">{challenge.icon}</span>
                              </div>
                              <div>
                                <h3 className={`font-bold text-base md:text-lg ${colors.text}`}>{challenge.title}</h3>
                                <p className="text-[11px] md:text-xs text-muted-foreground">{challenge.description}</p>
                              </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full ${colors.bg}/20 border ${colors.border} shadow-lg ${colors.glow}`}>
                              <div className="flex items-center gap-1">
                                <Gift className={`w-3.5 h-3.5 ${colors.text}`} />
                                <span className={`text-sm md:text-base font-black ${colors.text}`}>{symbol}{challenge.reward}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Section */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs md:text-sm font-semibold text-foreground">Progress</span>
                              <span className={`text-xs md:text-sm font-bold ${colors.text}`}>
                                {challenge.progress}/{challenge.target}
                              </span>
                            </div>
                            <div className="relative h-3 md:h-4 bg-background/50 rounded-full overflow-hidden border border-border/30">
                              <div 
                                className={`absolute inset-y-0 left-0 ${colors.bg} rounded-full transition-all duration-500 ease-out`}
                                style={{ width: `${progressPercent}%` }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[10px] md:text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                                  {Math.round(progressPercent)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Winner Section */}
                          <div className={`flex items-center justify-between p-2.5 md:p-3 rounded-xl bg-background/40 border border-border/30`}>
                            <div className="flex items-center gap-1.5">
                              <Trophy className="w-4 h-4 text-amber-500" />
                              <span className="text-[11px] md:text-xs font-medium text-amber-500">Today's Winner</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Avatar className={`w-7 h-7 md:w-8 md:h-8 border-2 border-amber-500/50 shadow-lg shadow-amber-500/20`}>
                                <AvatarFallback className={`bg-gradient-to-br ${challenge.winnerAvatar} text-white font-bold text-xs`}>
                                  {challenge.winnerName[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-xs md:text-sm font-bold text-foreground truncate max-w-[80px] md:max-w-[100px]">
                                  {challenge.winnerName}
                                </span>
                                <span className="text-[10px] text-emerald-400 font-semibold">+{symbol}{challenge.reward}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* High Rollers / Big Wins */}
              <TabsContent value="highrollers" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                  {highRollers.map((player, index) => (
                    <Card 
                      key={player.id}
                      className={`p-3 md:p-4 bg-card/60 border-border/50 animate-fade-in ${
                        index === 0 ? 'md:col-span-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30' : ''
                      }`}
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className={`${index === 0 ? 'w-14 h-14 md:w-16 md:h-16' : 'w-10 h-10 md:w-12 md:h-12'} border-2 ${index === 0 ? 'border-amber-500' : 'border-border/50'} shadow-lg`}>
                            <AvatarFallback className={`bg-gradient-to-br ${player.avatarColor} text-white font-bold ${index === 0 ? 'text-xl md:text-2xl' : 'text-base md:text-lg'}`}>
                              {player.username[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1">
                              <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-bold truncate ${index === 0 ? 'text-amber-400 text-sm md:text-base' : 'text-foreground text-xs md:text-sm'}`}>
                              {player.username}
                            </span>
                            {index < 3 && (
                              <Badge className={`text-[8px] md:text-[10px] ${
                                index === 0 ? 'bg-amber-500/20 text-amber-500' :
                                index === 1 ? 'bg-purple-500/20 text-purple-500' :
                                'bg-pink-500/20 text-pink-500'
                              }`}>
                                {index === 0 ? '🔥 HOT' : index === 1 ? '⚡ BIG' : '💎 NICE'}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-emerald-400 font-black ${index === 0 ? 'text-lg md:text-xl' : 'text-sm md:text-base'}`}>
                              {symbol}{player.amount.toFixed(0)}
                            </span>
                            <span className="text-amber-500 text-[10px] md:text-xs font-semibold">
                              {player.multiplier}x
                            </span>
                            <span className="text-muted-foreground text-[9px] md:text-[10px]">
                              {player.winDate}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};
