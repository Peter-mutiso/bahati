import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface BetHistoryItem {
  id: string;
  amount: number;
  status: string;
  cashed_out_at: number | null;
  profit: number | null;
  created_at: string;
  crash_point?: number;
}

interface AviatorBetHistoryProps {
  userId: string;
}

const AviatorBetHistory = ({ userId }: AviatorBetHistoryProps) => {
  const { symbol } = useCurrency();
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchBets = async () => {
      const { data: roundsData } = await supabase
        .from("game_rounds")
        .select("id, crash_point")
        .eq("game_type", "aviator");

      const roundMap = new Map(roundsData?.map(r => [r.id, r.crash_point]) || []);

      const { data, error } = await supabase
        .from("bets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!error && data) {
        const aviatorBets = data.filter(bet => roundMap.has(bet.round_id));
        setBets(aviatorBets.map(bet => ({
          ...bet,
          crash_point: roundMap.get(bet.round_id),
        })));
      }
      setIsLoading(false);
    };

    fetchBets();

    const channel = supabase
      .channel("aviator_user_bets")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bets",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchBets()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!userId) {
    return (
      <Card className="p-4 border-red-900/30 bg-gradient-to-b from-slate-800/80 to-red-950/20">
        <div className="text-center py-8 text-slate-400">
          Sign in to see your bet history
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-4 border-red-900/30 bg-gradient-to-b from-slate-800/80 to-red-950/20">
        <div className="text-center py-8 text-slate-400">
          Loading history...
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-red-900/30 bg-gradient-to-b from-slate-800/80 to-red-950/20">
      <h3 className="text-sm font-semibold text-red-100 mb-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-red-400" />
        My Aviator History
      </h3>
      <ScrollArea className="h-[300px]">
        {bets.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            No bets yet. Place your first bet!
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => (
              <div
                key={bet.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg",
                  bet.status === "won"
                    ? "bg-green-500/10 border border-green-500/30"
                    : bet.status === "lost"
                    ? "bg-red-500/10 border border-red-500/30"
                    : "bg-slate-800/50 border border-red-900/30"
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      bet.status === "won"
                        ? "bg-green-500/20"
                        : bet.status === "lost"
                        ? "bg-red-500/20"
                        : "bg-slate-700"
                    )}
                  >
                    {bet.status === "won" ? (
                      <TrendingUp className="w-4 h-4 text-green-400" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-100">
                      {symbol}{bet.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(bet.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {bet.cashed_out_at ? (
                    <>
                      <p className="text-sm font-bold text-green-400">
                        {bet.cashed_out_at.toFixed(2)}x
                      </p>
                      <p className="text-xs text-green-400">
                        +{symbol}{(bet.profit || 0).toFixed(2)}
                      </p>
                    </>
                  ) : bet.status === "lost" ? (
                    <>
                      <p className="text-sm font-bold text-red-400">
                        {bet.crash_point?.toFixed(2)}x
                      </p>
                      <p className="text-xs text-red-400">
                        -{symbol}{bet.amount.toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-400">Pending</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default AviatorBetHistory;