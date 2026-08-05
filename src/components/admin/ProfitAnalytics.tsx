import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, DollarSign, Users, Activity, Percent } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

const ProfitAnalytics = () => {
  const { symbol } = useCurrency();

  // Fetch Chicken Road settings for house edge
  const { data: chickenSettings } = useQuery({
    queryKey: ["chicken-road-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chicken_road_settings")
        .select("house_edge, rtp_percentage")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's Chicken Road stats
  const { data: todayStats } = useQuery({
    queryKey: ["chicken-today-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: bets, error } = await supabase
        .from("chicken_road_bets")
        .select("amount, profit, status, created_at")
        .gte("created_at", today.toISOString());

      if (error) throw error;

      const totalWagered = bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;
      const totalPaidOut = bets?.reduce((sum, bet) => sum + Math.max(0, Number(bet.profit || 0)), 0) || 0;
      const houseProfit = totalWagered - totalPaidOut;
      const betCount = bets?.length || 0;

      return { totalWagered, totalPaidOut, houseProfit, betCount };
    },
  });

  // Fetch yesterday's Chicken Road stats
  const { data: yesterdayStats } = useQuery({
    queryKey: ["chicken-yesterday-stats"],
    queryFn: async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: bets, error } = await supabase
        .from("chicken_road_bets")
        .select("amount, profit, status, created_at")
        .gte("created_at", yesterday.toISOString())
        .lt("created_at", today.toISOString());

      if (error) throw error;

      const totalWagered = bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;
      const totalPaidOut = bets?.reduce((sum, bet) => sum + Math.max(0, Number(bet.profit || 0)), 0) || 0;
      const houseProfit = totalWagered - totalPaidOut;
      const betCount = bets?.length || 0;

      return { totalWagered, totalPaidOut, houseProfit, betCount };
    },
  });

  // Fetch overall Chicken Road stats
  const { data: overallStats } = useQuery({
    queryKey: ["chicken-overall-stats"],
    queryFn: async () => {
      const { data: bets, error } = await supabase
        .from("chicken_road_bets")
        .select("amount, profit, status");

      if (error) throw error;

      const totalWagered = bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;
      const totalPaidOut = bets?.reduce((sum, bet) => sum + Math.max(0, Number(bet.profit || 0)), 0) || 0;
      const houseProfit = totalWagered - totalPaidOut;
      const betCount = bets?.length || 0;

      return { totalWagered, totalPaidOut, houseProfit, betCount };
    },
  });

  // Fetch last 7 days chart data
  const { data: chartData } = useQuery({
    queryKey: ["chicken-chart-data"],
    queryFn: async () => {
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        return date;
      }).reverse();

      const data = await Promise.all(
        last7Days.map(async (date) => {
          const nextDay = new Date(date);
          nextDay.setDate(nextDay.getDate() + 1);

          const { data: bets } = await supabase
            .from("chicken_road_bets")
            .select("amount, profit")
            .gte("created_at", date.toISOString())
            .lt("created_at", nextDay.toISOString());

          const totalWagered = bets?.reduce((sum, bet) => sum + Number(bet.amount), 0) || 0;
          const totalPaidOut = bets?.reduce((sum, bet) => sum + Math.max(0, Number(bet.profit || 0)), 0) || 0;
          const houseProfit = totalWagered - totalPaidOut;
          const betCount = bets?.length || 0;

          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            wagered: totalWagered,
            profit: houseProfit,
            bets: betCount,
          };
        })
      );

      return data;
    },
  });

  const StatCard = ({ title, value, icon: Icon, description, isCurrency = true }: any) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${value < 0 ? 'text-destructive' : ''}`}>
          {isCurrency ? `${symbol}${Math.abs(value || 0).toFixed(2)}` : value || "0"}
          {value < 0 && isCurrency ? ' (Loss)' : ''}
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🐔</span>
            Chicken Road Analytics
          </CardTitle>
          <CardDescription>Game performance and profit statistics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">House Edge:</span>
              <span className="font-semibold">{chickenSettings?.house_edge || 5}%</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">RTP:</span>
              <span className="font-semibold">{chickenSettings?.rtp_percentage || 95}%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="yesterday">Yesterday</TabsTrigger>
          <TabsTrigger value="overall">Overall</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Wagered"
              value={todayStats?.totalWagered}
              icon={DollarSign}
              description="Bets placed today"
            />
            <StatCard
              title="Total Paid Out"
              value={todayStats?.totalPaidOut}
              icon={TrendingUp}
              description="Player winnings today"
            />
            <StatCard
              title="House P/L"
              value={todayStats?.houseProfit}
              icon={Activity}
              description="Net profit/loss today"
            />
            <StatCard
              title="Total Bets"
              value={todayStats?.betCount}
              icon={Users}
              description="Number of bets today"
              isCurrency={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="yesterday" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Wagered"
              value={yesterdayStats?.totalWagered}
              icon={DollarSign}
              description="Bets placed yesterday"
            />
            <StatCard
              title="Total Paid Out"
              value={yesterdayStats?.totalPaidOut}
              icon={TrendingUp}
              description="Player winnings yesterday"
            />
            <StatCard
              title="House P/L"
              value={yesterdayStats?.houseProfit}
              icon={Activity}
              description="Net profit/loss yesterday"
            />
            <StatCard
              title="Total Bets"
              value={yesterdayStats?.betCount}
              icon={Users}
              description="Number of bets yesterday"
              isCurrency={false}
            />
          </div>
        </TabsContent>

        <TabsContent value="overall" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              title="Total Wagered"
              value={overallStats?.totalWagered}
              icon={DollarSign}
              description="All time bets"
            />
            <StatCard
              title="Total Paid Out"
              value={overallStats?.totalPaidOut}
              icon={TrendingUp}
              description="All time payouts"
            />
            <StatCard
              title="House P/L"
              value={overallStats?.houseProfit}
              icon={Activity}
              description="All time profit/loss"
            />
            <StatCard
              title="Total Bets"
              value={overallStats?.betCount}
              icon={Users}
              description="All time bet count"
              isCurrency={false}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Last 7 Days Performance</CardTitle>
          <CardDescription>Wagered amount and house profit over the last 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: number, name: string) => [
                  `${symbol}${value.toFixed(2)}`,
                  name === 'wagered' ? 'Wagered' : 'House P/L'
                ]}
              />
              <Line type="monotone" dataKey="wagered" stroke="hsl(var(--primary))" name="Wagered" strokeWidth={2} />
              <Line type="monotone" dataKey="profit" stroke="hsl(var(--chart-2))" name="House P/L" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitAnalytics;
