import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, Wallet as WalletIcon, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { WagerProgress } from "@/components/wallet/WagerProgress";
import { LoanSection } from "@/components/wallet/LoanSection";
import { Gift } from "lucide-react";
import { useTenantId } from "@/contexts/TenantContext";

const Wallet = () => {
  const { symbol } = useCurrency();
  const tenantId = useTenantId();
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "usdt" | "btc" | "mpesa">("mpesa");
  const [utrNumber, setUtrNumber] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [mpesaPending, setMpesaPending] = useState(false);
  const [pendingTransactionId, setPendingTransactionId] = useState<string | null>(null);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [walletAddress, setWalletAddress] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [currentAction, setCurrentAction] = useState<"deposit" | "withdrawal">("deposit");
  const [wagerRequired, setWagerRequired] = useState(0);
  const [wagerCompleted, setWagerCompleted] = useState(0);
  const [firstDepositReceived, setFirstDepositReceived] = useState(false);
  const [firstDepositBonus, setFirstDepositBonus] = useState<{ type: 'percent' | 'fixed', value: number } | null>(null);
  const [loanEligible, setLoanEligible] = useState(false);
  const [loanAmount, setLoanAmount] = useState(0);
  const [lastDepositAmount, setLastDepositAmount] = useState(0);
  const [paymentSettings, setPaymentSettings] = useState<any>(null);
  const [loanFeatureEnabled, setLoanFeatureEnabled] = useState(true);
  const [wagerEnabled, setWagerEnabled] = useState(true);
  const navigate = useNavigate();

  const UPI_ID = paymentSettings?.upi_id || "crashx@upi";
  const USDT_ADDRESS = paymentSettings?.usdt_address || "TXYZabc123example";
  const BTC_ADDRESS = paymentSettings?.btc_address || "";
  const UPI_NAME = paymentSettings?.upi_method_name || "UPI";
  const USDT_NAME = paymentSettings?.usdt_method_name || "USDT";
  const BTC_NAME = paymentSettings?.btc_method_name || "BTC";
  const USDT_RATE = paymentSettings?.usdt_conversion_rate || 80;

  // Reload tenant-scoped settings whenever tenantId resolves
  useEffect(() => {
    if (!tenantId) return;
    loadPaymentSettings();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadTransactions(session.user.id);
      }
    });
  }, [tenantId]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      loadWallet(session.user.id);
      loadTransactions(session.user.id);

      // Set up real-time subscription for transaction updates
      const channel = supabase
        .channel('transaction-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            const updatedTransaction = payload.new;

            // Reload transactions to show latest state
            loadTransactions(session.user.id);

            // Show notification based on status
            if (updatedTransaction.status === 'completed') {
              toast.success(
                `${updatedTransaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${symbol}${updatedTransaction.amount} has been approved!`,
                { duration: 5000 }
              );
              // Reload wallet balance for deposits
              if (updatedTransaction.type === 'deposit') {
                loadWallet(session.user.id);
              }
            } else if (updatedTransaction.status === 'rejected') {
              toast.error(
                `${updatedTransaction.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${symbol}${updatedTransaction.amount} was rejected. ${updatedTransaction.admin_notes || ''}`,
                { duration: 6000 }
              );
            } else if (updatedTransaction.status === 'processing') {
              toast.info(
                `Your ${updatedTransaction.type} of ${symbol}${updatedTransaction.amount} is being processed.`,
                { duration: 4000 }
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = checkAuth();
    loadFirstDepositBonus();
    return () => {
      cleanup.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [navigate, symbol]);

  const loadPaymentSettings = async () => {
    if (!tenantId) return;
    try {
      const { data, error } = await supabase
        .from("game_settings")
        .select("upi_method_name, upi_id, upi_enabled, upi_qr_enabled, upi_qr_url, usdt_method_name, usdt_address, usdt_enabled, usdt_qr_enabled, usdt_qr_url, usdt_conversion_rate, btc_method_name, btc_address, btc_enabled, btc_qr_enabled, btc_qr_url, show_utr_number, show_wallet_address, currency_name, currency_symbol, min_deposit, max_deposit, loan_feature_enabled, wager_requirement_enabled, mpesa_enabled, withdrawals_enabled, website_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (!error && data) {
        setPaymentSettings(data);
        setLoanFeatureEnabled(data.loan_feature_enabled ?? true);
        setWagerEnabled((data as any).wager_requirement_enabled ?? true);
        setWithdrawalsEnabled((data as any).withdrawals_enabled ?? true);
        setPaymentMethod("mpesa");

        // Fetch real-time currency rate
        if (data.currency_name) {
          if (data.currency_name === "USD") {
            // USD to USDT is 1:1 since USDT is pegged to USD
            setPaymentSettings((prev: any) => ({
              ...prev,
              live_currency_rate: 1
            }));
          } else {
            // Fetch live rate for other currencies
            fetchCurrencyRate(data.currency_name);
          }
        }
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
    }
  };

  const fetchCurrencyRate = async (currency: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('get-currency-rate', {
        body: { currency }
      });

      if (error) throw error;

      if (data?.rate) {
        setPaymentSettings((prev: any) => ({
          ...prev,
          live_currency_rate: data.rate,
          live_btc_rate: data.btcRate || 100000
        }));
      }
    } catch (error) {
      console.error("Error fetching currency rate:", error);
    }
  };

  const loadFirstDepositBonus = async () => {
    try {
      const { data: settings } = await supabase
        .from('game_settings')
        .select('first_deposit_bonus_percent, first_deposit_bonus_fixed_amount')
        .single();

      if (settings) {
        if (settings.first_deposit_bonus_fixed_amount) {
          setFirstDepositBonus({ type: 'fixed', value: settings.first_deposit_bonus_fixed_amount });
        } else {
          setFirstDepositBonus({ type: 'percent', value: settings.first_deposit_bonus_percent });
        }
      }
    } catch (error) {
      console.error('Error loading first deposit bonus:', error);
    }
  };

  const loadWallet = async (userId: string) => {
    const { data } = await supabase
      .from("wallets")
      .select("wallet_cash, wallet_bonus, wager_required, wager_completed, first_deposit_received, loan_eligible, loan_amount, last_deposit_amount")
      .eq("user_id", userId)
      .single();

    if (data) {
      setBalance(parseFloat(data.wallet_cash.toString()) + parseFloat(data.wallet_bonus.toString()));
      setWagerRequired(parseFloat(data.wager_required?.toString() || '0'));
      setWagerCompleted(parseFloat(data.wager_completed?.toString() || '0'));
      setFirstDepositReceived(data.first_deposit_received || false);
      setLoanEligible(data.loan_eligible || false);
      setLoanAmount(parseFloat(data.loan_amount?.toString() || '0'));
      setLastDepositAmount(parseFloat(data.last_deposit_amount?.toString() || '0'));
    }
  };

  const loadTransactions = async (userId: string) => {
    const query = supabase
      .from("transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (tenantId) query.eq("tenant_id", tenantId);
    const { data } = await query;
    if (data) setTransactions(data);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleInitiateDeposit = () => {
    const depositAmount = parseFloat(amount);
    if (!amount || depositAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Check minimum deposit
    const minDeposit = paymentSettings?.min_deposit || 10;
    if (depositAmount < minDeposit) {
      toast.error(`Minimum deposit amount is ${symbol}${minDeposit}`);
      return;
    }

    // Check maximum deposit
    const maxDeposit = paymentSettings?.max_deposit || 100000;
    if (depositAmount > maxDeposit) {
      toast.error(`Maximum deposit amount is ${symbol}${maxDeposit}`);
      return;
    }

    setCurrentAction("deposit");
    setShowPaymentDialog(true);
  };

  const handleInitiateWithdraw = () => {
    const withdrawAmount = parseFloat(amount);
    if (!amount || withdrawAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (withdrawAmount > balance) {
      toast.error("Insufficient balance");
      return;
    }

    // Check wager requirement
    const wagerRemaining = Math.max(0, wagerRequired - wagerCompleted);
    if (wagerRemaining > 0) {
      toast.error(
        `Complete wager requirement before withdrawing. ${symbol}${wagerRemaining.toFixed(2)} left to wager.`,
        { duration: 5000 }
      );
      return;
    }

    setCurrentAction("withdrawal");
    setShowPaymentDialog(true);
  };

  // Realtime listener for M-Pesa pending transaction
  useEffect(() => {
    if (!pendingTransactionId) return;
    const channel = supabase
      .channel(`tx-${pendingTransactionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions', filter: `id=eq.${pendingTransactionId}` },
        (payload) => {
          const status = payload.new?.status;
          if (status === 'completed') {
            setMpesaPending(false);
            setPendingTransactionId(null);
            setShowPaymentDialog(false);
            setAmount("");
            setMpesaPhone("");
            toast.success("✅ M-Pesa payment confirmed! Your wallet has been credited.");
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session) {
                loadWallet(data.session.user.id);
                loadTransactions(data.session.user.id);
              }
            });
          } else if (status === 'rejected' || status === 'failed') {
            setMpesaPending(false);
            setPendingTransactionId(null);
            setShowPaymentDialog(false);
            setAmount("");
            setMpesaPhone("");
            toast.error("❌ M-Pesa payment failed or was cancelled. Please try again.");
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [pendingTransactionId]);

  const handleSubmitTransaction = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    if (currentAction === "deposit" && paymentMethod === "upi" && paymentSettings?.show_utr_number && !utrNumber.trim()) {
      toast.error("Please enter UTR number");
      return;
    }

    if (currentAction === "deposit" && (paymentMethod === "usdt" || paymentMethod === "btc") && !transactionHash.trim()) {
      toast.error("Please enter transaction hash/ID");
      return;
    }

    if ((paymentMethod === "usdt" || paymentMethod === "btc") && currentAction === "withdrawal" && paymentSettings?.show_wallet_address && !walletAddress.trim()) {
      toast.error("Please enter your wallet address");
      return;
    }

    if (paymentMethod === "mpesa" && !mpesaPhone.trim()) {
      toast.error("Please enter your M-Pesa phone number");
      return;
    }

    setLoading(true);
    try {
      // --- M-Pesa Deposit: call STK Push edge function ---
      if (paymentMethod === "mpesa" && currentAction === "deposit") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const { data, error } = await supabase.functions.invoke("mpesa-stk-push", {
          body: { userId: session.user.id, amount: parseFloat(amount), phone: mpesaPhone.trim(), siteName: paymentSettings?.website_name || "Game", tenantId },
        });
        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "STK Push failed");
        }
        setPendingTransactionId(data.transactionId);
        setMpesaPending(true);
        setLoading(false);
        return; // Dialog stays open showing "Check your phone"
      }

      const transactionAmount = parseFloat(amount);
      let transactionStatus = "pending";

      // --- Withdrawal Threshold Check ---
      if (currentAction === "withdrawal") {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("total_deposited")
          .eq("id", session.user.id)
          .single();

        const totalDeposited = (profileData as any)?.total_deposited || 0;
        const maxAutoApproval = totalDeposited * 3;

        if (transactionAmount > maxAutoApproval) {
          transactionStatus = "requires_approval";
        }
      }

      // --- M-Pesa Withdrawal: call B2C edge function (only if auto-approved) ---
      if (paymentMethod === "mpesa" && currentAction === "withdrawal" && transactionStatus === "pending") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        // Normalize phone: 07XX → 2547XX
        let normalizedPhone = mpesaPhone.trim().replace(/\s+/g, "");
        if (normalizedPhone.startsWith("0")) normalizedPhone = "254" + normalizedPhone.slice(1);
        if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);

        const { data, error } = await supabase.functions.invoke("mpesa-b2c", {
          body: { userId: session.user.id, amount: parseFloat(amount), phone: normalizedPhone, tenantId },
        });
        if (error || !data?.success) {
          throw new Error(data?.error || error?.message || "Withdrawal failed");
        }
        toast.success("✅ Request successful! Your withdrawal is being processed.");
        setAmount("");
        setMpesaPhone("");
        setShowPaymentDialog(false);
        loadWallet(session.user.id);
        loadTransactions(session.user.id);
        setLoading(false);
        return;
      }

      const transactionData: any = {
        user_id: session.user.id,
        type: currentAction,
        amount: transactionAmount,
        status: transactionStatus,
        payment_method: paymentMethod,
        tenant_id: tenantId,
      };

      if (currentAction === "deposit" && paymentMethod === "upi") {
        transactionData.utr_number = utrNumber.trim();
      }

      if (currentAction === "deposit" && (paymentMethod === "usdt" || paymentMethod === "btc") && transactionHash.trim()) {
        transactionData.transaction_hash = transactionHash.trim();
      }

      if (walletAddress.trim()) {
        transactionData.wallet_address = walletAddress.trim();
      }

      if (paymentMethod === "mpesa" && mpesaPhone.trim()) {
        // Normalize phone: 07XX → 2547XX
        let phone = mpesaPhone.trim().replace(/\s+/g, "");
        if (phone.startsWith("0")) phone = "254" + phone.slice(1);
        if (phone.startsWith("+")) phone = phone.slice(1);
        transactionData.phone_number = phone;
      }

      const { error } = await supabase.from("transactions").insert(transactionData);

      if (error) throw error;

      if (currentAction === "withdrawal" && transactionStatus === "requires_approval") {
        toast.info("Withdrawal request submitted for manual approval (amount exceeds 3x your total deposits).");
      } else {
        toast.success(`${currentAction === "deposit" ? "Deposit" : "Withdrawal"} request submitted! Waiting for processing.`);
      }
      setAmount("");
      setUtrNumber("");
      setWalletAddress("");
      setTransactionHash("");
      setMpesaPhone("");
      setShowPaymentDialog(false);
      loadTransactions(session.user.id);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "default";
      case "pending": return "secondary";
      case "requires_approval": return "destructive";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-16">
      <DesktopNav
        isAuthenticated={true}
        onAuthRequired={() => { }}
      />
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <h1 className="text-3xl font-bold text-gradient flex items-center gap-2">
          <WalletIcon className="w-8 h-8" />
          Wallet
        </h1>

        <Card className="p-6 card-shadow">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">Current Balance</p>
            <p className="text-4xl font-bold text-success">{symbol}{balance.toFixed(2)}</p>
          </div>
        </Card>

        {!firstDepositReceived && firstDepositBonus && (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-primary">First Deposit Bonus</h3>
              </div>
              <p className="text-sm text-foreground">
                {firstDepositBonus.type === 'fixed'
                  ? `Get ${symbol}${firstDepositBonus.value.toFixed(2)} bonus on your first deposit!`
                  : `Get ${firstDepositBonus.value}% bonus on your first deposit!`
                }
              </p>
              <p className="text-xs text-muted-foreground">
                Bonus will be added to your wallet instantly after deposit approval
              </p>
            </div>
          </Card>
        )}

        <WagerProgress wagerRequired={wagerRequired} wagerCompleted={wagerCompleted} wagerEnabled={wagerEnabled} />

        <LoanSection
          loanEligible={loanEligible}
          loanAmount={loanAmount}
          lastDepositAmount={lastDepositAmount}
          loanFeatureEnabled={loanFeatureEnabled}
          onLoanGranted={() => {
            const session = supabase.auth.getSession();
            session.then(({ data }) => {
              if (data?.session) {
                loadWallet(data.session.user.id);
              }
            });
          }}
        />

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-16 p-2 bg-gradient-to-r from-slate-900/80 via-slate-800/80 to-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl">
            <TabsTrigger
              value="deposit"
              className="gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-400 data-[state=active]:via-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-emerald-500/40 data-[state=active]:scale-[1.02] transition-all duration-300 font-bold text-base"
            >
              <ArrowDownToLine className="w-5 h-5" />
              Deposit
            </TabsTrigger>
            <TabsTrigger
              value="withdraw"
              className="gap-2 rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:via-red-500 data-[state=active]:to-pink-500 data-[state=active]:text-white data-[state=active]:shadow-xl data-[state=active]:shadow-orange-500/40 data-[state=active]:scale-[1.02] transition-all duration-300 font-bold text-base"
            >
              <ArrowUpFromLine className="w-5 h-5" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4 mt-4">
            <Card className="p-6 border-2 border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-teal-500/10 shadow-xl shadow-emerald-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-400/10 via-transparent to-transparent pointer-events-none" />
              <div className="space-y-5 relative z-10">
                <div className="space-y-3">
                  <Label htmlFor="depositAmount" className="text-base font-bold flex items-center gap-2 text-emerald-400">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 animate-pulse"></span>
                    Enter Amount
                  </Label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <Input
                      id="depositAmount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="relative text-xl font-bold h-16 pl-5 pr-20 border-2 border-emerald-500/40 bg-background/80 backdrop-blur-sm focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 rounded-xl"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-xl">{symbol}</span>
                  </div>
                  {paymentSettings?.min_deposit && paymentSettings?.max_deposit && (
                    <p className="text-sm text-emerald-400/70 font-medium">
                      Min: {symbol}{paymentSettings.min_deposit} | Max: {symbol}{paymentSettings.max_deposit}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[100, 500, 1000, 5000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="lg"
                      onClick={() => setAmount(val.toString())}
                      className="border-2 border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/30 hover:border-emerald-400 hover:text-emerald-300 hover:scale-105 transition-all duration-200 font-bold text-emerald-300 rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/30"
                    >
                      {symbol}{val}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleInitiateDeposit}
                  disabled={loading}
                  className="w-full h-14 text-xl font-bold bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 hover:from-emerald-300 hover:via-green-400 hover:to-teal-400 shadow-2xl shadow-emerald-500/40 hover:shadow-emerald-400/60 hover:scale-[1.02] transition-all duration-300 rounded-xl border border-white/20"
                >
                  💰 Continue to Deposit
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw" className="space-y-4 mt-4">
            <Card className="p-6 border-2 border-orange-500/30 bg-gradient-to-br from-orange-500/10 via-red-500/5 to-pink-500/10 shadow-xl shadow-orange-500/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400/10 via-transparent to-transparent pointer-events-none" />
              <div className="space-y-5 relative z-10">
                <div className="space-y-3">
                  <Label htmlFor="withdrawAmount" className="text-base font-bold flex items-center gap-2 text-orange-400">
                    <span className="w-3 h-3 rounded-full bg-gradient-to-r from-orange-400 to-red-500 animate-pulse"></span>
                    Enter Amount
                  </Label>
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400 to-pink-500 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
                    <Input
                      id="withdrawAmount"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="relative text-xl font-bold h-16 pl-5 pr-20 border-2 border-orange-500/40 bg-background/80 backdrop-blur-sm focus:border-orange-400 focus:ring-2 focus:ring-orange-500/30 rounded-xl"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-orange-400 font-bold text-xl">{symbol}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[100, 500, 1000, 5000].map((val) => (
                    <Button
                      key={val}
                      variant="outline"
                      size="lg"
                      onClick={() => setAmount(val.toString())}
                      disabled={val > balance}
                      className="border-2 border-orange-500/50 bg-orange-500/10 hover:bg-orange-500/30 hover:border-orange-400 hover:text-orange-300 hover:scale-105 transition-all duration-200 font-bold text-orange-300 rounded-xl shadow-lg shadow-orange-500/10 hover:shadow-orange-500/30 disabled:opacity-40"
                    >
                      {symbol}{val}
                    </Button>
                  ))}
                </div>
                <Button
                  onClick={handleInitiateWithdraw}
                  disabled={loading || !withdrawalsEnabled}
                  className="w-full h-14 text-xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 hover:from-orange-300 hover:via-red-400 hover:to-pink-400 shadow-2xl shadow-orange-500/40 hover:shadow-orange-400/60 hover:scale-[1.02] transition-all duration-300 rounded-xl border border-white/20 disabled:opacity-50 disabled:grayscale"
                >
                  {withdrawalsEnabled ? "💸 Continue to Withdraw" : "Withdrawal Unavailable"}
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="p-4 md:p-6 card-shadow">
          <h2 className="text-xl font-bold mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No transactions yet</p>
            ) : (
              transactions.map((transaction) => {
                const isCrypto = transaction.payment_method?.toLowerCase().includes('btc') || transaction.payment_method?.toLowerCase().includes('usdt');
                const isBtc = transaction.payment_method?.toLowerCase().includes('btc');
                const isUsdt = transaction.payment_method?.toLowerCase().includes('usdt');
                const currencyRate = paymentSettings?.live_currency_rate || paymentSettings?.usdt_conversion_rate || 129;
                const btcRate = paymentSettings?.live_btc_rate || 100000;

                // Calculate crypto value - convert from local currency to crypto
                let cryptoValue = '';
                if (isBtc) {
                  // BTC: amount in local currency / (BTC rate in USD * local currency per USD)
                  cryptoValue = (Number(transaction.amount) / (btcRate * currencyRate)).toFixed(8);
                } else if (isUsdt) {
                  // USDT: amount in local currency / local currency per USD (USDT = 1 USD)
                  cryptoValue = (Number(transaction.amount) / currencyRate).toFixed(4);
                }

                return (
                  <div key={transaction.id} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <Badge variant={transaction.type === "deposit" ? "default" : "secondary"} className="text-xs">
                          {transaction.type}
                        </Badge>
                        <Badge variant={getStatusColor(transaction.status)} className="text-xs">
                          {transaction.status}
                        </Badge>
                        {transaction.payment_method && (
                          <Badge variant="outline" className="text-xs">{transaction.payment_method.toUpperCase()}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleString()}
                      </p>
                      {transaction.admin_notes && (
                        <p className="text-xs text-destructive mt-1 break-words">Note: {transaction.admin_notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-lg sm:text-xl font-bold whitespace-nowrap ${transaction.type === "deposit" ? "text-success" : "text-destructive"}`}>
                        {transaction.type === "deposit" ? "+" : "-"}{symbol}{Number(transaction.amount).toFixed(2)}
                      </p>
                      {isCrypto && cryptoValue && (
                        <p className="text-xs text-amber-500 font-medium">
                          ≈ {cryptoValue} {isBtc ? 'BTC' : 'USDT'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-[92vw] sm:max-w-md lg:max-w-lg border-0 bg-background/95 backdrop-blur-2xl shadow-2xl p-0 gap-0 overflow-hidden max-h-[92vh] overflow-y-auto rounded-2xl animate-slide-up">
          <div className="relative overflow-hidden">
            {/* Premium animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 pointer-events-none" />
            <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-primary/5 to-transparent pointer-events-none animate-shimmer" />

            {/* Header Section */}
            <div className="relative border-b border-border/50 backdrop-blur-xl bg-gradient-to-br from-card/90 to-card/70">
              <DialogHeader className="px-3 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 space-y-3 sm:space-y-4">
                <DialogTitle className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-br from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
                  {currentAction === "deposit" ? "Deposit Funds" : "Withdraw Funds"}
                </DialogTitle>

                {/* Amount Display Card */}
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 border border-primary/30 shadow-xl backdrop-blur-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent pointer-events-none" />
                  <div className="relative p-4 sm:p-5 lg:p-6 space-y-2 sm:space-y-3">
                    <div className="flex items-baseline gap-1.5 sm:gap-2">
                      <span className="text-xs sm:text-sm lg:text-base text-muted-foreground font-medium">Amount</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-primary via-primary/90 to-primary/70 bg-clip-text text-transparent">
                        {symbol}{amount}
                      </span>
                    </div>

                    {/* USDT Conversion */}
                    {false && amount && (
                      <div className="pt-3 sm:pt-4 border-t border-primary/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">USDT Amount</span>
                          <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                            ≈ {(() => {
                              const currencyRate = paymentSettings?.live_currency_rate || paymentSettings?.usdt_conversion_rate || USDT_RATE;
                              return (parseFloat(amount) / currencyRate).toFixed(6);
                            })()} USDT
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                          Rate: 1 USDT = {paymentSettings?.currency_symbol || symbol}
                          {paymentSettings?.live_currency_rate?.toFixed(2) || USDT_RATE} {paymentSettings?.currency_name || 'USD'}
                          {paymentSettings?.live_currency_rate && ' (Live)'}
                        </p>
                      </div>
                    )}

                    {/* BTC Conversion */}
                    {false && amount && (
                      <div className="pt-3 sm:pt-4 border-t border-primary/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">BTC Amount</span>
                          <span className="text-base sm:text-lg lg:text-xl font-bold text-primary">
                            ≈ {(() => {
                              const btcRate = paymentSettings?.live_btc_rate || 100000;
                              const currencyRate = paymentSettings?.live_currency_rate || 1;
                              return (parseFloat(amount) / (btcRate * currencyRate)).toFixed(8);
                            })()} BTC
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70">
                          Live BTC rate applied
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogHeader>
            </div>

            {/* Content Section */}
            <div className="relative px-3 sm:px-5 lg:px-6 py-4 sm:py-5 lg:py-6 space-y-4 sm:space-y-5">



              {/* Deposit Section */}
              {currentAction === "deposit" && (
                <>
                  {false && (
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

                      <div className="relative p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
                        {/* QR Code Section */}
                        <div className="text-center space-y-3 sm:space-y-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 shadow-lg backdrop-blur-sm">
                            <ArrowDownToLine className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Scan QR Code</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">Use any UPI app to complete payment</p>
                          </div>

                          <div className="flex justify-center py-2 sm:py-3">
                            {paymentSettings?.upi_qr_enabled && paymentSettings?.upi_qr_url ? (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/20">
                                <img
                                  src={paymentSettings.upi_qr_url}
                                  alt="UPI QR Code"
                                  className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px] object-contain"
                                />
                              </div>
                            ) : (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/20">
                                <QRCodeSVG
                                  value={`upi://pay?pa=${UPI_ID}&am=${amount}&cu=INR`}
                                  size={window.innerWidth < 640 ? 140 : window.innerWidth < 1024 ? 160 : 180}
                                />
                              </div>
                            )}
                          </div>

                          {/* UPI ID Display */}
                          <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-border/50 bg-muted/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                              <span className="font-mono text-xs sm:text-sm lg:text-base font-semibold text-foreground">{UPI_ID}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(UPI_ID)}
                                className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 p-0 rounded-lg hover:bg-primary/20 hover:text-primary transition-all hover:scale-110"
                              >
                                <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* UTR Input */}
                        {paymentSettings?.show_utr_number && (
                          <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-border/50">
                            <Label htmlFor="utr" className="text-xs sm:text-sm lg:text-base font-bold text-foreground flex items-center gap-1.5">
                              Transaction ID (UTR)
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="utr"
                              value={utrNumber}
                              onChange={(e) => setUtrNumber(e.target.value)}
                              placeholder="Enter 12-digit UTR number"
                              maxLength={12}
                              className="h-10 sm:h-11 lg:h-12 text-sm sm:text-base border-2 border-border/50 bg-background/50 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all rounded-lg sm:rounded-xl"
                            />
                            <p className="text-[10px] sm:text-xs text-muted-foreground">
                              You'll find this in your payment app after completing the transaction
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {false && (
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

                      <div className="relative p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
                        {/* QR Code Section */}
                        <div className="text-center space-y-3 sm:space-y-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-primary/30 shadow-lg backdrop-blur-sm">
                            <WalletIcon className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary" />
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Send USDT (TRC20)</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">Transfer to the address below</p>
                          </div>

                          <div className="flex justify-center py-2 sm:py-3">
                            {paymentSettings?.usdt_qr_enabled && paymentSettings?.usdt_qr_url ? (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/20">
                                <img
                                  src={paymentSettings.usdt_qr_url}
                                  alt="USDT QR Code"
                                  className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px] object-contain"
                                />
                              </div>
                            ) : (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-primary/20">
                                <QRCodeSVG
                                  value={USDT_ADDRESS}
                                  size={window.innerWidth < 640 ? 140 : window.innerWidth < 1024 ? 160 : 180}
                                />
                              </div>
                            )}
                          </div>

                          {/* USDT Address Display */}
                          <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-border/50 bg-muted/50 backdrop-blur-sm">
                            <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                              <span className="font-mono text-[10px] sm:text-xs lg:text-sm break-all font-medium text-foreground">{USDT_ADDRESS}</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(USDT_ADDRESS)}
                                className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 p-0 flex-shrink-0 rounded-lg hover:bg-primary/20 hover:text-primary transition-all hover:scale-110"
                              >
                                <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Transaction Hash Input */}
                        <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-border/50">
                          <Label htmlFor="usdt-tx-hash" className="text-xs sm:text-sm lg:text-base font-bold text-foreground flex items-center gap-1.5">
                            Transaction Hash/ID
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="usdt-tx-hash"
                            value={transactionHash}
                            onChange={(e) => setTransactionHash(e.target.value)}
                            placeholder="Enter your USDT transaction hash"
                            className="h-10 sm:h-11 lg:h-12 text-xs sm:text-sm font-mono border-2 border-border/50 bg-background/50 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all rounded-lg sm:rounded-xl"
                          />
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            You'll find this in your wallet after completing the transaction
                          </p>
                        </div>

                        {/* Warning Notice */}
                        <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/5 backdrop-blur-sm">
                          <div className="p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 text-center font-medium">
                              ⚠️ Only send USDT (TRC20). Other tokens may be lost permanently.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {false && (
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-border/50 bg-gradient-to-br from-card/90 to-card/70 backdrop-blur-xl shadow-xl">
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent pointer-events-none" />

                      <div className="relative p-4 sm:p-5 lg:p-6 space-y-4 sm:space-y-5">
                        {/* QR Code Section */}
                        <div className="text-center space-y-3 sm:space-y-4">
                          <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/10 border-2 border-orange-500/30 shadow-lg backdrop-blur-sm">
                            <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-orange-500">₿</span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Send BTC</h4>
                            <p className="text-xs sm:text-sm text-muted-foreground">Transfer to the address below</p>
                          </div>

                          <div className="flex justify-center py-2 sm:py-3">
                            {paymentSettings?.btc_qr_enabled && paymentSettings?.btc_qr_url ? (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-orange-500/20">
                                <img
                                  src={paymentSettings.btc_qr_url}
                                  alt="BTC QR Code"
                                  className="w-[140px] h-[140px] sm:w-[160px] sm:h-[160px] lg:w-[180px] lg:h-[180px] object-contain"
                                />
                              </div>
                            ) : BTC_ADDRESS && (
                              <div className="bg-white p-3 sm:p-4 lg:p-5 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-orange-500/20">
                                <QRCodeSVG
                                  value={`bitcoin:${BTC_ADDRESS}`}
                                  size={window.innerWidth < 640 ? 140 : window.innerWidth < 1024 ? 160 : 180}
                                />
                              </div>
                            )}
                          </div>

                          {/* BTC Address Display */}
                          {BTC_ADDRESS && (
                            <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-border/50 bg-muted/50 backdrop-blur-sm">
                              <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                                <span className="font-mono text-[10px] sm:text-xs lg:text-sm break-all font-medium text-foreground">{BTC_ADDRESS}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => copyToClipboard(BTC_ADDRESS)}
                                  className="h-8 w-8 sm:h-9 sm:w-9 lg:h-10 lg:w-10 p-0 flex-shrink-0 rounded-lg hover:bg-orange-500/20 hover:text-orange-500 transition-all hover:scale-110"
                                >
                                  <Copy className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Transaction Hash Input */}
                        <div className="space-y-2 sm:space-y-3 pt-3 sm:pt-4 border-t border-border/50">
                          <Label htmlFor="btc-tx-hash" className="text-xs sm:text-sm lg:text-base font-bold text-foreground flex items-center gap-1.5">
                            Transaction Hash/ID
                            <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="btc-tx-hash"
                            value={transactionHash}
                            onChange={(e) => setTransactionHash(e.target.value)}
                            placeholder="Enter your BTC transaction hash"
                            className="h-10 sm:h-11 lg:h-12 text-xs sm:text-sm font-mono border-2 border-border/50 bg-background/50 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all rounded-lg sm:rounded-xl"
                          />
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            You'll find this in your wallet after completing the transaction
                          </p>
                        </div>

                        {/* Warning Notice */}
                        <div className="relative overflow-hidden rounded-lg sm:rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/15 to-amber-500/5 backdrop-blur-sm">
                          <div className="p-3 sm:p-4">
                            <p className="text-xs sm:text-sm text-amber-600 dark:text-amber-400 text-center font-medium">
                              ⚠️ Only send BTC. Other tokens may be lost permanently.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {paymentMethod === "mpesa" && (
                    <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-card/90 to-card/70 backdrop-blur-xl shadow-xl">
                      <div className="relative p-4 sm:p-5 lg:p-6 space-y-4">
                        {mpesaPending ? (
                          <div className="text-center py-6 space-y-4">
                            <div className="flex justify-center">
                              <div className="w-16 h-16 rounded-full border-4 border-green-500/30 border-t-green-500 animate-spin" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-lg font-bold text-green-400">Check Your Phone!</h4>
                              <p className="text-sm text-muted-foreground">
                                We've sent an M-Pesa STK Push to <span className="text-foreground font-mono font-bold">{mpesaPhone}</span>.
                              </p>
                              <p className="text-xs text-muted-foreground italic mt-2">
                                Please enter your PIN on your phone to complete the payment.
                              </p>
                              <div className="pt-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={async () => {
                                    if (pendingTransactionId) {
                                      await supabase
                                        .from("transactions")
                                        .update({ status: "rejected", admin_notes: "Cancelled by user" })
                                        .eq("id", pendingTransactionId);
                                    }
                                    setMpesaPending(false);
                                    setPendingTransactionId(null);
                                    setShowPaymentDialog(false);
                                    setAmount("");
                                    setMpesaPhone("");
                                  }}
                                  className="text-muted-foreground border-dashed"
                                >
                                  Cancel & Close
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-center space-y-2">
                              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/30 shadow-lg">
                                <span className="text-3xl">📱</span>
                              </div>
                              <h4 className="text-base sm:text-lg font-bold text-green-400">M-Pesa STK Push</h4>
                              <p className="text-xs sm:text-sm text-muted-foreground">You'll receive a payment prompt on your phone. Enter your M-Pesa PIN to complete.</p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="mpesa-phone" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                                M-Pesa Phone Number
                                <span className="text-destructive">*</span>
                              </Label>
                              <Input
                                id="mpesa-phone"
                                type="tel"
                                value={mpesaPhone}
                                onChange={(e) => setMpesaPhone(e.target.value)}
                                placeholder="e.g. 0712345678"
                                className="h-11 sm:h-12 text-base border-2 border-green-500/40 bg-background/50 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all rounded-xl"
                              />
                              <p className="text-[10px] sm:text-xs text-muted-foreground">Enter the phone number registered with M-Pesa (07XX or 01XX format)</p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Withdrawal Section — M-Pesa only */}
              {currentAction === "withdrawal" && (
                <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border border-green-500/30 bg-gradient-to-br from-green-500/10 via-card/90 to-card/70 backdrop-blur-xl shadow-xl">
                  <div className="relative p-4 sm:p-5 lg:p-6 space-y-4">
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border-2 border-green-500/30 shadow-lg">
                        <span className="text-3xl">📱</span>
                      </div>
                      <h4 className="text-base sm:text-lg font-bold text-green-400">M-Pesa Withdrawal</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground">Funds will be sent directly to your M-Pesa number via B2C transfer.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="withdraw-mpesa-phone" className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                        M-Pesa Phone Number
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="withdraw-mpesa-phone"
                        type="tel"
                        value={mpesaPhone}
                        onChange={(e) => setMpesaPhone(e.target.value)}
                        placeholder="e.g. 0712345678"
                        className="h-11 sm:h-12 text-base border-2 border-green-500/40 bg-background/50 focus:border-green-500 focus:ring-4 focus:ring-green-500/20 transition-all rounded-xl"
                      />
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Enter the M-Pesa registered number (07XX or 01XX format)</p>
                    </div>

                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                      <p className="text-xs text-amber-400 text-center">⏱ Withdrawals are reviewed and processed within 24 hours</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmitTransaction}
                disabled={loading || mpesaPending}
                className="w-full h-11 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg font-bold bg-gradient-to-r from-primary via-primary/90 to-primary hover:from-primary/90 hover:via-primary hover:to-primary/90 shadow-xl hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 rounded-lg sm:rounded-xl relative overflow-hidden group"
              >
                <span className="relative z-10">
                  {loading ? "Processing..." : mpesaPending ? "Waiting for Payment..." : `Submit ${currentAction === "deposit" ? "Deposit" : "Withdrawal"} Request`}
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav isAuthenticated={true} />
    </div>
  );
};

export default Wallet;
