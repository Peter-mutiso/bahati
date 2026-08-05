import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

export const PlinkoSettings = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const [rtpPercentage, setRtpPercentage] = useState(98);
  const [autoRtpEnabled, setAutoRtpEnabled] = useState(false);
  const [rtpMode, setRtpMode] = useState("balanced");
  const [minBet, setMinBet] = useState(1);
  const [maxBet, setMaxBet] = useState(10000);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["plinko-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plinko_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: todayStats } = useQuery({
    queryKey: ["plinko-today-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("plinko_stats")
        .select("*")
        .eq("date", today)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || {
        total_wagered: 0,
        total_paidout: 0,
        total_bets: 0,
        current_profit_percent: 0,
      };
    },
  });

  const { data: allTimeStats } = useQuery({
    queryKey: ["plinko-all-time-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plinko_stats")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const totals = data.reduce(
        (acc, stat) => ({
          total_wagered: acc.total_wagered + (stat.total_wagered || 0),
          total_paidout: acc.total_paidout + (stat.total_paidout || 0),
          total_bets: acc.total_bets + (stat.total_bets || 0),
        }),
        { total_wagered: 0, total_paidout: 0, total_bets: 0 }
      );

      const profit = totals.total_wagered - totals.total_paidout;
      const profitPercent =
        totals.total_wagered > 0
          ? (profit / totals.total_wagered) * 100
          : 0;

      return {
        ...totals,
        profit,
        current_profit_percent: profitPercent,
      };
    },
  });

  useEffect(() => {
    if (settings) {
      setRtpPercentage(settings.rtp_percentage || 98);
      setAutoRtpEnabled(settings.auto_rtp_enabled || false);
      setRtpMode(settings.rtp_mode || "balanced");
      setMinBet(settings.min_bet || 1);
      setMaxBet(settings.max_bet || 10000);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("plinko_settings")
        .update({
          rtp_percentage: rtpPercentage,
          house_edge: (100 - rtpPercentage) / 100,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", "00000000-0000-0000-0000-000000000001");

      if (error) throw error;

      // Log activity
      await supabase.from("admin_activity_logs").insert({
        admin_id: user.id,
        action_type: "settings_update",
        description: "Updated Plinko game settings",
        old_value: JSON.stringify(settings),
        new_value: JSON.stringify({
          rtp_percentage: rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plinko-settings"] });
      toast.success("Plinko settings updated successfully");
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error("Failed to update settings");
    },
  });

  const handleSave = () => {
    if (rtpPercentage < 30 || rtpPercentage > 99) {
      toast.error("RTP must be between 30% and 99%");
      return;
    }

    if (minBet >= maxBet) {
      toast.error("Min bet must be less than max bet");
      return;
    }

    updateMutation.mutate();
  };

  const handleModeChange = (mode: string) => {
    setRtpMode(mode);
    switch (mode) {
      case "low":
        setRtpPercentage(30); // 70% house edge
        break;
      case "conservative":
        setRtpPercentage(80); // 20% house edge
        break;
      case "balanced":
        setRtpPercentage(98); // 2% house edge
        break;
      case "generous":
        setRtpPercentage(99); // 1% house edge
        break;
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const actualRTP = todayStats && todayStats.total_wagered > 0
    ? (todayStats.total_paidout / todayStats.total_wagered) * 100
    : 0;

  const allTimeActualRTP = allTimeStats && allTimeStats.total_wagered > 0
    ? (allTimeStats.total_paidout / allTimeStats.total_wagered) * 100
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Plinko RTP Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label>Target RTP Percentage</Label>
              <Input
                type="number"
                min="30"
                max="99"
                step="0.1"
                value={rtpPercentage}
                onChange={(e) => setRtpPercentage(Number(e.target.value))}
                className="mt-2"
              />
              <p className="text-sm text-muted-foreground mt-1">
                House Edge: {(100 - rtpPercentage).toFixed(2)}% (30% RTP = 70% Profit)
              </p>
            </div>

            <div className="space-y-2">
              <Label>RTP Mode (House Edge: Low 70%, Conservative 20%, Balanced 2%, Generous 1%)</Label>
              <div className="grid grid-cols-4 gap-2">
                {["low", "conservative", "balanced", "generous"].map((mode) => (
                  <Button
                    key={mode}
                    variant={rtpMode === mode ? "default" : "outline"}
                    onClick={() => handleModeChange(mode)}
                    className="capitalize"
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Auto RTP Adjustment</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically adjust outcomes to maintain target RTP
                </p>
              </div>
              <Switch
                checked={autoRtpEnabled}
                onCheckedChange={setAutoRtpEnabled}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min Bet ({symbol})</Label>
                <Input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Max Bet ({symbol})</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={maxBet}
                  onChange={(e) => setMaxBet(Number(e.target.value))}
                  className="mt-2"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Plinko Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Stats</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Wagered</span>
                <span className="font-medium">{symbol}{todayStats?.total_wagered?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Paid Out</span>
                <span className="font-medium">{symbol}{todayStats?.total_paidout?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit</span>
                <span className="font-medium">
                  {symbol}{((todayStats?.total_wagered || 0) - (todayStats?.total_paidout || 0)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Actual RTP</span>
                <span className="font-medium">{actualRTP.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">All Time Stats</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Wagered</span>
                <span className="font-medium">{symbol}{allTimeStats?.total_wagered?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Paid Out</span>
                <span className="font-medium">{symbol}{allTimeStats?.total_paidout?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit</span>
                <span className="font-medium">{symbol}{allTimeStats?.profit?.toFixed(2) || "0.00"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Actual RTP</span>
                <span className="font-medium">{allTimeActualRTP.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
