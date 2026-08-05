import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const AviatorRecentCrashes = () => {
  const [crashes, setCrashes] = useState<number[]>([]);

  useEffect(() => {
    const fetchCrashes = async () => {
      const { data, error } = await supabase
        .from("game_rounds")
        .select("crash_point")
        .eq("game_type", "aviator")
        .eq("status", "crashed")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setCrashes(data.map(r => r.crash_point));
      }
    };

    fetchCrashes();

    const channel = supabase
      .channel("aviator_crashes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_rounds",
          filter: "status=eq.crashed",
        },
        (payload: any) => {
          if (payload.new.game_type === "aviator") {
            setCrashes(prev => [payload.new.crash_point, ...prev.slice(0, 19)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getColorClass = (value: number) => {
    if (value >= 10) return "bg-gradient-to-r from-yellow-500 to-amber-500 text-yellow-900";
    if (value >= 5) return "bg-gradient-to-r from-red-500 to-rose-500 text-white";
    if (value >= 2) return "bg-gradient-to-r from-red-600 to-red-700 text-red-100";
    return "bg-red-900/50 text-red-300 border border-red-800/50";
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <span className="text-xs text-red-400/70 whitespace-nowrap font-medium">Recent:</span>
      {crashes.length === 0 ? (
        <span className="text-xs text-slate-500">No flights yet...</span>
      ) : (
        crashes.map((crash, index) => (
          <span
            key={index}
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold whitespace-nowrap shadow-sm",
              getColorClass(crash)
            )}
          >
            {crash.toFixed(2)}x
          </span>
        ))
      )}
    </div>
  );
};

export default AviatorRecentCrashes;