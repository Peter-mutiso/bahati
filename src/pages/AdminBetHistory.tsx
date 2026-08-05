import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { Search, Calendar, TrendingUp, TrendingDown, Wallet, ArrowLeft, Users, User } from "lucide-react";
import { format, isToday, isYesterday, startOfDay, subDays } from "date-fns";

interface Profile {
  id: string;
  email: string;
  username: string | null;
}

interface ChickenRoadBet {
  id: string;
  user_id: string;
  amount: number;
  profit: number | null;
  final_multiplier: number | null;
  lanes_crossed: number;
  total_lanes: number;
  difficulty: string;
  status: string;
  created_at: string;
  game_type: 'chicken_road';
}

interface CycleRaceBet {
  id: string;
  user_id: string;
  amount: number;
  profit: number | null;
  potential_payout: number;
  cyclist_number: number;
  status: string;
  created_at: string;
  game_type: 'cycle_race';
}

type UnifiedBet = ChickenRoadBet | CycleRaceBet;
type DateFilter = 'all' | 'today' | 'yesterday' | '7days' | '30days';

const AdminBetHistory = () => {
  const { isAdmin, isLoading: isAdminLoading } = useAdminCheck();
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState("");
  const [betSearchQuery, setBetSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      navigate("/admin-login");
    }
  }, [isAdmin, isAdminLoading, navigate]);

  // Fetch users for search
  const { data: users } = useQuery({
    queryKey: ["admin-users-search", userSearchQuery],
    queryFn: async () => {
      if (!userSearchQuery.trim()) return [];
      
      // Search by username, email, or phone (phone is in email field with @mobile.com format)
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, username")
        .or(`email.ilike.%${userSearchQuery}%,username.ilike.%${userSearchQuery}%`)
        .limit(20);

      if (error) throw error;
      
      // Also filter by phone number pattern in email
      const filtered = data?.filter(user => {
        const emailMatch = user.email?.toLowerCase().includes(userSearchQuery.toLowerCase());
        const usernameMatch = user.username?.toLowerCase().includes(userSearchQuery.toLowerCase());
        // Check if searching for phone number
        const phoneInEmail = user.email?.includes('@mobile.com');
        const phoneMatch = phoneInEmail && user.email?.replace('@mobile.com', '').includes(userSearchQuery);
        return emailMatch || usernameMatch || phoneMatch;
      }) || [];
      return filtered.slice(0, 10) as Profile[];
    },
    enabled: !!userSearchQuery.trim() && userSearchQuery.length >= 2,
  });

  // Fetch chicken road bets for selected user
  const { data: chickenBets, isLoading: isLoadingChicken } = useQuery({
    queryKey: ["admin-user-chicken-bets", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase
        .from("chicken_road_bets")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(bet => ({ ...bet, game_type: 'chicken_road' as const }));
    },
    enabled: !!selectedUserId,
  });

  // Fetch cycle race bets for selected user
  const { data: cycleBets, isLoading: isLoadingCycle } = useQuery({
    queryKey: ["admin-user-cycle-bets", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      
      const { data, error } = await supabase
        .from("cycling_race_bets")
        .select("*")
        .eq("user_id", selectedUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(bet => ({ ...bet, game_type: 'cycle_race' as const }));
    },
    enabled: !!selectedUserId,
  });

  // Fetch wallet for selected user
  const { data: wallet } = useQuery({
    queryKey: ["admin-user-wallet", selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return null;
      
      const { data, error } = await supabase
        .from("wallets")
        .select("wallet_cash, wallet_bonus")
        .eq("user_id", selectedUserId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!selectedUserId,
  });

  // Combine and sort all bets
  const bets = useMemo(() => {
    const allBets: UnifiedBet[] = [...(chickenBets || []), ...(cycleBets || [])];
    return allBets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [chickenBets, cycleBets]);

  const isLoading = isLoadingChicken || isLoadingCycle;

  // Filter bets based on date and search
  const filteredBets = useMemo(() => {
    if (!bets) return [];
    
    let filtered = [...bets];

    // Date filter
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(bet => isToday(new Date(bet.created_at)));
        break;
      case 'yesterday':
        filtered = filtered.filter(bet => isYesterday(new Date(bet.created_at)));
        break;
      case '7days':
        const sevenDaysAgo = startOfDay(subDays(now, 7));
        filtered = filtered.filter(bet => new Date(bet.created_at) >= sevenDaysAgo);
        break;
      case '30days':
        const thirtyDaysAgo = startOfDay(subDays(now, 30));
        filtered = filtered.filter(bet => new Date(bet.created_at) >= thirtyDaysAgo);
        break;
    }

    // Search filter
    if (betSearchQuery.trim()) {
      const query = betSearchQuery.toLowerCase();
      filtered = filtered.filter(bet => 
        bet.game_type.toLowerCase().includes(query) ||
        bet.status.toLowerCase().includes(query) ||
        bet.amount.toString().includes(query) ||
        (bet.game_type === 'chicken_road' && bet.difficulty.toLowerCase().includes(query)) ||
        (bet.game_type === 'cycle_race' && `cyclist ${bet.cyclist_number}`.includes(query))
      );
    }

    return filtered;
  }, [bets, dateFilter, betSearchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!filteredBets.length) return { totalBets: 0, totalWagered: 0, totalProfit: 0, biggestWin: 0, winRate: 0 };
    
    const totalBets = filteredBets.length;
    const totalWagered = filteredBets.reduce((sum, bet) => sum + Number(bet.amount), 0);
    const totalProfit = filteredBets.reduce((sum, bet) => sum + Number(bet.profit || 0), 0);
    const biggestWin = Math.max(...filteredBets.map(bet => Number(bet.profit || 0)));
    const wins = filteredBets.filter(bet => (bet.profit || 0) > 0).length;
    const winRate = (wins / totalBets) * 100;

    return { totalBets, totalWagered, totalProfit, biggestWin, winRate };
  }, [filteredBets]);

  // Calculate wallet before/after for each bet
  const betsWithWalletHistory = useMemo(() => {
    if (!filteredBets.length || !wallet) return [];
    
    const currentBalance = (wallet.wallet_cash || 0) + (wallet.wallet_bonus || 0);
    let runningBalance = currentBalance;
    
    const betsReversed = [...filteredBets];
    const result = betsReversed.map(bet => {
      const walletAfter = runningBalance;
      const betProfit = Number(bet.profit || 0);
      const betAmount = Number(bet.amount);
      
      const walletBefore = bet.status === 'won' 
        ? walletAfter - betProfit
        : walletAfter + betAmount;
      
      runningBalance = walletBefore;
      
      return {
        ...bet,
        walletBefore,
        walletAfter,
      };
    });

    return result;
  }, [filteredBets, wallet]);

  const dateFilterButtons: { label: string; value: DateFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: '7 Days', value: '7days' },
    { label: '30 Days', value: '30days' },
  ];

  const handleSelectUser = (user: Profile) => {
    setSelectedUserId(user.id);
    setSelectedUsername(user.username || user.email);
    setUserSearchQuery("");
  };

  if (isAdminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/adminct")}
              className="shrink-0"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">User Bet History</h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">Search and view user betting history</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4">
        {/* User Search Section */}
        <Card className="p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <h2 className="font-semibold text-sm sm:text-base">Search User</h2>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by phone, email, or username..."
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          {/* Search Results */}
          {users && users.length > 0 && (
            <div className="mt-2 border rounded-md divide-y max-h-48 overflow-y-auto">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{user.username || 'No username'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email?.includes('@mobile.com') 
                        ? `📱 ${user.email.replace('@mobile.com', '')}` 
                        : user.email}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Selected User */}
          {selectedUserId && (
            <div className="mt-3 p-2 sm:p-3 bg-primary/10 rounded-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Wallet className="w-4 h-4 text-primary shrink-0" />
                <span className="font-medium text-sm truncate">{selectedUsername}</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setSelectedUserId(null);
                  setSelectedUsername("");
                }}
                className="text-xs shrink-0"
              >
                Clear
              </Button>
            </div>
          )}
        </Card>

        {/* Bet History Section */}
        {selectedUserId ? (
          <>
            {/* Stats Summary */}
            <Card className="p-3 sm:p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Bets</p>
                  <p className="font-bold text-sm sm:text-base">{stats.totalBets}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Wagered</p>
                  <p className="font-bold text-sm sm:text-base">{symbol}{stats.totalWagered.toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Total Profit</p>
                  <p className={`font-bold text-sm sm:text-base ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {symbol}{stats.totalProfit.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Biggest Win</p>
                  <p className="font-bold text-sm sm:text-base text-green-500">{symbol}{stats.biggestWin.toFixed(2)}</p>
                </div>
                <div className="text-center p-2 bg-muted/30 rounded-lg col-span-2 sm:col-span-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Win Rate</p>
                  <p className="font-bold text-sm sm:text-base">{stats.winRate.toFixed(1)}%</p>
                </div>
              </div>
            </Card>

            {/* Filters */}
            <Card className="p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search bets by difficulty, status, amount..."
                    value={betSearchQuery}
                    onChange={(e) => setBetSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
                <div className="flex gap-1 flex-wrap">
                  {dateFilterButtons.map(btn => (
                    <Button
                      key={btn.value}
                      variant={dateFilter === btn.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDateFilter(btn.value)}
                      className="text-[10px] sm:text-xs px-2 sm:px-3"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Bets Table */}
            <Card className="overflow-hidden">
              <ScrollArea className="h-[400px] sm:h-[500px]">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading bet history...</div>
                ) : betsWithWalletHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No bets found</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap text-xs">Date</TableHead>
                        <TableHead className="whitespace-nowrap text-xs">Game</TableHead>
                        <TableHead className="whitespace-nowrap text-xs hidden sm:table-cell">Details</TableHead>
                        <TableHead className="whitespace-nowrap text-xs">Bet</TableHead>
                        <TableHead className="whitespace-nowrap text-xs hidden md:table-cell">Multi</TableHead>
                        <TableHead className="whitespace-nowrap text-xs hidden lg:table-cell">Before</TableHead>
                        <TableHead className="whitespace-nowrap text-xs hidden lg:table-cell">After</TableHead>
                        <TableHead className="whitespace-nowrap text-xs">P/L</TableHead>
                        <TableHead className="whitespace-nowrap text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {betsWithWalletHistory.map((bet) => {
                        const isWin = (bet.profit || 0) > 0;
                        const isChickenRoad = bet.game_type === 'chicken_road';
                        return (
                          <TableRow key={bet.id}>
                            <TableCell className="whitespace-nowrap text-[10px] sm:text-xs">
                              {format(new Date(bet.created_at), 'MMM dd, HH:mm')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] sm:text-xs">
                                {isChickenRoad ? '🐔' : '🚴'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-[10px] sm:text-xs hidden sm:table-cell">
                              {isChickenRoad 
                                ? `${bet.difficulty} - ${bet.lanes_crossed}/${bet.total_lanes}`
                                : `Cyclist #${bet.cyclist_number}`
                              }
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs font-medium">
                              {symbol}{Number(bet.amount).toFixed(0)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap hidden md:table-cell">
                              {isChickenRoad ? (
                                bet.final_multiplier ? (
                                  <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px]">
                                    {Number(bet.final_multiplier).toFixed(2)}x
                                  </Badge>
                                ) : '-'
                              ) : (
                                <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px]">
                                  {(Number(bet.potential_payout) / Number(bet.amount)).toFixed(2)}x
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-[10px] text-muted-foreground hidden lg:table-cell">
                              {symbol}{bet.walletBefore.toFixed(0)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-[10px] text-muted-foreground hidden lg:table-cell">
                              {symbol}{bet.walletAfter.toFixed(0)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <span className={`flex items-center gap-0.5 text-xs font-medium ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                                {isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {symbol}{Math.abs(Number(bet.profit || 0)).toFixed(0)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                variant={bet.status === 'won' ? 'default' : 'destructive'}
                                className={`text-[10px] ${bet.status === 'won' ? 'bg-green-500/20 text-green-500' : ''}`}
                              >
                                {bet.status === 'won' ? 'W' : bet.status === 'lost' ? 'L' : 'P'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </Card>
          </>
        ) : (
          <Card className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Search for a User</h3>
            <p className="text-sm text-muted-foreground">
              Enter a username or email above to view their bet history
            </p>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AdminBetHistory;
