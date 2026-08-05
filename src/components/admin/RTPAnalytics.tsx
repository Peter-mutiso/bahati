import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BarChart3, History } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const RTPAnalytics = () => {
  const { data: weeklyStats } = useQuery({
    queryKey: ["game-stats-weekly"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("game_stats")
        .select("*")
        .order("date", { ascending: true })
        .limit(7);

      if (error) throw error;
      
      return data?.map(stat => ({
        date: format(new Date(stat.date), "MMM dd"),
        targetRTP: 95,
        actualRTP: stat.total_wagered > 0 
          ? Number((Number(stat.total_paidout) / Number(stat.total_wagered) * 100).toFixed(2))
          : 0,
        profit: Number(stat.current_profit_percent).toFixed(2),
      })) || [];
    },
    refetchInterval: 30000,
  });

  const { data: activityLogs } = useQuery({
    queryKey: ["admin-activity-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_activity_logs")
        .select(`
          *,
          profiles:admin_id (email)
        `)
        .eq("action_type", "rtp_change")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            RTP Analytics - Last 7 Days
          </CardTitle>
          <CardDescription>
            Compare target RTP vs actual RTP and platform profit percentage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={weeklyStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="targetRTP" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                name="Target RTP %"
              />
              <Line 
                type="monotone" 
                dataKey="actualRTP" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                name="Actual RTP %"
              />
              <Line 
                type="monotone" 
                dataKey="profit" 
                stroke="hsl(var(--success))" 
                strokeWidth={2}
                name="Profit %"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            RTP Change History
          </CardTitle>
          <CardDescription>
            Track all RTP modifications made by administrators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLogs?.map((log) => {
                const oldVal = log.old_value ? JSON.parse(log.old_value) : null;
                const newVal = log.new_value ? JSON.parse(log.new_value) : null;
                
                return (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {(log.profiles as any)?.email || "Unknown"}
                    </TableCell>
                    <TableCell className="text-sm">{log.description}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {oldVal ? `${oldVal.rtp_percentage}%` : "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {newVal ? `${newVal.rtp_percentage}%` : "-"}
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!activityLogs || activityLogs.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No RTP changes recorded yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RTPAnalytics;