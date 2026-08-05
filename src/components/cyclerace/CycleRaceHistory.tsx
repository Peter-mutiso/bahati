import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CycleRaceHistory = () => {
  const { data: recentRaces } = useQuery({
    queryKey: ["recent-cycle-races"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cycling_race_races")
        .select("*")
        .eq("status", "finished")
        .order("finished_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    refetchInterval: 5000
  });

  return (
    <Card className="p-4 bg-card/50 backdrop-blur-lg border-border/50">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="text-sm font-semibold">Recent Winners</h3>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {recentRaces && recentRaces.length > 0 ? (
          recentRaces.map((race) => (
            <div
              key={race.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-accent/5 transition-colors cursor-pointer"
            >
              <Avatar className="w-10 h-10 border-2 border-yellow-500/50">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                  {race.winner_cyclist}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  Cyclist #{race.winner_cyclist}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {race.finished_at &&
                    formatDistanceToNow(new Date(race.finished_at), {
                      addSuffix: true
                    })}
                </div>
              </div>

              <Badge
                variant="default"
                className="bg-gradient-to-r from-yellow-400 to-yellow-600 shrink-0"
              >
                Race #{race.race_number}
              </Badge>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            No races completed yet
          </p>
        )}
      </div>
    </Card>
  );
};

export default CycleRaceHistory;
