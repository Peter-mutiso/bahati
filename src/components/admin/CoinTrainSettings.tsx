import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp, DollarSign, Train } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

export const CoinTrainSettings = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const [rtpPercentage, setRtpPercentage] = useState(95);
  const [autoRtpEnabled, setAutoRtpEnabled] = useState(true);
  const [rtpMode, setRtpMode] = useState("balanced");
  const [minBet, setMinBet] = useState(10);
  const [maxBet, setMaxBet] = useState(10000);
  const [preparingDuration, setPreparingDuration] = useState(10);
  const [useManualCrashPoint, setUseManualCrashPoint] = useState(false);
  const [manualCrashPoints, setManualCrashPoints] = useState<string>("");

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["coin-train-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_train_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: todayStats } = useQuery({
    queryKey: ["coin-train-today-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("coin_train_stats")
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
    queryKey: ["coin-train-all-time-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_train_stats")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      const totals = (data || []).reduce(
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
      setRtpPercentage(settings.rtp_percentage || 95);
      setAutoRtpEnabled(settings.auto_rtp_enabled || true);
      setRtpMode(settings.rtp_mode || "balanced");
      setMinBet(settings.min_bet || 10);
      setMaxBet(settings.max_bet || 10000);
      setPreparingDuration(settings.preparing_duration_seconds || 10);
      setUseManualCrashPoint(settings.use_manual_crash_point || false);
      setManualCrashPoints((settings.manual_crash_points || []).join(", "));
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const parsedCrashPoints = manualCrashPoints
        .split(",")
        .map(p => parseFloat(p.trim()))
        .filter(p => !isNaN(p) && p >= 1.01);

      const { error } = await supabase
        .from("coin_train_settings")
        .update({
          rtp_percentage: rtpPercentage,
          house_edge: 100 - rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
          preparing_duration_seconds: preparingDuration,
          use_manual_crash_point: useManualCrashPoint,
          manual_crash_points: parsedCrashPoints,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", settings?.id);

      if (error) throw error;

      // Log activity
      await supabase.from("admin_activity_logs").insert({
        admin_id: user.id,
        action_type: "settings_update",
        description: "Updated Coin Train game settings",
        old_value: JSON.stringify(settings),
        new_value: JSON.stringify({
          rtp_percentage: rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
          preparing_duration_seconds: preparingDuration,
          use_manual_crash_point: useManualCrashPoint,
          manual_crash_points: parsedCrashPoints,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coin-train-settings"] });
      toast.success("Coin Train settings updated successfully");
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
        setRtpPercentage(30);
        break;
      case "conservative":
        setRtpPercentage(80);
        break;
      case "balanced":
        setRtpPercentage(95);
        break;
      case "generous":
        setRtpPercentage(97);
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
          <CardTitle className="flex items-center gap-2">
            <Train className="w-5 h-5" />
            Coin Train RTP Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">RTP Mode</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                {[
                  { id: "low", label: "Low (30%)", desc: "70% house edge" },
                  { id: "conservative", label: "Conservative (80%)", desc: "20% house edge" },
                  { id: "balanced", label: "Balanced (95%)", desc: "5% house edge" },
                  { id: "generous", label: "Generous (97%)", desc: "3% house edge" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      rtpMode === mode.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{mode.label}</div>
                    <div className="text-xs text-muted-foreground">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rtp">Target RTP Percentage</Label>
                <Input
                  id="rtp"
                  type="number"
                  min="30"
                  max="99"
                  value={rtpPercentage}
                  onChange={(e) => setRtpPercentage(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  House edge: {(100 - rtpPercentage).toFixed(2)}%
                </p>
              </div>

              <div className="space-y-2">
                <Label>Auto RTP Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={autoRtpEnabled}
                    onCheckedChange={setAutoRtpEnabled}
                  />
                  <span className="text-sm text-muted-foreground">
                    {autoRtpEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Auto-adjust crash points to maintain target RTP
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bet Limits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minBet">Minimum Bet ({symbol})</Label>
              <Input
                id="minBet"
                type="number"
                min="1"
                value={minBet}
                onChange={(e) => setMinBet(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxBet">Maximum Bet ({symbol})</Label>
              <Input
                id="maxBet"
                type="number"
                min="1"
                value={maxBet}
                onChange={(e) => setMaxBet(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Game Timing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="preparingDuration">Preparing Duration (seconds)</Label>
            <Input
              id="preparingDuration"
              type="number"
              min="5"
              max="60"
              value={preparingDuration}
              onChange={(e) => setPreparingDuration(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Time before the train starts moving
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Crash Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={useManualCrashPoint}
              onCheckedChange={setUseManualCrashPoint}
            />
            <span className="text-sm">
              {useManualCrashPoint ? "Manual crash points enabled" : "Random crash points (default)"}
            </span>
          </div>
          
          {useManualCrashPoint && (
            <div className="space-y-2">
              <Label htmlFor="crashPoints">Manual Crash Points</Label>
              <Input
                id="crashPoints"
                placeholder="1.5, 2.0, 3.5, 10.0"
                value={manualCrashPoints}
                onChange={(e) => setManualCrashPoints(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter comma-separated crash point values (min 1.01). These will be used in sequence.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            ⚠️ Manual control overrides RTP settings
          </p>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Today's Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Wagered</span>
              <span className="font-medium">{symbol}{todayStats?.total_wagered?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paidout</span>
              <span className="font-medium">{symbol}{todayStats?.total_paidout?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Bets</span>
              <span className="font-medium">{todayStats?.total_bets || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual RTP</span>
              <span className={`font-medium ${actualRTP > rtpPercentage ? "text-red-500" : "text-green-500"}`}>
                {actualRTP.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              All-Time Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Wagered</span>
              <span className="font-medium">{symbol}{allTimeStats?.total_wagered?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Paidout</span>
              <span className="font-medium">{symbol}{allTimeStats?.total_paidout?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Profit</span>
              <span className={`font-medium ${(allTimeStats?.profit || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                {symbol}{allTimeStats?.profit?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Actual RTP</span>
              <span className={`font-medium ${allTimeActualRTP > rtpPercentage ? "text-red-500" : "text-green-500"}`}>
                {allTimeActualRTP.toFixed(2)}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="w-full"
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Coin Train Settings"
        )}
      </Button>
    </div>
  );
};