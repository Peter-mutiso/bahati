import { useMarketerCheck } from "@/hooks/useMarketerCheck";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, DollarSign, TrendingUp, Wallet, LogOut,
  ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from "recharts";
import { Bike, Plane, Drumstick, Train, FlipHorizontal, Circle, Bomb, Eye, Settings } from "lucide-react";
import { formatNairobiTime, formatNairobiDate, formatNairobiDateTime } from "@/lib/utils";

interface UserRow {
  id: string;
  username: string | null;
  created_at: string;
  total_deposited: number;
}

interface TransactionRow {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  payment_method: string | null;
  created_at: string;
  username?: string | null;
}

interface WithdrawalRow {
  id: string;
  amount: number;
  status: string;
  payment_method: string | null;
  payment_details: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface GameAssignment {
  game_slug: string;
}

interface UpcomingResult {
  id: string;
  game_slug: string;
  result: string | number;
  time: string;
  status: string;
}

const MarketerDashboard = () => {
  const { isMarketer, isLoading, marketerId, assignedTenantId } = useMarketerCheck();
  const navigate = useNavigate();

  const [revenueSharePct, setRevenueSharePct] = useState(25);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [dailyData, setDailyData] = useState<{ date: string; deposits: number; earnings: number }[]>([]);
  const [gameAssignments, setGameAssignments] = useState<GameAssignment[]>([]);
  const [upcomingResults, setUpcomingResults] = useState<UpcomingResult[]>([]);
  const [liveCoinFlip, setLiveCoinFlip] = useState<{
    status: string;
    headsTotal: number;
    tailsTotal: number;
    favoredSide: "heads" | "tails" | null;
  } | null>(null);
  const [liveCycleRace, setLiveCycleRace] = useState<{
    raceNumber: number;
    status: string;
    winnerCyclist: number;
  } | null>(null);

  // Withdraw form
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDetails, setWithdrawDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Marketer sees (real × share%) as the deposit.
  // Marketer earns share% of what they see.
  // e.g. share=25%: user deposits KES 10 → marketer sees KES 2.50 → marketer earns 25% of 2.50 = KES 0.625
  const visibleAmount = (realAmount: number) => +(realAmount * revenueSharePct / 100).toFixed(2);
  const earnings = (visibleAmt: number) => +(visibleAmt * revenueSharePct / 100).toFixed(2);

  const totalVisibleDeposits = transactions.reduce((s, t) => s + visibleAmount(t.amount), 0);
  const totalEarnings = +(transactions.reduce((s, t) => s + earnings(visibleAmount(t.amount)), 0)).toFixed(2);
  const paidOut = withdrawals
    .filter(w => w.status === "approved")
    .reduce((s, w) => s + w.amount, 0);
  const pendingWithdrawals = withdrawals
    .filter(w => w.status === "pending")
    .reduce((s, w) => s + w.amount, 0);
  const availableBalance = +(totalEarnings - paidOut - pendingWithdrawals).toFixed(2);

  useEffect(() => {
    if (!isMarketer || !assignedTenantId) return;
    loadData();

    // Polling fallback in case realtime events don't fire (e.g. publication/RLS gaps)
    const pollInterval = window.setInterval(loadData, 4000);

    // Real-time: refresh results when a cycle race starts or finishes
    const racesSub = supabase
      .channel("marketer-races")
      .on("postgres_changes", { event: "*", schema: "public", table: "cycling_race_races" }, () => {
        loadData();
      })
      .subscribe();

    // Real-time: refresh results when a crash round finishes
    const roundsSub = supabase
      .channel("marketer-rounds")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_rounds" }, () => {
        loadData();
      })
      .subscribe();

    // Real-time: refresh results when a coin flip round starts, completes, or gets new bets
    const coinFlipSub = supabase
      .channel("marketer-coin-flip")
      .on("postgres_changes", { event: "*", schema: "public", table: "coin_flip_rounds" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coin_flip_bets" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      window.clearInterval(pollInterval);
      supabase.removeChannel(racesSub);
      supabase.removeChannel(roundsSub);
      supabase.removeChannel(coinFlipSub);
    };
  }, [isMarketer, assignedTenantId]);

