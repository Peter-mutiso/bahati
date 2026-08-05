import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { History as HistoryIcon, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/hooks/useCurrency";

interface BetData {
  id: string;
  amount: number;
  profit: number | null;
  created_at: string;
  status?: string;
  difficulty?: string;
  lanes_crossed?: number;
  total_lanes?: number;
  final_multiplier?: number;
  game_type: 'chicken_road' | 'cycle_race';
  cyclist_number?: number;
  potential_payout?: number;
}

interface ChartDataPoint {
  index: number;
  profit: number;
  time: string;
}

const History = () => {
  const [bets, setBets] = useState<BetData[]>([]);
  const navigate = useNavigate();
  const { symbol } = useCurrency();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadBets(session.user.id);
    };
    checkAuth();
  }, [navigate]);

  const loadBets = async (userId: string) => {
    // Fetch chicken road bets
    const { data: chickenRoadBets } = await supabase
      .from("chicken_road_bets")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .order("created_at", { ascending: false })
      .limit(50);

    // Fetch cycle race bets
    const { data: cycleRaceBets } = await supabase
      .from("cycling_race_bets")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["won", "lost"])
      .order("created_at", { ascending: false })
      .limit(50);

    // Combine and sort all bets
    const allBets: BetData[] = [
      ...(chickenRoadBets || []).map(bet => ({ ...bet, game_type: 'chicken_road' as const })),
      ...(cycleRaceBets || []).map(bet => ({ ...bet, game_type: 'cycle_race' as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setBets(allBets);
  };

  const totalProfit = bets.reduce((sum, bet) => sum + Number(bet.profit || 0), 0);
  const totalBets = bets.length;
  const wonBets = bets.filter((bet) => bet.status === "won").length;
  const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

  // Group bets by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayBets = bets.filter(bet => new Date(bet.created_at) >= today);
  const yesterdayBets = bets.filter(bet => {
    const betDate = new Date(bet.created_at);
    return betDate >= yesterday && betDate < today;
  });
  const olderBets = bets.filter(bet => new Date(bet.created_at) < yesterday);

  // Prepare chart data
  const chartData = bets
    .slice()
    .reverse()
    .reduce((acc: ChartDataPoint[], bet, index) => {
      const prevProfit = index > 0 ? acc[index - 1].profit : 0;
      const currentProfit = prevProfit + parseFloat(String(bet.profit || 0));
      acc.push({
        index: index + 1,
        profit: currentProfit,
        time: new Date(bet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
      return acc;
    }, []);

  const renderBetGroup = (groupBets: BetData[], title: string) => {
    if (groupBets.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-muted-foreground px-1">{title}</h3>
        {groupBets.map((bet) => {
          const isWon = bet.status === "won";
          
          return (
            <div
              key={bet.id}
              className="flex justify-between items-center p-3 sm:p-4 bg-muted rounded-lg"
            >
                <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs text-muted-foreground uppercase font-semibold">
                    {bet.game_type === 'chicken_road' 
                      ? `🐔 Chicken Road (${bet.difficulty})` 
                      : `🚴 Cycle Race (Cyclist #${bet.cyclist_number})`}
                  </span>
                  {isWon ? (
                    <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4 text-destructive" />
                  )}
                </div>
                <div className="flex gap-2 sm:gap-4 text-xs sm:text-sm">
                  <span>Bet: {symbol}{Number(bet.amount).toFixed(2)}</span>
                  {bet.game_type === 'chicken_road' ? (
                    <>
                      <span className="text-primary">
                        {bet.final_multiplier ? `${Number(bet.final_multiplier).toFixed(2)}x` : 'Crashed'}
                      </span>
                      <span className="text-muted-foreground">
                        Lanes: {bet.lanes_crossed}/{bet.total_lanes}
                      </span>
                    </>
                  ) : (
                    <span className="text-primary">
                      Payout: {symbol}{Number(bet.potential_payout || 0).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p
                  className={`text-base sm:text-lg md:text-xl font-bold ${
                    isWon ? "text-success" : "text-destructive"
                  }`}
                >
                  {isWon ? "+" : ""}{symbol}{Number(bet.profit || 0).toFixed(2)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-16">
      <DesktopNav 
        isAuthenticated={true}
        onAuthRequired={() => {}}
      />
      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient flex items-center gap-2">
          <HistoryIcon className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
          Game History
        </h1>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-2 sm:p-3 md:p-4 card-shadow text-center">
            <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Total Bets</p>
            <p className="text-base sm:text-xl md:text-2xl font-bold">{totalBets}</p>
          </Card>
          <Card className="p-2 sm:p-3 md:p-4 card-shadow text-center">
            <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Win Rate</p>
            <p className="text-base sm:text-xl md:text-2xl font-bold text-success">{winRate.toFixed(1)}%</p>
          </Card>
          <Card className="p-2 sm:p-3 md:p-4 card-shadow text-center">
            <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm">Total Profit</p>
            <p
              className={`text-base sm:text-xl md:text-2xl font-bold ${
                totalProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {symbol}{totalProfit.toFixed(2)}
            </p>
          </Card>
        </div>

        {chartData.length > 0 && (
          <Card className="p-3 sm:p-4 md:p-6 card-shadow overflow-hidden">
            <h2 className="text-base sm:text-lg md:text-xl font-bold mb-3 sm:mb-4">Profit Growth</h2>
            <div className="w-full h-[150px] sm:h-[180px] md:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis 
                    dataKey="index" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 9 }}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "11px"
                    }}
                    formatter={(value: number) => [`${symbol}${value.toFixed(2)}`, "Profit"]}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="profit" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        <div className="space-y-4 sm:space-y-6">
          {renderBetGroup(todayBets, "Today")}
          {renderBetGroup(yesterdayBets, "Yesterday")}
          {renderBetGroup(olderBets, "Older")}

          {bets.length === 0 && (
            <Card className="p-6 sm:p-8 md:p-12 card-shadow text-center">
              <HistoryIcon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-muted-foreground mb-3 sm:mb-4" />
              <p className="text-muted-foreground text-sm sm:text-base">No betting history yet</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Start playing to see your history here</p>
            </Card>
          )}
        </div>
      </div>
      <BottomNav isAuthenticated={true} />
    </div>
  );
};

export default History;
