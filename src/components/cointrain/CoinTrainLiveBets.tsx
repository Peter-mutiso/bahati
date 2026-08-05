import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { Train, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveBet {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  cashed_out_at: number | null;
  profit: number | null;
  username?: string;
  avatar_url?: string;
  isSimulated?: boolean;
}

const FAKE_USERNAMES = [
  "TrainMaster", "GoldRush", "LuckyRider", "CoinKing", "RailBaron",
  "SteamPunk", "IronHorse", "TrackStar", "ExpressWin", "RailRunner",
  "CoalMiner", "GoldenTrack", "SpeedDemon", "WhistleBlower", "CargoKing",
  "SilverRail", "BronzeTicket", "DiamondCar", "PlatinumRide", "CopperLine"
];

const generateFakePlayer = (): LiveBet => {
  const statuses = ["active", "won", "lost"];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const amount = Math.floor(Math.random() * 500) + 10;
  const cashedOut = status === "won" ? (Math.random() * 5 + 1.1) : null;
  const profit = cashedOut ? amount * (cashedOut - 1) : null;

  return {
    id: `fake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    user_id: `fake-user-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    status,
    cashed_out_at: cashedOut,
    profit,
    username: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)],
    isSimulated: true,
  };
};

const CoinTrainLiveBets = () => {
  const { symbol } = useCurrency();
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [simulatedBets, setSimulatedBets] = useState<LiveBet[]>([]);

  // Generate initial simulated bets
  useEffect(() => {
    const initialFakes = Array.from({ length: 5 }, () => generateFakePlayer());
    setSimulatedBets(initialFakes);
  }, []);

  // Periodically update simulated bets
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedBets(prev => {
        const updated = [...prev];
        
        // Randomly update status of existing bets
        if (updated.length > 0 && Math.random() > 0.5) {
          const idx = Math.floor(Math.random() * updated.length);
          const bet = updated[idx];
          if (bet.status === "active") {
            const won = Math.random() > 0.4;
            bet.status = won ? "won" : "lost";
            if (won) {
              bet.cashed_out_at = Math.random() * 4 + 1.2;
              bet.profit = bet.amount * (bet.cashed_out_at - 1);
            }
          }
        }

        // Add new fake player occasionally
        if (Math.random() > 0.6 && updated.length < 12) {
          updated.unshift(generateFakePlayer());
        }

        // Remove old completed bets occasionally
        if (updated.length > 8 && Math.random() > 0.7) {
          const completedIdx = updated.findIndex(b => b.status !== "active");
          if (completedIdx !== -1) {
            updated.splice(completedIdx, 1);
          }
        }

        return updated.slice(0, 12);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const fetchLiveBets = useCallback(async () => {
    const { data: roundData } = await supabase
      .from("game_rounds")
      .select("id, status")
      .in("status", ["preparing", "running", "crashed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (roundData) {
      const { data: bets } = await supabase
        .from("bets")
        .select(`id, user_id, amount, status, cashed_out_at, profit`)
        .eq("round_id", roundData.id)
        .order("created_at", { ascending: false });

      if (bets && bets.length > 0) {
        const userIds = [...new Set(bets.map(b => b.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
        
        setLiveBets(bets.map(bet => ({
          ...bet,
          username: profileMap.get(bet.user_id)?.username || "Player",
          avatar_url: profileMap.get(bet.user_id)?.avatar_url,
        })));
      } else {
        setLiveBets([]);
      }
    } else {
      setLiveBets([]);
    }
  }, []);

  useEffect(() => {
    fetchLiveBets();

    const channel = supabase
      .channel("cointrain_live_bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" }, fetchLiveBets)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rounds" }, fetchLiveBets)
      .subscribe();

    const pollInterval = setInterval(fetchLiveBets, 2000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollInterval);
    };
  }, [fetchLiveBets]);

  // Combine real and simulated bets
  const allBets = [...liveBets, ...simulatedBets];

  const getStatusColor = (bet: LiveBet) => {
    if (bet.status === "won") return "text-emerald-400";
    if (bet.status === "lost") return "text-red-400";
    if (bet.cashed_out_at) return "text-emerald-400";
    return "text-slate-300";
  };

  return (
    <Card className="p-3 border-emerald-600/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-600/20">
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="font-semibold text-slate-100">Live Passengers</h3>
        </div>
        <span className="text-xs text-emerald-500/80 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-600/20 font-medium">
          {allBets.length} aboard
        </span>
      </div>
      
      <ScrollArea className="h-[300px] lg:h-[400px]">
        <div className="space-y-2">
          {allBets.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Waiting for passengers...</p>
            </div>
          ) : (
            allBets.map((bet) => (
              <div
                key={bet.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl transition-all",
                  bet.status === "won" ? "bg-emerald-500/10 border border-emerald-500/30" :
                  bet.status === "lost" ? "bg-red-500/10 border border-red-500/20" :
                  "bg-slate-800/50 border border-slate-700/50"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-slate-900 shadow-lg shadow-emerald-500/20">
                    {bet.username?.charAt(0).toUpperCase() || "P"}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-200 truncate max-w-[100px]">
                      {bet.username || "Player"}
                    </p>
                    <p className="text-xs text-slate-400">{symbol}{bet.amount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="text-right">
                  {bet.cashed_out_at ? (
                    <>
                      <p className={cn("text-sm font-bold", getStatusColor(bet))}>
                        {bet.cashed_out_at.toFixed(2)}x
                      </p>
                      <p className="text-xs text-emerald-400">
                        +{symbol}{(bet.profit || 0).toFixed(2)}
                      </p>
                    </>
                  ) : bet.status === "lost" ? (
                    <p className="text-sm font-bold text-red-400">Derailed</p>
                  ) : (
                    <p className="text-sm font-medium text-emerald-500 animate-pulse">On board</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </Card>
  );
};

export default CoinTrainLiveBets;