  const loadData = async () => {
    // Revenue share %
    const { data: settings } = await supabase
      .from("marketer_settings")
      .select("revenue_share_percent")
      .single();
    if (settings) setRevenueSharePct(Number(settings.revenue_share_percent));

    // Users on this site (username only — no email/phone)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, created_at, total_deposited")
      .eq("tenant_id", assignedTenantId)
      .order("created_at", { ascending: false });
    setUsers(profileData ?? []);

    // Completed deposit transactions for this site
    const { data: txData } = await supabase
      .from("transactions")
      .select("id, user_id, amount, type, status, payment_method, created_at")
      .eq("tenant_id", assignedTenantId)
      .eq("type", "deposit")
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (txData) {
      // Map username from users
      const usersMap = Object.fromEntries((profileData ?? []).map(u => [u.id, u.username]));
      setTransactions(txData.map(t => ({ ...t, username: usersMap[t.user_id] ?? null })));

      // Build daily chart data (last 30 days)
      const days: Record<string, { deposits: number; earnings: number }> = {};
      const now = Date.now();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = formatNairobiDate(d);
        days[key] = { deposits: 0, earnings: 0 };
      }
      const share = settings ? Number(settings.revenue_share_percent) / 100 : 0.25;
      for (const t of txData) {
        const key = formatNairobiDate(t.created_at);
        if (days[key]) {
          const vis = t.amount * share;       // visible deposit = real × share%
          days[key].deposits += vis;
          days[key].earnings += vis * share;  // earnings = share% of visible
        }
      }
      setDailyData(
        Object.entries(days).map(([date, v]) => ({
          date,
          deposits: +v.deposits.toFixed(2),
          earnings: +v.earnings.toFixed(2),
        }))
      );
    }

