import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface GameStatsProps {
  isAuthenticated?: boolean;
}

const GameStats = ({ isAuthenticated = false }: GameStatsProps) => {
  const [stats, setStats] = useState({
    todayLow: 0,
    todayHigh: 0,
  });

  // Generate random stats for non-authenticated users (stable per session)
  const guestStats = useMemo(() => ({
    todayLow: 1.01 + Math.random() * 0.5, // Between 1.01 and 1.51
    todayHigh: 15 + Math.random() * 35, // Between 15 and 50
  }), []);

  useEffect(() => {
    // Only fetch real stats if user is authenticated
    if (!isAuthenticated) return;

    loadStats();

    const channel = supabase
      .channel("stats_updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_rounds",
        },
        () => {
          loadStats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  const loadStats = async () => {
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0];

    const { data, error } = await supabase
      .rpc("get_today_crash_stats", { today_date: todayDateString });

    if (error) {
      console.error("GameStats: Error loading stats:", error);
      return;
    }

    if (data && data.length > 0 && data[0]) {
      const newStats = {
        todayLow: parseFloat(data[0].min_crash.toString()),
        todayHigh: parseFloat(data[0].max_crash.toString()),
      };
      setStats(newStats);
    }
  };

  // Use guest stats if not authenticated, otherwise use real stats
  const displayStats = isAuthenticated ? stats : guestStats;

  return (
    <div className="grid grid-cols-2 gap-4">
      <Card className="p-2 sm:p-4 card-shadow">
        <div className="flex items-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <TrendingDown className="w-3 h-3 sm:w-5 sm:h-5 text-destructive" />
          <span className="text-xs sm:text-sm text-muted-foreground">Today's Low</span>
        </div>
        <p className="text-base sm:text-xl md:text-2xl font-bold text-destructive">
          {displayStats.todayLow > 0 ? `${displayStats.todayLow.toFixed(2)}x` : "-"}
        </p>
      </Card>

      <Card className="p-2 sm:p-4 card-shadow">
        <div className="flex items-center gap-1 mb-1 sm:gap-2 sm:mb-2">
          <TrendingUp className="w-3 h-3 sm:w-5 sm:h-5 text-success" />
          <span className="text-xs sm:text-sm text-muted-foreground">Today's High</span>
        </div>
        <p className="text-base sm:text-xl md:text-2xl font-bold text-success">
          {displayStats.todayHigh > 0 ? `${displayStats.todayHigh.toFixed(2)}x` : "-"}
        </p>
      </Card>
    </div>
  );
};

export default GameStats;