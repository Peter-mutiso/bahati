import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

const ActivityLog = () => {
  const { symbol } = useCurrency();
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-log"],
    queryFn: async () => {
      // Get recent transactions
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (txError) throw txError;

      // Get recent bets
      const { data: bets, error: betsError } = await supabase
        .from("bets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (betsError) throw betsError;

      // Fetch user emails separately
      const txWithEmails = await Promise.all(
        transactions.map(async (t) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", t.user_id)
            .maybeSingle();

          return {
            type: 'transaction' as const,
            subtype: t.type,
            email: profile?.email || 'Unknown',
            amount: t.amount,
            status: t.status,
            timestamp: t.created_at,
          };
        })
      );

      const betsWithEmails = await Promise.all(
        bets.map(async (b) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", b.user_id)
            .maybeSingle();

          return {
            type: 'bet' as const,
            subtype: b.status,
            email: profile?.email || 'Unknown',
            amount: b.amount,
            profit: b.profit,
            timestamp: b.created_at,
          };
        })
      );

      // Combine and sort by timestamp
      const combined = [...txWithEmails, ...betsWithEmails]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      return combined.slice(0, 50);
    },
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading activity log...</div>;
  }

  const getActivityBadge = (activity: any) => {
    if (activity.type === 'transaction') {
      return (
        <Badge variant={activity.subtype === 'deposit' ? 'default' : 'secondary'}>
          {activity.subtype}
        </Badge>
      );
    }
    return (
      <Badge variant={
        activity.subtype === 'won' ? 'default' : 
        activity.subtype === 'lost' ? 'destructive' : 
        'outline'
      }>
        {activity.subtype}
      </Badge>
    );
  };

  const getActivityDescription = (activity: any) => {
    if (activity.type === 'transaction') {
      return `${activity.subtype} ${symbol}${Number(activity.amount).toFixed(2)}`;
    }
    return `Bet ${symbol}${Number(activity.amount).toFixed(2)} ${
      activity.profit ? `→ ${activity.profit > 0 ? '+' : ''}${symbol}${Number(activity.profit).toFixed(2)}` : ''
    }`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Activity Log
        </CardTitle>
        <CardDescription>Recent platform activity</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No recent activity
                    </TableCell>
                  </TableRow>
                ) : (
                  activities?.map((activity, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{activity.email}</TableCell>
                      <TableCell>{getActivityBadge(activity)}</TableCell>
                      <TableCell>{getActivityDescription(activity)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ActivityLog;
