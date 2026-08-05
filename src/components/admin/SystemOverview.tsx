import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Wallet, TrendingUp, ArrowDownCircle, ArrowUpCircle, Dices, RotateCw, Bitcoin, Search } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

const SystemOverview = () => {
  const { symbol } = useCurrency();
  const { tenantEq, activeSite } = useActiveSite();
  const [betSearch, setBetSearch] = useState("");
  const [betPerPage, setBetPerPage] = useState("10");
  const [txnSearch, setTxnSearch] = useState("");
  const [txnPerPage, setTxnPerPage] = useState("5");
  const [btcRate, setBtcRate] = useState<number>(100000);
  const [currencyRate, setCurrencyRate] = useState<number>(129); // Default for KES/KSH

  // Fetch live rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data: settings } = await supabase
          .from("game_settings")
          .select("currency_name")
          .single();
        
        if (settings?.currency_name) {
          const { data, error } = await supabase.functions.invoke('get-currency-rate', {
            body: { currency: settings.currency_name }
          });
          
          if (!error && data) {
            setCurrencyRate(data.rate || 1);
            setBtcRate(data.btcRate || 100000);
          }
        }
      } catch (error) {
        console.error("Error fetching rates:", error);
      }
    };
    fetchRates();
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats", activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      // Build base queries scoped to selected site
      const applyFilter = (q: any) => tenantEq ? q.eq(tenantEq[0], tenantEq[1]) : q;

      // Get total users
      const { count: totalUsers } = await applyFilter(
        supabase.from("profiles").select("*", { count: "exact", head: true })
      );

      // Get total wallets balance (cash + bonus)
      const { data: wallets } = await applyFilter(
        supabase.from("wallets").select("wallet_cash, wallet_bonus")
      );
      
      const totalUserWallet = wallets?.reduce((sum, w) => sum + Number(w.wallet_cash) + Number(w.wallet_bonus), 0) || 0;

      // Get total deposits (completed)
      const { data: deposits } = await applyFilter(
        supabase.from("transactions").select("amount, payment_method").eq("type", "deposit").eq("status", "completed")
      );
      
      const totalDeposits = deposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const btcDeposits = deposits?.filter(t => t.payment_method?.toLowerCase().includes('btc'))
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get total withdrawals (completed)
      const { data: withdrawals } = await applyFilter(
        supabase.from("transactions").select("amount, payment_method").eq("type", "withdrawal").eq("status", "completed")
      );
      
      const totalWithdrawals = withdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const btcWithdrawals = withdrawals?.filter(t => t.payment_method?.toLowerCase().includes('btc'))
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Get Chicken Road bets stats
      const { data: chickenBets } = await applyFilter(
        supabase.from("chicken_road_bets").select("amount, profit, status").in("status", ["won", "lost"])
      );

      const chickenWagered = chickenBets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const chickenPayouts = chickenBets?.filter(b => b.status === "won")
        .reduce((sum, b) => sum + Number(b.amount) + Number(b.profit || 0), 0) || 0;

      // Get Cycle Race bets stats
      const { data: cycleBets } = await applyFilter(
        supabase.from("cycling_race_bets").select("amount, profit, status").in("status", ["won", "lost"])
      );

      const cycleWagered = cycleBets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0;
      const cyclePayouts = cycleBets?.filter(b => b.status === "won")
        .reduce((sum, b) => sum + Number(b.amount) + Number(b.profit || 0), 0) || 0;

      // Total bets count
      const totalBets = (chickenBets?.length || 0) + (cycleBets?.length || 0);
      const totalRounds = totalBets;

      // Calculate GGR = Total Wagered - Total Payouts
      const totalWagered = chickenWagered + cycleWagered;
      const totalPayouts = chickenPayouts + cyclePayouts;
      const ggr = totalWagered - totalPayouts;

      return {
        totalUsers: totalUsers || 0,
        totalUserWallet,
        totalDeposits,
        totalWithdrawals,
        ggr,
        totalBets,
        totalRounds,
        btcDeposits,
        btcWithdrawals,
      };
    },
  });
  
  // Calculate BTC values
  const btcDepositsValue = stats?.btcDeposits ? (stats.btcDeposits / (btcRate * currencyRate)).toFixed(8) : "0";
  const btcWithdrawalsValue = stats?.btcWithdrawals ? (stats.btcWithdrawals / (btcRate * currencyRate)).toFixed(8) : "0";

  // Latest bets query (Chicken Road + Cycle Race)
  const { data: latestBets } = useQuery({
    queryKey: ["latest-bets", betPerPage, activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      const applyFilter = (q: any) => tenantEq ? q.eq(tenantEq[0], tenantEq[1]) : q;

      // Fetch Chicken Road bets
      const { data: chickenBets } = await applyFilter(
        supabase.from("chicken_road_bets")
          .select("id, user_id, amount, status, profit, created_at")
          .in("status", ["won", "lost"])
          .order("created_at", { ascending: false })
          .limit(parseInt(betPerPage))
      );

      // Fetch Cycle Race bets
      const { data: cycleBets } = await applyFilter(
        supabase.from("cycling_race_bets")
          .select("id, user_id, amount, status, profit, created_at")
          .in("status", ["won", "lost"])
          .order("created_at", { ascending: false })
          .limit(parseInt(betPerPage))
      );

      // Combine and sort by created_at
      const allBets = [
        ...(chickenBets || []).map(b => ({ ...b, game: "Chicken" })),
        ...(cycleBets || []).map(b => ({ ...b, game: "Cycle" }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, parseInt(betPerPage));

      // Get usernames for the bets
      if (allBets.length > 0) {
        const userIds = [...new Set(allBets.map(b => b.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);

        return allBets.map(bet => ({
          ...bet,
          username: profiles?.find(p => p.id === bet.user_id)?.username || "Unknown"
        }));
      }
      return [];
    },
  });

  // Latest transactions query
  const { data: latestTransactions } = useQuery({
    queryKey: ["latest-transactions", txnPerPage, activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      const applyFilter = (q: any) => tenantEq ? q.eq(tenantEq[0], tenantEq[1]) : q;

      const { data: txns } = await applyFilter(
        supabase.from("transactions")
          .select("id, user_id, type, amount, created_at")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(parseInt(txnPerPage))
      );

      // Get usernames for the transactions
      if (txns && txns.length > 0) {
        const userIds = [...new Set(txns.map((t: any) => t.user_id as string))] as string[];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username")
          .in("id", userIds);

        return txns.map(txn => ({
          ...txn,
          username: profiles?.find(p => p.id === txn.user_id)?.username || "Unknown"
        }));
      }
      return [];
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  const statCards = [
    {
      title: "GGR",
      value: `${symbol}${stats?.ggr.toFixed(2) || 0}`,
      icon: TrendingUp,
      description: "Gross Gaming Revenue",
      color: stats?.ggr && stats.ggr >= 0 ? "text-green-500" : "text-red-500",
      bgColor: stats?.ggr && stats.ggr >= 0 ? "bg-green-500/10" : "bg-red-500/10",
    },
    {
      title: "Total Deposits",
      value: `${symbol}${stats?.totalDeposits.toFixed(2) || 0}`,
      icon: ArrowDownCircle,
      description: "All completed deposits",
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Total Withdrawals",
      value: `${symbol}${stats?.totalWithdrawals.toFixed(2) || 0}`,
      icon: ArrowUpCircle,
      description: "All completed withdrawals",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10",
    },
    {
      title: "Total User Wallet",
      value: `${symbol}${stats?.totalUserWallet.toFixed(2) || 0}`,
      icon: Wallet,
      description: "Cash + Bonus",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      description: "Registered users",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "Total Bets",
      value: stats?.totalBets || 0,
      icon: Dices,
      description: "All bets placed",
      color: "text-cyan-500",
      bgColor: "bg-cyan-500/10",
    },
    {
      title: "Total Rounds",
      value: stats?.totalRounds || 0,
      icon: RotateCw,
      description: "Completed rounds",
      color: "text-pink-500",
      bgColor: "bg-pink-500/10",
    },
    {
      title: "BTC Deposits",
      value: `${symbol}${stats?.btcDeposits.toFixed(2) || 0}`,
      subValue: `≈ ${btcDepositsValue} BTC`,
      icon: Bitcoin,
      description: "Bitcoin deposits",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "BTC Withdrawals",
      value: `${symbol}${stats?.btcWithdrawals.toFixed(2) || 0}`,
      subValue: `≈ ${btcWithdrawalsValue} BTC`,
      icon: Bitcoin,
      description: "Bitcoin withdrawals",
      color: "text-amber-600",
      bgColor: "bg-amber-600/10",
    },
  ];

  const filteredBets = latestBets?.filter(bet => 
    bet.id.toLowerCase().includes(betSearch.toLowerCase()) ||
    bet.username.toLowerCase().includes(betSearch.toLowerCase()) ||
    bet.amount.toString().includes(betSearch) ||
    bet.status.toLowerCase().includes(betSearch.toLowerCase())
  ) || [];

  const filteredTransactions = latestTransactions?.filter(txn =>
    txn.id.toLowerCase().includes(txnSearch.toLowerCase()) ||
    txn.username.toLowerCase().includes(txnSearch.toLowerCase()) ||
    txn.type.toLowerCase().includes(txnSearch.toLowerCase()) ||
    txn.amount.toString().includes(txnSearch)
  ) || [];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards - Responsive Grid */}
      <div className="grid gap-2 sm:gap-3 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {statCards.map((stat, index) => (
          <Card key={index} className={`${stat.bgColor} border-0`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 sm:pb-2 p-2 sm:p-3 md:p-4">
              <CardTitle className="text-[10px] sm:text-xs md:text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 flex-shrink-0 ${stat.color}`} />
            </CardHeader>
            <CardContent className="p-2 sm:p-3 md:p-4 pt-0">
              <div className={`text-sm sm:text-lg md:text-xl lg:text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.subValue && (
                <div className="text-[9px] sm:text-xs md:text-sm font-medium text-amber-400">{stat.subValue}</div>
              )}
              <p className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Latest Bets and Transactions Tables - Stack on mobile */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Latest Bets */}
        <Card className="border-border/50">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Latest Bets</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Recent player activity</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={betSearch}
                  onChange={(e) => setBetSearch(e.target.value)}
                  className="pl-9 bg-background/50 text-sm"
                />
              </div>
              <Select value={betPerPage} onValueChange={setBetPerPage}>
                <SelectTrigger className="w-full sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">ID</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">User</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Result</TableHead>
                  <TableHead className="text-xs whitespace-nowrap hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBets.map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell className="font-mono text-[10px] sm:text-xs">#{bet.id.slice(0, 4)}</TableCell>
                    <TableCell className="text-xs sm:text-sm max-w-[60px] sm:max-w-none truncate">{bet.username}</TableCell>
                    <TableCell className="text-xs sm:text-sm">{symbol}{Number(bet.amount).toFixed(0)}</TableCell>
                    <TableCell>
                      <span className={`text-xs sm:text-sm font-medium ${bet.status === "won" ? "text-green-500" : "text-red-500"}`}>
                        {bet.status === "won" 
                          ? `+${symbol}${Number(bet.profit || bet.amount).toFixed(0)}` 
                          : `-${symbol}${Number(bet.amount).toFixed(0)}`}
                      </span>
                    </TableCell>
                    <TableCell className="text-[10px] sm:text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {format(new Date(bet.created_at), "MMM dd, hh:mm")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredBets.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                      No bets found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Latest Transactions */}
        <Card className="border-border/50">
          <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Latest Transactions</CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground">Recent financial activity</p>
            <div className="flex flex-col sm:flex-row gap-2 mt-2 sm:mt-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="pl-9 bg-background/50 text-sm"
                />
              </div>
              <Select value={txnPerPage} onValueChange={setTxnPerPage}>
                <SelectTrigger className="w-full sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">User</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Type</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs whitespace-nowrap hidden sm:table-cell">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="text-xs sm:text-sm max-w-[80px] sm:max-w-none truncate">{txn.username}</TableCell>
                    <TableCell>
                      <span className={`text-xs sm:text-sm ${txn.type === "deposit" ? "text-green-500" : "text-red-500"}`}>
                        {txn.type === "deposit" ? "D" : "W"}
                      </span>
                    </TableCell>
                    <TableCell className={`text-xs sm:text-sm ${txn.type === "deposit" ? "text-green-500" : "text-red-500"}`}>
                      {txn.type === "withdrawal" ? "-" : ""}{symbol}{Number(txn.amount).toFixed(0)}
                    </TableCell>
                    <TableCell className="text-[10px] sm:text-xs text-muted-foreground hidden sm:table-cell whitespace-nowrap">
                      {format(new Date(txn.created_at), "MMM dd, hh:mm")}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6 sm:py-8 text-xs sm:text-sm">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemOverview;
