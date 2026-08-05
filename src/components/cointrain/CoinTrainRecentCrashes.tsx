import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const CoinTrainRecentCrashes = () => {
  const [recentCrashes, setRecentCrashes] = useState<number[]>([]);

  useEffect(() => {
    // Fetch initial recent crashes from game_rounds (shared with Crash game)
    const fetchRecentCrashes = async () => {
      const { data } = await supabase
        .from("game_rounds")
        .select("crash_point")
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setRecentCrashes(data.map((r) => r.crash_point));
      }
    };

    fetchRecentCrashes();

    // Subscribe to new crashes
    const channel = supabase
      .channel("cointrain_recent_crashes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rounds",
          filter: "status=eq.crashed",
        },
        (payload: any) => {
          setRecentCrashes((prev) => [payload.new.crash_point, ...prev].slice(0, 10));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getMultiplierStyle = (multiplier: number) => {
    if (multiplier >= 10) return "bg-gradient-to-r from-emerald-500 to-emerald-400 text-slate-900 shadow-lg shadow-emerald-500/20";
    if (multiplier >= 5) return "bg-gradient-to-r from-emerald-600 to-emerald-500 text-slate-900";
    if (multiplier >= 2) return "bg-gradient-to-r from-teal-500 to-teal-400 text-slate-900";
    return "bg-slate-700 text-slate-300";
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1.5">
        <span className="text-emerald-500">🚂</span> 
        <span className="font-medium">Recent:</span>
      </span>
      <div className="flex gap-1.5">
        {recentCrashes.map((crash, index) => (
          <div
            key={index}
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all hover:scale-105",
              getMultiplierStyle(crash)
            )}
          >
            {crash.toFixed(2)}x
          </div>
        ))}
      </div>
    </div>
  );
};

export default CoinTrainRecentCrashes;