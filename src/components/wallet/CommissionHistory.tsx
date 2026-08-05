import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingUp } from "lucide-react";

export const CommissionHistory = () => {
  const { symbol } = useCurrency();
  const [commissions, setCommissions] = useState<any[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    loadCommissions();
  }, []);

  const loadCommissions = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data } = await supabase
      .from('commission_transactions')
      .select('*')
      .eq('referrer_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setCommissions(data);
      const total = data.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0);
      setTotalEarnings(total);
    }
  };

  if (commissions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5" />
          Commission Earnings
        </CardTitle>
        <div className="text-2xl font-bold text-primary">
          {symbol}{totalEarnings.toFixed(2)}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {commissions.map((commission) => (
          <div
            key={commission.id}
            className="flex justify-between items-center p-3 rounded-lg bg-muted/50"
          >
            <div>
              <Badge variant={commission.commission_type === 'bet_commission' ? 'secondary' : 'default'}>
                {commission.commission_type === 'bet_commission' ? 'Bet Commission' : 'First Deposit'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(commission.created_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-green-500">
                +{symbol}{parseFloat(commission.amount).toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
