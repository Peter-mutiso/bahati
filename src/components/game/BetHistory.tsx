import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";

interface Bet {
  id: string;
  amount: number;
  cashed_out_at: number | null;
  profit: number | null;
  status: string;
  created_at: string;
}

interface BetHistoryProps {
  userId: string;
}

const BetHistory = ({ userId }: BetHistoryProps) => {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const { symbol } = useCurrency();

  useEffect(() => {
    loadBetHistory();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('bet_history')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bets',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          loadBetHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadBetHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setBets(data || []);
    } catch (error) {
      console.error('Error loading bet history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Card className="p-3 sm:p-4 card-shadow">
        <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">Bet History</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-3 sm:p-4 card-shadow">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-base sm:text-lg font-bold">Bet History</h3>
        <Clock className="w-4 h-4 text-muted-foreground" />
      </div>

      <ScrollArea className="h-[400px] pr-4">
        {bets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm sm:text-base">No bets yet</p>
            <p className="text-xs sm:text-sm mt-2">Start playing to see your history!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bets.map((bet) => {
              const isWin = bet.status === 'won' || (bet.cashed_out_at && bet.profit && bet.profit > 0);
              const multiplier = bet.cashed_out_at || 0;
              const profit = bet.profit || 0;

              return (
                <div
                  key={bet.id}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    isWin
                      ? "bg-success/10 border-success/20"
                      : "bg-destructive/10 border-destructive/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {isWin ? (
                        <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                      ) : (
                        <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                      )}
                      <span className="font-semibold text-sm sm:text-base">
                        {symbol}{bet.amount}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatTime(bet.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {bet.cashed_out_at ? (
                      <span className="text-xs sm:text-sm font-medium">
                        {multiplier.toFixed(2)}x
                      </span>
                    ) : (
                      <span className="text-xs sm:text-sm text-muted-foreground">
                        Crashed
                      </span>
                    )}
                    {(bet.status === 'lost' || (bet.status === 'active' && !bet.cashed_out_at)) && (
                      <span className="text-[10px] sm:text-xs bg-destructive/20 text-destructive px-1.5 sm:px-2 py-0.5 rounded">
                        Lost
                      </span>
                    )}
                  </div>
                    <span
                      className={cn(
                        "font-bold text-sm sm:text-base",
                        isWin ? "text-success" : "text-destructive"
                      )}
                    >
                      {isWin ? '+' : ''}{symbol}{profit.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};

export default BetHistory;
