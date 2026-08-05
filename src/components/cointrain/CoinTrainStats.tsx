import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingDown, TrendingUp, Train } from "lucide-react";

interface CoinTrainStatsProps {
  isAuthenticated: boolean;
}

const CoinTrainStats = ({ isAuthenticated }: CoinTrainStatsProps) => {
  const [todayLow, setTodayLow] = useState<number | null>(null);
  const [todayHigh, setTodayHigh] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase.rpc("get_today_crash_stats", {
        today_date: today.toISOString(),
      });

      if (data && data.length > 0) {
        setTodayLow(data[0].min_crash);
        setTodayHigh(data[0].max_crash);
      }
    };

    fetchStats();

    // Refresh every minute
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2 md:gap-3">
      <Card className="p-2 md:p-3 border-red-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="p-1.5 md:p-2 rounded-lg bg-red-500/10 border border-red-500/20">
            <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-slate-400">Today's Derail</p>
            <p className="text-sm md:text-base font-bold text-red-400">
              {todayLow !== null ? `${todayLow.toFixed(2)}x` : "—"}
            </p>
          </div>
        </div>
      </Card>
      <Card className="p-2 md:p-3 border-emerald-600/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 border border-emerald-600/20">
            <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-emerald-500" />
          </div>
          <div>
            <p className="text-[10px] md:text-xs text-slate-400">Today's Best</p>
            <p className="text-sm md:text-base font-bold text-emerald-500">
              {todayHigh !== null ? `${todayHigh.toFixed(2)}x` : "—"}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CoinTrainStats;