import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { Diamond, Bomb } from "lucide-react";

interface MinesHistoryProps {
  userId?: string;
}

export const MinesHistory = ({ userId }: MinesHistoryProps) => {
  const { formatCurrency } = useCurrency();

  const { data: bets = [] } = useQuery({
    queryKey: ["mines-bets", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("mines_bets")
        .select("*")
        .eq("user_id", userId)
        .in("status", ["cashed_out", "busted"])
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  return (
    <Card className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Diamond className="w-5 h-5 text-primary" />
          My Bets
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative z-10">
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {bets.length === 0 ? (
            <div className="text-center py-12">
              <Diamond className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No bets yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start playing to see your history</p>
            </div>
          ) : (
            bets.map((bet: any) => (
              <div
                key={bet.id}
                className={`
                  relative p-3 rounded-xl transition-all duration-300
                  border-2 hover:shadow-lg
                  ${bet.status === 'cashed_out'
                    ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-400/5 border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30 hover:border-destructive/50 hover:shadow-destructive/20'
                  }
                `}
              >
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl" />
                
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${bet.status === 'cashed_out'
                        ? 'bg-emerald-500/20 ring-2 ring-emerald-500/30'
                        : 'bg-destructive/20 ring-2 ring-destructive/30'
                      }
                    `}>
                      {bet.status === 'cashed_out' ? (
                        <Diamond className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Bomb className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {bet.mines_count} Mines
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bet.tiles_revealed?.length || 0} gems found
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className={`
                      text-base font-bold
                      ${bet.profit >= 0 ? 'text-emerald-400' : 'text-destructive'}
                    `}>
                      {bet.profit >= 0 ? '+' : ''}{formatCurrency(bet.profit)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bet.final_multiplier?.toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
