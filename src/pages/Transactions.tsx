import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import DesktopNav from "@/components/layout/DesktopNav";
import BottomNav from "@/components/layout/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Receipt, ArrowUpRight, ArrowDownLeft, Wallet, Gift, Loader2 } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  payment_method?: string;
  created_at: string;
  category: 'deposit' | 'withdrawal';
};

type WalletTransaction = {
  id: string;
  transaction_type: string;
  wallet_type: string;
  amount: number;
  description?: string;
  created_at: string;
  category: 'wallet';
};

type CommissionTransaction = {
  id: string;
  amount: number;
  commission_type: string;
  created_at: string;
  referred_user_id: string;
  category: 'commission';
};

type CombinedTransaction = (Transaction | WalletTransaction | CommissionTransaction) & {
  category: 'deposit' | 'withdrawal' | 'wallet' | 'commission';
};

const Transactions = () => {
  const navigate = useNavigate();
  const { symbol } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
  const [commissionTransactions, setCommissionTransactions] = useState<CommissionTransaction[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("transactions-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "transactions" },
        (payload) => {
          setTransactions((prev) =>
            prev.map((t) =>
              t.id === payload.new.id ? { ...t, status: payload.new.status } : t
            )
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setIsAuthenticated(true);
      
      // Check admin status
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      setIsAdmin(!!roleData);
      
      // Load all transaction types in parallel
      await Promise.all([
        loadTransactions(session.user.id),
        loadWalletTransactions(session.user.id),
        loadCommissionTransactions(session.user.id),
      ]);
    } catch (error) {
      console.error("Auth check error:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Auto-expire pending deposits older than 5 minutes (STK push timeout)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const stale = data.filter(
          (t) =>
            t.status === "pending" &&
            t.type === "deposit" &&
            new Date(t.created_at) < fiveMinutesAgo
        );
        if (stale.length > 0) {
          await supabase
            .from("transactions")
            .update({ status: "rejected", admin_notes: "STK Push timed out" })
            .in("id", stale.map((t) => t.id));
          stale.forEach((t) => (t.status = "rejected"));
        }

        setTransactions(data.map(t => ({ ...t, category: t.type as 'deposit' | 'withdrawal' })));
      }
    } catch (error) {
      console.error("Error loading transactions:", error);
      toast.error("Failed to load deposit/withdrawal transactions");
    }
  };

  const loadWalletTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("wallet_transactions not available:", error.message);
        return;
      }
      
      if (data) {
        setWalletTransactions(data.map(t => ({ ...t, category: 'wallet' as const })));
      }
    } catch (error) {
      console.error("Error loading wallet transactions:", error);
    }
  };

  const loadCommissionTransactions = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("commission_transactions")
        .select("*")
        .eq("referrer_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("commission_transactions not available:", error.message);
        return;
      }
      
      if (data) {
        setCommissionTransactions(data.map(t => ({ ...t, category: 'commission' as const })));
      }
    } catch (error) {
      console.error("Error loading commission transactions:", error);
    }
  };

  const getFilteredTransactions = (type: 'deposit' | 'withdrawal' | 'wallet' | 'commission' | 'bonus' | 'all') => {
    let filtered: CombinedTransaction[] = [];

    if (type === 'deposit') {
      filtered = transactions.filter(t => t.type === 'deposit');
    } else if (type === 'withdrawal') {
      filtered = transactions.filter(t => t.type === 'withdrawal');
    } else if (type === 'wallet') {
      filtered = walletTransactions;
    } else if (type === 'commission') {
      filtered = commissionTransactions;
    } else if (type === 'bonus') {
      filtered = walletTransactions.filter(t => 
        t.transaction_type.toLowerCase().includes('bonus') || 
        t.description?.toLowerCase().includes('bonus')
      );
    } else {
      filtered = [...transactions, ...walletTransactions, ...commissionTransactions].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    if (statusFilter !== 'all' && type !== 'wallet' && type !== 'commission' && type !== 'bonus') {
      filtered = filtered.filter(t => 'status' in t && t.status === statusFilter);
    }

    return filtered;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      completed: "default",
      rejected: "destructive",
      processing: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getTransactionIcon = (transaction: CombinedTransaction) => {
    if (transaction.category === 'wallet') {
      return <Wallet className="w-4 h-4" />;
    }
    if (transaction.category === 'commission') {
      return <Gift className="w-4 h-4 text-primary" />;
    }
    return transaction.category === 'deposit' ? 
      <ArrowDownLeft className="w-4 h-4 text-green-500" /> : 
      <ArrowUpRight className="w-4 h-4 text-red-500" />;
  };

  const renderTransaction = (transaction: CombinedTransaction) => {
    const isWallet = transaction.category === 'wallet';
    const isCommission = transaction.category === 'commission';
    
    return (
      <div key={transaction.id} className="flex items-center justify-between p-4 border-b border-border last:border-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            {getTransactionIcon(transaction)}
          </div>
          <div>
            <p className="font-medium">
              {isCommission 
                ? (transaction as CommissionTransaction).commission_type.replace(/_/g, ' ').toUpperCase()
                : isWallet 
                  ? (transaction as WalletTransaction).transaction_type.replace(/_/g, ' ').toUpperCase()
                  : (transaction as Transaction).type.toUpperCase()}
            </p>
            {isCommission && (
              <p className="text-sm text-muted-foreground">
                Referral Commission
              </p>
            )}
            {isWallet && (transaction as WalletTransaction).description && (
              <p className="text-sm text-muted-foreground">
                {(transaction as WalletTransaction).description}
              </p>
            )}
            {!isWallet && !isCommission && (transaction as Transaction).payment_method && (
              <p className="text-sm text-muted-foreground">
                {(transaction as Transaction).payment_method}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.created_at), "PPp")}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold font-mono text-green-600">
            +{symbol}{parseFloat(transaction.amount.toString()).toFixed(2)}
          </p>
          {!isWallet && !isCommission && getStatusBadge((transaction as Transaction).status)}
          {isWallet && (
            <p className="text-xs text-muted-foreground mt-1">
              {(transaction as WalletTransaction).wallet_type.toUpperCase()}
            </p>
          )}
          {isCommission && (
            <Badge variant="secondary" className="mt-1">Commission</Badge>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <DesktopNav
        onAuthRequired={() => navigate("/auth")}
        isAuthenticated={isAuthenticated}
        isAdmin={isAdmin}
      />

      <div className="container mx-auto p-4 pt-20 md:pt-24 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Receipt className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Transactions</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filter Transactions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="deposit">Deposits</SelectItem>
                <SelectItem value="withdrawal">Withdrawals</SelectItem>
                <SelectItem value="commission">Commission & Referrals</SelectItem>
                <SelectItem value="bonus">Bonuses</SelectItem>
                <SelectItem value="wallet">Wallet Activity</SelectItem>
              </SelectContent>
            </Select>

            {filter !== 'wallet' && filter !== 'commission' && filter !== 'bonus' && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {getFilteredTransactions(filter as any).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No transactions found</p>
                <p className="text-sm mt-1">Your transactions will appear here</p>
              </div>
            ) : (
              getFilteredTransactions(filter as any).map(renderTransaction)
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNav onAuthRequired={() => navigate("/auth")} isAuthenticated={isAuthenticated} />
    </div>
  );
};

export default Transactions;
