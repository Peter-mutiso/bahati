import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Coins, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrency } from "@/hooks/useCurrency";

interface LoanSectionProps {
  loanEligible: boolean;
  loanAmount: number;
  lastDepositAmount: number;
  onLoanGranted: () => void;
  loanFeatureEnabled?: boolean;
}

export const LoanSection = ({ 
  loanEligible, 
  loanAmount, 
  lastDepositAmount,
  onLoanGranted,
  loanFeatureEnabled = true
}: LoanSectionProps) => {
  const { symbol } = useCurrency();
  const [requesting, setRequesting] = useState(false);

  // Don't show loan section if feature is disabled
  if (!loanFeatureEnabled) {
    return null;
  }

  const handleRequestLoan = async () => {
    setRequesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please login first");
        return;
      }

      const { data, error } = await supabase.functions.invoke('process-loan', {
        body: { userId: session.user.id }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        onLoanGranted();
      } else {
        toast.error(data.error || 'Failed to process loan');
      }
    } catch (error: any) {
      console.error('Loan request error:', error);
      toast.error(error.message || 'Failed to request loan');
    } finally {
      setRequesting(false);
    }
  };

  // Always show the loan section for visibility
  if (!loanEligible) {
    return (
      <Card className="p-4 bg-muted/50 border-muted">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-muted">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Loan Feature</p>
            <p className="text-xs text-muted-foreground">
              Make your first deposit to become eligible for loan credits
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (loanAmount > 0) {
    return (
      <Card className="p-4 bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-destructive/20">
            <Coins className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Active Loan</p>
            <p className="text-xs text-muted-foreground">
              Outstanding: {symbol}{loanAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <Alert className="mt-3 bg-background/50">
          <AlertDescription className="text-xs">
            Your loan will be auto-recovered from your next deposit and game profits
          </AlertDescription>
        </Alert>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-accent/10 border-accent/20">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-full bg-accent/20">
          <Coins className="w-5 h-5 text-accent-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Loan Available</p>
          <p className="text-xs text-muted-foreground">
            Based on your last deposit
          </p>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">Credit Amount:</span>
        <span className="text-lg font-bold text-accent-foreground">
          {symbol}{lastDepositAmount.toFixed(2)}
        </span>
      </div>

      <Button 
        onClick={handleRequestLoan}
        disabled={requesting}
        className="w-full"
        variant="default"
      >
        {requesting ? "Processing..." : "Get Loan Credit"}
      </Button>

      <Alert className="mt-3 bg-background/50">
        <AlertDescription className="text-xs">
          This loan will be recovered automatically from your next deposits and winnings
        </AlertDescription>
      </Alert>
    </Card>
  );
};
