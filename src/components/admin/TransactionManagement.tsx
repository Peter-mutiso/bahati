import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2, XCircle, Eye, Search, Filter, Columns, ArrowUpDown, TrendingUp, ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  utr_number: string | null;
  wallet_address: string | null;
  transaction_hash: string | null;
  admin_notes: string | null;
  created_at: string;
  profile?: { email: string; username?: string; phone_number?: string | null } | null;
  wallet?: { wallet_cash: number; wallet_bonus: number } | null;
  totalDeposits?: number;
  totalWithdrawals?: number;
}

type DateFilter = 'today' | 'yesterday' | 'thisWeek' | 'last7Days' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'allTime';

type SortField = 'id' | 'user_id' | 'user' | 'type' | 'amount' | 'method' | 'wallet' | 'deposits' | 'withdrawals';
type SortDirection = 'asc' | 'desc';

const TransactionManagement = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const { tenantEq, activeSite } = useActiveSite();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [btcRate, setBtcRate] = useState<number>(100000);
  const [currencyRate, setCurrencyRate] = useState<number>(129);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>('allTime');
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [visibleColumns, setVisibleColumns] = useState({
    transId: true,
    usersId: true,
    user: true,
    type: true,
    status: true,
    amount: true,
    method: true,
    wallet: true,
    totalDeposits: true,
    totalWithdrawals: true,
    actions: true,
  });

  // Fetch live rates
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-currency-rate', {
          body: { currency: 'KES' }
        });
        if (!error && data) {
          if (data.btcRate) setBtcRate(data.btcRate);
          if (data.rate) setCurrencyRate(data.rate);
        }
      } catch (e) {
        console.error('Failed to fetch rates:', e);
      }
    };
    fetchRates();
  }, []);

  const getCryptoValue = (amount: number, paymentMethod: string | null) => {
    if (!paymentMethod) return null;
    const method = paymentMethod.toLowerCase();
    const isBtc = method.includes('btc');
    const isUsdt = method.includes('usdt');
    
    if (isBtc) {
      return { value: (amount / (btcRate * currencyRate)).toFixed(8), type: 'BTC' };
    } else if (isUsdt) {
      return { value: (amount / currencyRate).toFixed(4), type: 'USDT' };
    }
    return null;
  };

  const getDateRange = (filter: DateFilter): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (filter) {
      case 'today':
        return { start: today, end: now };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday, end: today };
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return { start: weekStart, end: now };
      case 'last7Days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return { start: sevenDaysAgo, end: now };
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: now };
      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { start: lastMonthStart, end: lastMonthEnd };
      case 'thisYear':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: now };
      case 'allTime':
      default:
        return { start: new Date(0), end: now };
    }
  };

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["admin-transactions", activeSite === "all" ? "all" : (activeSite as any).id],
    queryFn: async () => {
      let query = supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by selected site
      if (tenantEq) query = query.eq(tenantEq[0], tenantEq[1]);

      const { data: transactions, error } = await query;
      if (error) throw error;

      const transactionsWithProfiles = await Promise.all(
        transactions.map(async (transaction) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, username, phone_number")
            .eq("id", transaction.user_id)
            .maybeSingle();

          const { data: wallet } = await supabase
            .from("wallets")
            .select("wallet_cash, wallet_bonus")
            .eq("user_id", transaction.user_id)
            .maybeSingle();

          // Get user's total deposits and withdrawals
          const { data: userDeposits } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", transaction.user_id)
            .eq("type", "deposit")
            .eq("status", "completed");

          const { data: userWithdrawals } = await supabase
            .from("transactions")
            .select("amount")
            .eq("user_id", transaction.user_id)
            .eq("type", "withdrawal")
            .eq("status", "completed");

          const totalDeposits = userDeposits?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;
          const totalWithdrawals = userWithdrawals?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

          return {
            ...transaction,
            profile,
            wallet,
            totalDeposits,
            totalWithdrawals,
          };
        })
      );

      return transactionsWithProfiles;
    },
  });

  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    let filtered = [...transactions];

    // Date filter
    const { start, end } = getDateRange(dateFilter);
    filtered = filtered.filter(t => {
      const date = new Date(t.created_at);
      return date >= start && date <= end;
    });

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(query) ||
        t.user_id.toLowerCase().includes(query) ||
        t.profile?.email?.toLowerCase().includes(query) ||
        t.profile?.username?.toLowerCase().includes(query) ||
        t.type.toLowerCase().includes(query) ||
        t.payment_method?.toLowerCase().includes(query)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortField) {
        case 'id':
          aVal = a.id;
          bVal = b.id;
          break;
        case 'user_id':
          aVal = a.user_id;
          bVal = b.user_id;
          break;
        case 'user':
          aVal = a.profile?.username || a.profile?.email || '';
          bVal = b.profile?.username || b.profile?.email || '';
          break;
        case 'type':
          aVal = a.type;
          bVal = b.type;
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'method':
          aVal = a.payment_method || '';
          bVal = b.payment_method || '';
          break;
        case 'wallet':
          aVal = (a.wallet?.wallet_cash || 0) + (a.wallet?.wallet_bonus || 0);
          bVal = (b.wallet?.wallet_cash || 0) + (b.wallet?.wallet_bonus || 0);
          break;
        case 'deposits':
          aVal = a.totalDeposits || 0;
          bVal = b.totalDeposits || 0;
          break;
        case 'withdrawals':
          aVal = a.totalWithdrawals || 0;
          bVal = b.totalWithdrawals || 0;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      }
      return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [transactions, dateFilter, searchQuery, sortField, sortDirection]);

  // Calculate summary stats from filtered transactions
  const summaryStats = useMemo(() => {
    const deposits = filteredTransactions
      .filter(t => t.type === 'deposit' && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const withdrawals = filteredTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'completed')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const pendingDeposits = filteredTransactions
      .filter(t => t.type === 'deposit' && t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const pendingWithdrawals = filteredTransactions
      .filter(t => t.type === 'withdrawal' && t.status === 'pending')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const ggr = deposits - withdrawals;

    return { ggr, deposits, withdrawals, pendingDeposits, pendingWithdrawals };
  }, [filteredTransactions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const approveMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const { data, error } = await supabase.functions.invoke('process-transaction', {
        body: {
          transactionId: transaction.id,
          status: 'completed',
          adminNotes: null
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      toast.success("Transaction approved successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to approve: " + error.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { data, error } = await supabase.functions.invoke('process-transaction', {
        body: {
          transactionId: id,
          status: 'rejected',
          adminNotes: notes
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-transactions"] });
      setShowRejectDialog(false);
      setAdminNotes("");
      toast.success("Transaction rejected");
    },
    onError: (error: Error) => {
      toast.error("Failed to reject: " + error.message);
    },
  });

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsDialog(true);
  };

  const handleApprove = (transaction: Transaction) => {
    if (confirm(`Approve this ${transaction.type} of ${symbol}${transaction.amount}?`)) {
      approveMutation.mutate(transaction);
    }
  };

  const handleReject = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowRejectDialog(true);
  };

  const submitReject = () => {
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    if (selectedTransaction) {
      rejectMutation.mutate({ 
        id: selectedTransaction.id, 
        notes: adminNotes 
      });
    }
  };

  const dateFilters: { key: DateFilter; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'last7Days', label: 'Last 7 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'thisYear', label: 'This Year' },
    { key: 'allTime', label: 'All Time' },
  ];

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getShortId = (id: string) => {
    return `#${id.slice(0, 6)}`;
  };

  const getUserDisplay = (transaction: Transaction) => {
    const name = transaction.profile?.username || transaction.profile?.phone_number || transaction.profile?.email?.split('@')[0] || 'Unknown';
    const phone = transaction.profile?.phone_number || null;
    return { name, phone };
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading transactions...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold">Transactions</h2>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full sm:w-64 bg-background/50 border-border/50"
            />
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem
                checked={visibleColumns.transId}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, transId: checked }))}
              >
                Trans.ID
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.usersId}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, usersId: checked }))}
              >
                User.ID
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.user}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, user: checked }))}
              >
                User
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.type}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, type: checked }))}
              >
                Type
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.status}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, status: checked }))}
              >
                Status
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.amount}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, amount: checked }))}
              >
                Amount
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.method}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, method: checked }))}
              >
                Method
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.wallet}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, wallet: checked }))}
              >
                Wallet
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.totalDeposits}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, totalDeposits: checked }))}
              >
                Total Deposits
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={visibleColumns.totalWithdrawals}
                onCheckedChange={(checked) => setVisibleColumns(prev => ({ ...prev, totalWithdrawals: checked }))}
              >
                Total Withdrawals
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">Date Filters:</span>
        {dateFilters.map((filter) => (
          <Button
            key={filter.key}
            variant={dateFilter === filter.key ? "default" : "outline"}
            size="sm"
            onClick={() => setDateFilter(filter.key)}
            className={dateFilter === filter.key 
              ? "bg-primary text-primary-foreground" 
              : "bg-background/50 border-border/50 hover:bg-accent"
            }
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs sm:text-sm text-muted-foreground">GGR (Profit)</span>
            </div>
            <p className={`text-lg sm:text-2xl font-bold ${summaryStats.ggr >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {symbol} {formatNumber(summaryStats.ggr)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Deposits</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-emerald-500">
              {symbol} {formatNumber(summaryStats.deposits)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total Withdrawals</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-red-500">
              {symbol} -{formatNumber(summaryStats.withdrawals)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownCircle className="h-4 w-4 text-amber-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Pending Deposits</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-amber-500">
              {symbol} {formatNumber(summaryStats.pendingDeposits)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpCircle className="h-4 w-4 text-orange-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Pending Withdrawals</span>
            </div>
            <p className="text-lg sm:text-2xl font-bold text-orange-500">
              {symbol} {formatNumber(summaryStats.pendingWithdrawals)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  {visibleColumns.transId && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                      <div className="flex items-center gap-1">
                        Trans.ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.usersId && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('user_id')}>
                      <div className="flex items-center gap-1">
                        User.ID <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.user && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('user')}>
                      <div className="flex items-center gap-1">
                        User <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.type && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                      <div className="flex items-center gap-1">
                        Type <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.status && (
                    <TableHead>Status</TableHead>
                  )}
                  {visibleColumns.amount && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('amount')}>
                      <div className="flex items-center gap-1">
                        Amount <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.method && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('method')}>
                      <div className="flex items-center gap-1">
                        Method <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.wallet && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('wallet')}>
                      <div className="flex items-center gap-1">
                        Wallet <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.totalDeposits && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('deposits')}>
                      <div className="flex items-center gap-1">
                        Total Deposits <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.totalWithdrawals && (
                    <TableHead className="cursor-pointer" onClick={() => handleSort('withdrawals')}>
                      <div className="flex items-center gap-1">
                        Total Withdrawals <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                  )}
                  {visibleColumns.actions && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((transaction) => {
                  const userDisplay = getUserDisplay(transaction);
                  const walletTotal = (transaction.wallet?.wallet_cash || 0) + (transaction.wallet?.wallet_bonus || 0);
                  
                  return (
                    <TableRow key={transaction.id} className="border-border/50">
                      {visibleColumns.transId && (
                        <TableCell className="font-mono text-sm">
                          {getShortId(transaction.id)}
                        </TableCell>
                      )}
                      {visibleColumns.usersId && (
                        <TableCell className="font-mono text-sm">
                          {getShortId(transaction.user_id)}
                        </TableCell>
                      )}
                      {visibleColumns.user && (
                        <TableCell>
                          <div>
                            <p className="font-medium">{userDisplay.name}</p>
                            {userDisplay.phone && (
                              <p className="text-xs text-muted-foreground">{userDisplay.phone}</p>
                            )}
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.type && (
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={transaction.type === 'deposit' 
                              ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50' 
                              : 'bg-orange-500/20 text-orange-500 border-orange-500/50'
                            }
                          >
                            {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.status && (
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={
                              transaction.status === 'completed' 
                                ? 'bg-emerald-500/20 text-emerald-500 border-emerald-500/50'
                                : transaction.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50'
                                : transaction.status === 'requires_approval'
                                ? 'bg-red-500/20 text-red-500 border-red-500/50'
                                : transaction.status === 'rejected'
                                ? 'bg-gray-500/20 text-gray-500 border-gray-500/50'
                                : 'bg-muted/20 text-muted-foreground border-muted/50'
                            }
                          >
                            {transaction.status === 'requires_approval' 
                              ? 'Requires Approval' 
                              : transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </Badge>
                        </TableCell>
                      )}
                      {visibleColumns.amount && (
                        <TableCell className="font-bold">
                          {symbol} {formatNumber(transaction.amount)}
                        </TableCell>
                      )}
                      {visibleColumns.method && (
                        <TableCell>
                          {transaction.payment_method ? (
                            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50">
                              <Wallet className="h-3 w-3 mr-1" />
                              {transaction.payment_method.toUpperCase()}
                            </Badge>
                          ) : "-"}
                        </TableCell>
                      )}
                      {visibleColumns.wallet && (
                        <TableCell>
                          {symbol} {formatNumber(walletTotal)}
                        </TableCell>
                      )}
                      {visibleColumns.totalDeposits && (
                        <TableCell className="text-emerald-500">
                          {symbol} {formatNumber(transaction.totalDeposits || 0)}
                        </TableCell>
                      )}
                      {visibleColumns.totalWithdrawals && (
                        <TableCell className="text-red-500">
                          {symbol} -{formatNumber(transaction.totalWithdrawals || 0)}
                        </TableCell>
                      )}
                      {visibleColumns.actions && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(transaction)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {(transaction.status === "pending" || transaction.status === "requires_approval") && (
                              <>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApprove(transaction)}
                                  disabled={approveMutation.isPending}
                                  className="bg-emerald-600 hover:bg-emerald-700"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleReject(transaction)}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-3">
              <div>
                <span className="font-semibold">User:</span> {selectedTransaction.profile?.email}
              </div>
              <div>
                <span className="font-semibold">Type:</span> {selectedTransaction.type}
              </div>
              <div>
                <span className="font-semibold">Amount:</span> {symbol}{selectedTransaction.amount}
                {(() => {
                  const crypto = getCryptoValue(selectedTransaction.amount, selectedTransaction.payment_method);
                  return crypto ? (
                    <span className="ml-2 text-amber-500 font-medium">
                      (≈ {crypto.value} {crypto.type})
                    </span>
                  ) : null;
                })()}
              </div>
              <div>
                <span className="font-semibold">Payment Method:</span> {selectedTransaction.payment_method?.toUpperCase() || "N/A"}
              </div>
              {selectedTransaction.utr_number && (
                <div>
                  <span className="font-semibold">UTR Number:</span> {selectedTransaction.utr_number}
                </div>
              )}
              {selectedTransaction.transaction_hash && (
                <div>
                  <span className="font-semibold">Transaction Hash:</span> 
                  <p className="text-sm break-all font-mono">{selectedTransaction.transaction_hash}</p>
                </div>
              )}
              {selectedTransaction.wallet_address && (
                <div>
                  <span className="font-semibold">Wallet Address:</span> 
                  <p className="text-sm break-all">{selectedTransaction.wallet_address}</p>
                </div>
              )}
              <div>
                <span className="font-semibold">Status:</span> {selectedTransaction.status}
              </div>
              {selectedTransaction.admin_notes && (
                <div>
                  <span className="font-semibold">Admin Notes:</span> 
                  <p className="text-sm text-muted-foreground">{selectedTransaction.admin_notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Reason for Rejection *</Label>
              <Textarea
                id="notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitReject}
              disabled={rejectMutation.isPending}
            >
              Reject Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionManagement;