    // My withdrawals
    if (marketerId) {
      const { data: wdData } = await supabase
        .from("marketer_withdrawals")
        .select("*")
        .eq("marketer_id", marketerId)
        .order("created_at", { ascending: false });
      setWithdrawals(wdData ?? []);

      // Game assignments
      const { data: assignments } = await supabase
        .from("marketer_game_assignments")
        .select("game_slug")
        .eq("marketer_id", marketerId);
      setGameAssignments(assignments ?? []);

      if (assignments && assignments.length > 0) {
        const slugs = assignments.map(a => a.game_slug);
        const results: UpcomingResult[] = [];

        // Fetch recent finished Cycle Races (no tenant_id column on this table)
        if (slugs.includes("cycling-race")) {
          const { data: races } = await supabase
            .from("cycling_race_races")
            .select("id, winner_cyclist, created_at, status, race_number")
            .eq("status", "finished")
            .order("created_at", { ascending: false })
            .limit(10);

          races?.forEach(r => {
            results.push({
              id: r.id,
              game_slug: "cycling-race",
              result: r.winner_cyclist != null ? `Cyclist #${r.winner_cyclist}` : "—",
              time: r.created_at,
              status: r.status,
            });
          });

          // Cycle Race decides its winner the moment the race is created, before betting
          // even opens — so the current/upcoming race's outcome is already knowable.
          const { data: activeRace } = await supabase
            .from("cycling_race_races")
            .select("race_number, status, winner_cyclist")
            .in("status", ["preparing", "betting", "locking", "racing"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          setLiveCycleRace(
            activeRace && activeRace.winner_cyclist != null
              ? { raceNumber: activeRace.race_number, status: activeRace.status, winnerCyclist: activeRace.winner_cyclist }
              : null
          );
        }

        // Fetch recent completed Coin Flip rounds
        if (slugs.includes("coin-flip")) {
          const { data: flips } = await supabase
            .from("coin_flip_rounds")
            .select("id, round_number, result, created_at, status")
            .eq("status", "completed")
            .order("created_at", { ascending: false })
            .limit(10);

          flips?.forEach(f => {
            results.push({
              id: f.id,
              game_slug: "coin-flip",
              result: f.result != null ? f.result : "—",
              time: f.created_at,
              status: f.status,
            });
          });

          // Live forecast for the round currently in progress (result isn't decided until it resolves)
          const { data: activeFlip } = await supabase
            .from("coin_flip_rounds")
            .select("id, status")
            .in("status", ["betting", "flipping"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (activeFlip) {
            const { data: flipBets } = await supabase
              .from("coin_flip_bets")
              .select("side, amount")
              .eq("round_id", activeFlip.id);

            const headsTotal = (flipBets || []).filter(b => b.side === "heads").reduce((s, b) => s + b.amount, 0);
            const tailsTotal = (flipBets || []).filter(b => b.side === "tails").reduce((s, b) => s + b.amount, 0);

            let favoredSide: "heads" | "tails" | null = null;
            if (headsTotal > 0 || tailsTotal > 0) {
              const headsLoss = headsTotal * 1.95 - tailsTotal;
              const tailsLoss = tailsTotal * 1.95 - headsTotal;
              favoredSide = headsLoss < tailsLoss ? "heads" : "tails";
            }

            setLiveCoinFlip({ status: activeFlip.status, headsTotal, tailsTotal, favoredSide });
          } else {
            setLiveCoinFlip(null);
          }
        }

        // Fetch recent finished game rounds for crash-type games (no tenant_id on this table)
        if (slugs.includes("aviator") || slugs.includes("chicken-road") || slugs.includes("coin-train")) {
          const { data: rounds } = await supabase
            .from("game_rounds")
            .select("id, crash_point, created_at, status, game_type")
            .eq("status", "crashed")
            .order("created_at", { ascending: false })
            .limit(20);

          rounds?.forEach(r => {
            const gt = r.game_type ?? "aviator";
            if (slugs.includes(gt)) {
              results.push({
                id: r.id,
                game_slug: gt,
                result: `${r.crash_point}x`,
                time: r.created_at,
                status: "finished",
              });
            }
          });
        }

        setUpcomingResults(results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()));
      }
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (amt > availableBalance) { toast.error(`Cannot withdraw more than available balance (${availableBalance})`); return; }
    if (!withdrawDetails.trim()) { toast.error("Enter your M-Pesa phone number"); return; }
    if (!marketerId) return;

    setSubmitting(true);
    const { error } = await supabase.from("marketer_withdrawals").insert({
      marketer_id: marketerId,
      amount: amt,
      payment_method: "mpesa",
      payment_details: withdrawDetails.trim(),
      status: "approved",
    });
    setSubmitting(false);

    if (error) { toast.error("Withdrawal failed: " + error.message); return; }
    toast.success(`KES ${amt.toLocaleString()} withdrawal recorded successfully!`);
    setWithdrawAmount("");
    setWithdrawDetails("");
    loadData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isMarketer) return null;

  const statusBadge = (s: string) => {
    if (s === "approved" || s === "completed") return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{s}</Badge>;
    if (s === "rejected") return <Badge variant="destructive">{s}</Badge>;
    return <Badge variant="outline">{s}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Marketer Dashboard</h1>
              <p className="text-xs text-muted-foreground">Revenue share: {revenueSharePct}%</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate("/marketer-login"); }}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="overflow-x-auto pb-2">
            <TabsList className="inline-flex w-auto gap-1">
              <TabsTrigger value="overview" className="gap-1.5">
                <LayoutDashboard className="w-4 h-4" /> Overview
              </TabsTrigger>
              {/* <TabsTrigger value="users" className="gap-1.5">
                <Users className="w-4 h-4" /> Users
              </TabsTrigger> */}
              <TabsTrigger value="transactions" className="gap-1.5">
                <DollarSign className="w-4 h-4" /> Transactions
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5">
                <TrendingUp className="w-4 h-4" /> Analytics
              </TabsTrigger>
              <TabsTrigger value="predictor" className="gap-1.5 border border-primary/30">
                <Eye className="w-4 h-4 text-primary" /> Game Predictor
              </TabsTrigger>
              <TabsTrigger value="withdraw" className="gap-1.5">
                <Wallet className="w-4 h-4" /> Withdraw
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Users</CardDescription>
                  <CardTitle className="text-2xl">{users.length}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Deposits</CardDescription>
                  <CardTitle className="text-2xl">KES {totalVisibleDeposits.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Your Earnings</CardDescription>
                  <CardTitle className="text-2xl text-green-400">KES {totalEarnings.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available Balance</CardDescription>
                  <CardTitle className="text-2xl text-primary">KES {availableBalance.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            {/* Recent transactions preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent Deposits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Deposit ({revenueSharePct}% share)</TableHead>
                      <TableHead>Your Earnings</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.slice(0, 10).map(t => {
                      const vis = visibleAmount(t.amount);
                      const earn = earnings(vis);
                      return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.username ?? "User"}</TableCell>
                        <TableCell>KES {vis.toLocaleString()}</TableCell>
                        <TableCell className="text-green-400">
                          KES {earn.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {formatNairobiDate(t.created_at)}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No deposits yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Users ── */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Site Users</CardTitle>
                <CardDescription>Users registered on your assigned site. </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Total Deposited</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u, i) => (
                      <TableRow key={u.id}>
                        <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                        <TableCell className="font-medium">{u.username ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatNairobiDate(u.created_at)}
                        </TableCell>
                        <TableCell>KES {u.total_deposited?.toLocaleString() ?? 0}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">No users yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Transactions ── */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Transactions</CardTitle>
                <CardDescription>
                  Your {revenueSharePct}% revenue share of each deposit is shown below — the amount you see is what you earn.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Your Share ({revenueSharePct}%)</TableHead>
                      <TableHead>Your Earnings</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map(t => {
                      const vis = visibleAmount(t.amount);
                      const earn = earnings(vis);
                      return (
                      <TableRow key={t.id}>
                        <TableCell>{t.username ?? "User"}</TableCell>
                        <TableCell>KES {vis.toLocaleString()}</TableCell>
                        <TableCell className="text-green-400 font-medium">
                          KES {earn.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {t.payment_method ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatNairobiDateTime(t.created_at)}
                        </TableCell>
                      </TableRow>
                      );
                    })}
                    {transactions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">No transactions yet</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Earnings</CardDescription>
                  <CardTitle className="text-xl text-green-400">KES {totalEarnings.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Paid Out</CardDescription>
                  <CardTitle className="text-xl">KES {paidOut.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Available Balance</CardDescription>
                  <CardTitle className="text-xl text-primary">KES {availableBalance.toLocaleString()}</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Deposits vs Your Earnings (Last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={dailyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Area type="monotone" dataKey="deposits" name="Deposits" stroke="#6366f1" fill="#6366f120" strokeWidth={2} />
                    <Area type="monotone" dataKey="earnings" name="Your Earnings" stroke="#22c55e" fill="#22c55e20" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Daily Earnings Bar Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="earnings" name="Your Earnings" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Game Predictor ── */}
          <TabsContent value="predictor" className="space-y-4">
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Recent Game Results</CardTitle>
                    <CardDescription>Latest results for your assigned games — updates automatically as rounds finish.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gameAssignments.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-border rounded-xl">
                    <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">No games assigned yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask the admin to assign games to your account.</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-full">Assigned Games:</span>
                      {gameAssignments.map(a => (
                        <Badge key={a.game_slug} variant="secondary" className="capitalize gap-1">
                          {a.game_slug === "cycling-race" && <Bike className="w-3 h-3" />}
                          {a.game_slug === "aviator" && <Plane className="w-3 h-3" />}
                          {a.game_slug === "chicken-road" && <Drumstick className="w-3 h-3" />}
                          {a.game_slug === "coin-train" && <Train className="w-3 h-3" />}
                          {a.game_slug === "coin-flip" && <FlipHorizontal className="w-3 h-3" />}
                          {a.game_slug.replace("-", " ")}
                        </Badge>
                      ))}
                    </div>

                    {gameAssignments.some(a => a.game_slug === "cycling-race") && (
                      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Bike className="w-4 h-4 text-blue-400" />
                          Cycle Race — Upcoming Winner
                        </div>
                        {liveCycleRace ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Race #{liveCycleRace.raceNumber} ({liveCycleRace.status}) — the winner is decided the moment
                              the race is created, before betting even opens, so this is the real outcome.
                            </p>
                            <div className="text-sm">
                              Winning cyclist: <span className="font-bold text-primary">#{liveCycleRace.winnerCyclist}</span>
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">No race in progress right now.</p>
                        )}
                      </div>
                    )}

                    {gameAssignments.some(a => a.game_slug === "coin-flip") && (
                      <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <FlipHorizontal className="w-4 h-4 text-purple-400" />
                          Coin Flip — Current Round
                        </div>
                        {liveCoinFlip ? (
                          <>
                            <p className="text-xs text-muted-foreground">
                              Round status: <span className="capitalize">{liveCoinFlip.status}</span>.
                              The result isn't locked in until the round resolves — this is a live forecast based on current bets.
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-sm">
                              <span>Heads: <span className="font-semibold">KES {liveCoinFlip.headsTotal.toLocaleString()}</span></span>
                              <span>Tails: <span className="font-semibold">KES {liveCoinFlip.tailsTotal.toLocaleString()}</span></span>
                              {liveCoinFlip.favoredSide && (
                                <span>
                                  Favored right now: <span className="font-bold capitalize text-primary">{liveCoinFlip.favoredSide}</span>
                                </span>
                              )}
                            </div>
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">No round in progress right now.</p>
                        )}
                      </div>
                    )}

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Game</TableHead>
                          <TableHead>Round ID</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {upcomingResults.map(r => (
                          <TableRow key={r.id} className="group hover:bg-primary/5 transition-colors">
                            <TableCell className="font-medium capitalize flex items-center gap-2">
                              {r.game_slug === "cycling-race" && <Bike className="w-4 h-4 text-blue-400" />}
                              {r.game_slug === "aviator" && <Plane className="w-4 h-4 text-red-400" />}
                              {r.game_slug === "chicken-road" && <Drumstick className="w-4 h-4 text-orange-400" />}
                              {r.game_slug === "coin-train" && <Train className="w-4 h-4 text-yellow-400" />}
                              {r.game_slug === "coin-flip" && <FlipHorizontal className="w-4 h-4 text-purple-400" />}
                              {r.game_slug.replace("-", " ")}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              #{r.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <span className="text-lg font-bold text-primary animate-pulse">
                                {r.result}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize text-[10px] h-5">
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {formatNairobiTime(r.time)}
                            </TableCell>
                          </TableRow>
                        ))}
                        {upcomingResults.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                              No results yet — waiting for rounds to finish...
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Marketing Tip</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p>• Use upcoming high multipliers (e.g. 10x+) to record "winning moments" for social media.</p>
                  <p>• Announce "hot streaks" when you see multiple winning rounds coming up.</p>
                  <p>• Ensure your screen recording looks natural while using this information.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Confidentiality</CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-2">
                  <p className="text-red-400">⚠️ IMPORTANT: Do not share screenshots of this dashboard with results visible. This tool is for your marketing preparation only.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Withdraw ── */}
          <TabsContent value="withdraw" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Withdraw form */}
              <Card>
                <CardHeader>
                  <CardTitle>Request Withdrawal</CardTitle>
                  <CardDescription>
                    Available balance: <span className="text-primary font-semibold">KES {availableBalance.toLocaleString()}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdraw} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Amount (KES)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-border bg-muted/40 text-sm">
                        M-Pesa
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>M-Pesa Phone Number</Label>
                      <Input
                        placeholder="e.g. 0712345678"
                        value={withdrawDetails}
                        onChange={e => setWithdrawDetails(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={submitting || availableBalance <= 0}>
                      {submitting ? "Processing…" : "Withdraw via M-Pesa"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Withdrawal history */}
              <Card>
                <CardHeader>
                  <CardTitle>Withdrawal History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {withdrawals.map(w => (
                      <div key={w.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card/30">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">KES {w.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{w.payment_method} · {w.payment_details}</p>
                          {w.admin_notes && (
                            <p className="text-xs text-yellow-400">{w.admin_notes}</p>
                          )}
                        </div>
                        <div className="text-right space-y-0.5">
                          {statusBadge(w.status)}
                          <p className="text-xs text-muted-foreground">
                            {formatNairobiDate(w.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                    {withdrawals.length === 0 && (
                      <p className="text-center text-muted-foreground text-sm py-8">No withdrawal requests yet</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default MarketerDashboard;
