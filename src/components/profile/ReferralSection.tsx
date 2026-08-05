import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Copy, Users, TrendingUp, Check } from "lucide-react";
import { toast } from "sonner";
import { useCurrency } from "@/hooks/useCurrency";

interface ReferralData {
  code: string;
  totalReferrals: number;
  totalEarnings: number;
  betCommissionEarnings: number;
  firstDepositCommissionEarnings: number;
  referrals: Array<{
    id: string;
    referred_user_email: string;
    reward_amount: number;
    created_at: string;
    status: string;
  }>;
}

export const ReferralSection = () => {
  const { symbol } = useCurrency();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [betCommissionPercent, setBetCommissionPercent] = useState(1);
  const [firstDepositCommissionPercent, setFirstDepositCommissionPercent] = useState(10);

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get commission percentages from game settings
      const { data: settings } = await supabase
        .from('game_settings')
        .select('referral_bet_commission_percent, referral_first_deposit_commission_percent')
        .single();
      
      if (settings) {
        setBetCommissionPercent(settings.referral_bet_commission_percent);
        setFirstDepositCommissionPercent(settings.referral_first_deposit_commission_percent);
      }

      // Get user's referral code
      let { data: codeData, error: codeError } = await supabase
        .from('referral_codes')
        .select('code, total_referrals, total_earnings')
        .eq('user_id', user.id)
        .single();

      // If user doesn't have a referral code, create one
      if (codeError && codeError.code === 'PGRST116') {
        // Generate a new referral code
        const { data: generatedCode } = await supabase
          .rpc('generate_referral_code');

        if (!generatedCode) {
          console.error('Error generating referral code');
          setLoading(false);
          return;
        }

        const { data: newCodeData, error: createError } = await supabase
          .from('referral_codes')
          .insert({ 
            user_id: user.id,
            code: generatedCode
          })
          .select('code, total_referrals, total_earnings')
          .single();

        if (createError) {
          console.error('Error creating referral code:', createError);
          setLoading(false);
          return;
        }

        codeData = newCodeData;
      } else if (codeError) {
        console.error('Error loading referral code:', codeError);
        setLoading(false);
        return;
      }

      // Get list of referrals
      const { data: referralsData, error: referralsError } = await supabase
        .from('referrals')
        .select(`
          id,
          reward_amount,
          created_at,
          status,
          referred_user_id
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (referralsError) {
        console.error('Error loading referrals:', referralsError);
      }

      // Get commission transactions
      const { data: commissions } = await supabase
        .from('commission_transactions')
        .select('*')
        .eq('referrer_id', user.id);

      const betCommissionTotal = (commissions || [])
        .filter(c => c.commission_type === 'bet_commission')
        .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

      const firstDepositCommissionTotal = (commissions || [])
        .filter(c => c.commission_type === 'first_deposit_commission')
        .reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);

      // Get emails for referred users
      const referralsWithEmails = await Promise.all(
        (referralsData || []).map(async (ref) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', ref.referred_user_id)
            .single();

          return {
            ...ref,
            referred_user_email: profile?.email || 'Unknown',
          };
        })
      );

      setReferralData({
        code: codeData.code,
        totalReferrals: codeData.total_referrals,
        totalEarnings: typeof codeData.total_earnings === 'string' 
          ? parseFloat(codeData.total_earnings) 
          : codeData.total_earnings,
        betCommissionEarnings: betCommissionTotal,
        firstDepositCommissionEarnings: firstDepositCommissionTotal,
        referrals: referralsWithEmails,
      });
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralData) return;
    
    const referralLink = `${window.location.origin}/auth?ref=${referralData.code}`;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    if (!referralData) return;
    
    navigator.clipboard.writeText(referralData.code);
    setCopied(true);
    toast.success("Referral code copied!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <Card className="p-6 card-shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  if (!referralData) {
    return null;
  }

  return (
    <Card className="p-6 card-shadow space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Gift className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Refer & Earn</h2>
          <p className="text-sm text-muted-foreground">Invite friends and earn {symbol}50 per referral!</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Users className="w-4 h-4" />
            <span className="text-xs">Total Referrals</span>
          </div>
          <p className="text-2xl font-bold text-primary">{referralData.totalReferrals}</p>
        </div>

        <div className="bg-gradient-to-br from-success/10 to-primary/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Total Earned</span>
          </div>
          <p className="text-2xl font-bold text-success">{symbol}{referralData.totalEarnings.toFixed(2)}</p>
        </div>
      </div>

      {/* Commission Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Bet Commissions ({betCommissionPercent}%)</p>
          <p className="text-lg font-semibold text-primary">{symbol}{referralData.betCommissionEarnings.toFixed(2)}</p>
        </Card>
        <Card className="bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground mb-1">Deposit Commissions ({firstDepositCommissionPercent}%)</p>
          <p className="text-lg font-semibold text-success">{symbol}{referralData.firstDepositCommissionEarnings.toFixed(2)}</p>
        </Card>
      </div>

      {/* Referral Code Section */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Your Referral Code</Label>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-lg p-4 font-mono text-lg font-bold text-center tracking-wider">
            {referralData.code}
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={copyReferralCode}
            className="h-auto"
          >
            {copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}
          </Button>
        </div>
        <Button
          onClick={copyReferralLink}
          className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90"
        >
          <Copy className="w-4 h-4 mr-2" />
          Copy Referral Link
        </Button>
      </div>

      {/* How it works */}
      <div className="bg-muted/50 rounded-lg p-4 space-y-2">
        <h3 className="font-semibold text-sm">How it works:</h3>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span>Share your referral code or link with friends</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span>They sign up using your code - you both earn {symbol}50 bonus!</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span>When they place bets, you earn {betCommissionPercent}% commission</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">4.</span>
            <span>On their first deposit, you earn {firstDepositCommissionPercent}% commission</span>
          </li>
        </ul>
      </div>

      {/* Referrals List */}
      {referralData.referrals.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm font-medium">Your Referrals ({referralData.referrals.length})</Label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {referralData.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{referral.referred_user_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(referral.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge
                  variant={referral.status === 'completed' ? 'default' : 'secondary'}
                  className="ml-2"
                >
                  +{symbol}{referral.reward_amount}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}