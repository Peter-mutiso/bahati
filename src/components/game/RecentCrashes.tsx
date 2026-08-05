import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const RecentCrashes = () => {
  const [recentCrashes, setRecentCrashes] = useState<number[]>([]);

  useEffect(() => {
    loadRecentCrashes();

    const channel = supabase
      .channel("game_rounds_updates")
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

  const loadRecentCrashes = async () => {
    const { data, error } = await supabase
      .from("game_rounds")
      .select("crash_point")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Error loading recent crashes:", error);
      return;
    }

    if (data) {
      setRecentCrashes(data.map((r) => parseFloat(r.crash_point.toString())));
    }
  };

  return (
    <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {recentCrashes.map((crash, index) => {
        const variant =
          crash >= 10
            ? "default"
            : crash >= 5
            ? "secondary"
            : crash >= 2
            ? "outline"
            : "destructive";

        return (
          <Badge
            key={index}
            variant={variant}
            className={cn(
              "text-xs md:text-sm font-bold whitespace-nowrap px-2 py-0.5 md:px-2.5 md:py-1",
              crash >= 10 && "bg-gradient-to-r from-primary to-secondary"
            )}
          >
            {crash.toFixed(2)}x
          </Badge>
        );
      })}
    </div>
  );
};

export default RecentCrashes;