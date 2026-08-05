import { Card } from "@/components/ui/card";
import { TrendingUp, Users, Trophy, DollarSign } from "lucide-react";
import { useEffect, useState } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

export const GameStats = () => {
  const { symbol } = useCurrency();
  const { ref, isVisible } = useScrollAnimation();
  const [stats, setStats] = useState({
    totalPlayers: 12456,
    totalWins: 8934,
    biggestWin: 125680,
    gamesPlayed: 45789
  });

  useEffect(() => {
    // Animate numbers on mount
    const interval = setInterval(() => {
      setStats(prev => ({
        totalPlayers: prev.totalPlayers + Math.floor(Math.random() * 5),
        totalWins: prev.totalWins + Math.floor(Math.random() * 3),
        biggestWin: prev.biggestWin + Math.floor(Math.random() * 1000),
        gamesPlayed: prev.gamesPlayed + Math.floor(Math.random() * 10)
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statCards = [
    {
      label: "Active Players",
      value: stats.totalPlayers.toLocaleString(),
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "Games Played Today",
      value: stats.gamesPlayed.toLocaleString(),
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Winners Today",
      value: stats.totalWins.toLocaleString(),
      icon: Trophy,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      label: "Biggest Win",
      value: `${symbol}${stats.biggestWin.toLocaleString()}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    }
  ];

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-4 md:py-6 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index}
              className="relative overflow-hidden bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all duration-300 hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <div className={`${stat.bgColor} rounded-full p-1.5 md:p-2`}>
                    <Icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} />
                  </div>
                  <span className="text-[10px] md:text-xs text-muted-foreground font-medium">
                    {stat.label}
                  </span>
                </div>
                <p className="text-lg md:text-2xl font-black text-foreground">
                  {stat.value}
                </p>
              </div>
              <div className={`absolute bottom-0 left-0 right-0 h-1 ${stat.bgColor}`} />
            </Card>
          );
        })}
      </div>
    </div>
  );
};
