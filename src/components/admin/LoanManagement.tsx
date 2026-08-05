import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/useCurrency";
import { DollarSign, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface LoanTransaction {
  id: string;
  user_id: string;
  loan_amount: number;
  recovery_amount: number;
  status: string;
  created_at: string;
  recovered_at: string | null;
  email?: string;
}

interface LoanStats {
  totalLoans: number;
  activeLoans: number;
  recoveredLoans: number;
  totalLoanAmount: number;
  totalRecovered: number;
  outstandingAmount: number;
}

const LoanManagement = () => {
  const { symbol } = useCurrency();
  const [loans, setLoans] = useState<LoanTransaction[]>([]);
  const [stats, setStats] = useState<LoanStats>({
    totalLoans: 0,
    activeLoans: 0,
    recoveredLoans: 0,
    totalLoanAmount: 0,
    totalRecovered: 0,
    outstandingAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "recovered">("all");

  useEffect(() => {
    loadLoans();
  }, []);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("loan_transactions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Fetch profiles separately for each loan
        const loansWithProfiles = await Promise.all(
          data.map(async (loan) => {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", loan.user_id)
              .maybeSingle();
            return {
              ...loan,
              email: profile?.email || "Unknown",
            };
          })
        );
        setLoans(loansWithProfiles);
        calculateStats(loansWithProfiles);
      }
    } catch (error) {
      console.error("Error loading loans:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (loanData: LoanTransaction[]) => {
    const totalLoans = loanData.length;
    const activeLoans = loanData.filter(l => l.status === 'active').length;
    const recoveredLoans = loanData.filter(l => l.status === 'recovered').length;
    const totalLoanAmount = loanData.reduce((sum, l) => sum + parseFloat(l.loan_amount.toString()), 0);
    const totalRecovered = loanData.reduce((sum, l) => sum + parseFloat(l.recovery_amount.toString()), 0);
    const outstandingAmount = totalLoanAmount - totalRecovered;

    setStats({
      totalLoans,
      activeLoans,
      recoveredLoans,
      totalLoanAmount,
      totalRecovered,
      outstandingAmount,
    });
  };

  const filteredLoans = loans.filter(loan => {
    if (filter === "all") return true;
    return loan.status === filter;
  });

  const getRecoveryProgress = (loan: LoanTransaction) => {
    const loanAmount = parseFloat(loan.loan_amount.toString());
    const recoveryAmount = parseFloat(loan.recovery_amount.toString());
    return loanAmount > 0 ? (recoveryAmount / loanAmount) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Loans</p>
              <p className="text-2xl font-bold">{stats.totalLoans}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.activeLoans} active • {stats.recoveredLoans} recovered
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Outstanding Amount</p>
              <p className="text-2xl font-bold">{symbol}{stats.outstandingAmount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                From active loans
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-success/10">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recovered</p>
              <p className="text-2xl font-bold">{symbol}{stats.totalRecovered.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.totalRecovered / stats.totalLoanAmount) * 100 || 0).toFixed(1)}% recovery rate
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Loan Transactions</h2>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "active" | "recovered")}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="recovered">Recovered</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Loan Amount</TableHead>
                  <TableHead>Recovered</TableHead>
                  <TableHead>Recovery Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Recovered Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLoans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No loan transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLoans.map((loan) => {
                    const progress = getRecoveryProgress(loan);
                    const remaining = parseFloat(loan.loan_amount.toString()) - parseFloat(loan.recovery_amount.toString());
                    
                    return (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">
                          {loan.email}
                        </TableCell>
                        <TableCell>{symbol}{parseFloat(loan.loan_amount.toString()).toFixed(2)}</TableCell>
                        <TableCell className="text-success">
                          {symbol}{parseFloat(loan.recovery_amount.toString()).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 min-w-[150px]">
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>{progress.toFixed(1)}%</span>
                              <span>{symbol}{remaining.toFixed(2)} left</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'active' ? 'destructive' : 'default'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(loan.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {loan.recovered_at ? new Date(loan.recovered_at).toLocaleString() : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoanManagement;
