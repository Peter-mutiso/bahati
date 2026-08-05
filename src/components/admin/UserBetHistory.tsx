import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { Search, Calendar, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format, isToday, isYesterday, startOfDay, subDays } from "date-fns";

interface UserBetHistoryProps {
  userId: string | null;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ChickenRoadBet {
  id: string;
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

const UserBetHistory = ({ userId, username, open, onOpenChange }: UserBetHistoryProps) => {
  const { symbol } = useCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');

  const { data: chickenBets, isLoading: isLoadingChicken } = useQuery({
    queryKey: ["user-chicken-bet-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("chicken_road_bets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(bet => ({ ...bet, game_type: 'chicken_road' as const }));
    },
    enabled: !!userId && open,
  });

  const { data: cycleBets, isLoading: isLoadingCycle } = useQuery({
    queryKey: ["user-cycle-bet-history", userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("cycling_race_bets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(bet => ({ ...bet, game_type: 'cycle_race' as const }));
    },
    enabled: !!userId && open,
  });

  // Combine and sort all bets
  const bets = useMemo(() => {
    const allBets: UnifiedBet[] = [...(chickenBets || []), ...(cycleBets || [])];
    return allBets.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [chickenBets, cycleBets]);

  const isLoading = isLoadingChicken || isLoadingCycle;

  // Get wallet info
  const { data: wallet } = useQuery({
    queryKey: ["user-wallet", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data, error } = await supabase
        .from("wallets")
        .select("wallet_cash, wallet_bonus")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId && open,
  });

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
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bet => 
        bet.game_type.toLowerCase().includes(query) ||
        bet.status.toLowerCase().includes(query) ||
        bet.amount.toString().includes(query) ||
        (bet.game_type === 'chicken_road' && bet.difficulty.toLowerCase().includes(query)) ||
        (bet.game_type === 'cycle_race' && `cyclist ${bet.cyclist_number}`.includes(query))
      );
    }

    return filtered;
  }, [bets, dateFilter, searchQuery]);

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

  // Calculate wallet before/after for each bet (running balance simulation)
  const betsWithWalletHistory = useMemo(() => {
    if (!filteredBets.length || !wallet) return [];
    
    const currentBalance = (wallet.wallet_cash || 0) + (wallet.wallet_bonus || 0);
    let runningBalance = currentBalance;
    
    // Work backwards from current balance
    const betsReversed = [...filteredBets];
    const result = betsReversed.map(bet => {
      const walletAfter = runningBalance;
      const betProfit = Number(bet.profit || 0);
      const betAmount = Number(bet.amount);
      
      // Reverse the transaction to get wallet before
      // If won: walletBefore = walletAfter - profit + amount (bet was placed, then won)
      // If lost: walletBefore = walletAfter + amount (bet was placed and lost)
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            Bet History - {username}
          </DialogTitle>
        </DialogHeader>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Bets</p>
            <p className="font-bold">{stats.totalBets}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Wagered</p>
            <p className="font-bold">{symbol}{stats.totalWagered.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Profit</p>
            <p className={`font-bold ${stats.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {symbol}{stats.totalProfit.toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Biggest Win</p>
            <p className="font-bold text-green-500">{symbol}{stats.biggestWin.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Win Rate</p>
            <p className="font-bold">{stats.winRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by difficulty, status, amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {dateFilterButtons.map(btn => (
              <Button
                key={btn.value}
                variant={dateFilter === btn.value ? "default" : "outline"}
                size="sm"
                onClick={() => setDateFilter(btn.value)}
                className="text-xs"
              >
                <Calendar className="w-3 h-3 mr-1" />
                {btn.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        <ScrollArea className="flex-1 border rounded-md">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bet history...</div>
          ) : betsWithWalletHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No bets found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead className="whitespace-nowrap">Game</TableHead>
                  <TableHead className="whitespace-nowrap">Details</TableHead>
                  <TableHead className="whitespace-nowrap">Bet Amount</TableHead>
                  <TableHead className="whitespace-nowrap">Multiplier</TableHead>
                  <TableHead className="whitespace-nowrap">Wallet Before</TableHead>
                  <TableHead className="whitespace-nowrap">Wallet After</TableHead>
                  <TableHead className="whitespace-nowrap">Profit/Loss</TableHead>
                  <TableHead className="whitespace-nowrap">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betsWithWalletHistory.map((bet) => {
                  const isWin = (bet.profit || 0) > 0;
                  const isChickenRoad = bet.game_type === 'chicken_road';
                  return (
                    <TableRow key={bet.id}>
                      <TableCell className="whitespace-nowrap text-xs">
                        {format(new Date(bet.created_at), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {isChickenRoad ? '🐔 Chicken' : '🚴 Cycle'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {isChickenRoad 
                          ? `${bet.difficulty} - ${bet.lanes_crossed}/${bet.total_lanes} lanes`
                          : `Cyclist #${bet.cyclist_number}`
                        }
                      </TableCell>
                      <TableCell className="whitespace-nowrap font-medium">
                        {symbol}{Number(bet.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {isChickenRoad ? (
                          bet.final_multiplier ? (
                            <Badge variant="secondary" className="bg-primary/20 text-primary">
                              {Number(bet.final_multiplier).toFixed(2)}x
                            </Badge>
                          ) : '-'
                        ) : (
                          <Badge variant="secondary" className="bg-primary/20 text-primary">
                            {(Number(bet.potential_payout) / Number(bet.amount)).toFixed(2)}x
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {symbol}{bet.walletBefore.toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {symbol}{bet.walletAfter.toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={`flex items-center gap-1 font-medium ${isWin ? 'text-green-500' : 'text-red-500'}`}>
                          {isWin ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {symbol}{Math.abs(Number(bet.profit || 0)).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={bet.status === 'won' ? 'default' : 'destructive'}
                          className={`text-xs ${bet.status === 'won' ? 'bg-green-500/20 text-green-500' : ''}`}
                        >
                          {bet.status === 'won' ? 'Won' : bet.status === 'lost' ? 'Lost' : 'Pending'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default UserBetHistory;
