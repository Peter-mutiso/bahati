import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";

const CycleRaceWinnersBar = () => {
  const { data: recentWinners } = useQuery({
    queryKey: ["cycle-race-recent-winners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("cycling_race_races")
        .select("winner_cyclist, race_number")
        .eq("status", "finished")
        .order("finished_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: 5000
  });

  if (!recentWinners || recentWinners.length === 0) return null;

  const colors = ["#00d4ff", "#ff006e", "#ffbe0b", "#8338ec", "#3a86ff", "#06ffa5", "#ff6b35", "#f72585", "#4cc9f0", "#7209b7"];

  return (
    <div className="w-full overflow-hidden bg-card/50 backdrop-blur-sm rounded-lg border border-border/50 p-1.5 sm:p-2">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap px-1">
          Recent Winners:
        </span>
        <div className="flex gap-1 sm:gap-1.5">
          {recentWinners.map((race, index) => (
            <motion.div
              key={race.race_number}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-md flex items-center justify-center text-xs sm:text-sm font-bold"
              style={{
                backgroundColor: `${colors[race.winner_cyclist - 1]}20`,
                color: colors[race.winner_cyclist - 1],
                border: `1.5px solid ${colors[race.winner_cyclist - 1]}`
              }}
            >
              {race.winner_cyclist}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CycleRaceWinnersBar;
