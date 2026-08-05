import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { Train } from "lucide-react";
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

interface CoinTrainBetHistoryProps {
  userId: string;
}

const CoinTrainBetHistory = ({ userId }: CoinTrainBetHistoryProps) => {
  const { symbol } = useCurrency();
  const [history, setHistory] = useState<BetHistoryItem[]>([]);

  useEffect(() => {
    if (!userId) return;

    const fetchHistory = async () => {
      const { data } = await supabase
        .from("bets")
        .select(`
          id,
          amount,
          status,
          cashed_out_at,
          profit,
          created_at,
          game_rounds!inner(crash_point)
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setHistory(data.map((bet: any) => ({
          ...bet,
          crash_point: bet.game_rounds?.crash_point,
        })));
      }
    };

    fetchHistory();

    const channel = supabase
      .channel("cointrain_bet_history")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bets",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  if (!userId) {
    return (
      <Card className="p-4 border-emerald-600/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm">
        <div className="text-center py-8 text-slate-500">
          <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Sign in to view your journey history</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 border-emerald-600/20 bg-gradient-to-b from-slate-800/80 to-slate-900/80 backdrop-blur-sm shadow-xl">
      <ScrollArea className="h-[250px]">
        <div className="space-y-2">
          {history.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Train className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No journeys yet. Board the train!</p>
            </div>
          ) : (
            history.map((bet) => (
              <div
                key={bet.id}
                className={cn(
                  "flex items-center justify-between p-2.5 rounded-xl",
                  bet.status === "won" ? "bg-emerald-500/10 border border-emerald-500/30" :
                  bet.status === "lost" ? "bg-red-500/10 border border-red-500/20" :
                  "bg-slate-800/50 border border-slate-700/50"
                )}
              >
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    {symbol}{bet.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-slate-400">
                    Derailed @ {bet.crash_point?.toFixed(2)}x
                  </p>
                </div>
                <div className="text-right">
                  {bet.cashed_out_at ? (
                    <>
                      <p className="text-sm font-bold text-emerald-400">
                        {bet.cashed_out_at.toFixed(2)}x
                      </p>
                      <p className="text-xs text-emerald-400">
                        +{symbol}{(bet.profit || 0).toFixed(2)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-red-400">
                      -{symbol}{bet.amount.toFixed(2)}
                    </p>
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

export default CoinTrainBetHistory;