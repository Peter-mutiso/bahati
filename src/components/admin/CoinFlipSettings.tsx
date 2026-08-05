import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, TrendingUp, DollarSign, Coins, Eye } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

export const CoinFlipSettings = () => {
  const { symbol } = useCurrency();
  const queryClient = useQueryClient();
  const [rtpPercentage, setRtpPercentage] = useState(95);
  const [autoRtpEnabled, setAutoRtpEnabled] = useState(true);
  const [rtpMode, setRtpMode] = useState("balanced");
  const [minBet, setMinBet] = useState(10);
  const [maxBet, setMaxBet] = useState(10000);
  const [bettingDuration, setBettingDuration] = useState(15);
  const [flipDuration, setFlipDuration] = useState(3);
  const [manualResultEnabled, setManualResultEnabled] = useState(false);
  const [manualResult, setManualResult] = useState<string | null>(null);

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["coin-flip-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_flip_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Current round (betting or flipping) for the live outcome forecast
  const { data: currentRound } = useQuery({
    queryKey: ["coin-flip-current-round"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_flip_rounds")
        .select("*")
        .in("status", ["betting", "flipping"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    refetchInterval: 2000,
  });

  // Live bet totals for the current round
  const { data: currentRoundBets } = useQuery({
    queryKey: ["coin-flip-current-round-bets", currentRound?.id],
    queryFn: async () => {
      if (!currentRound?.id) return [];
      const { data, error } = await supabase
        .from("coin_flip_bets")
        .select("side, amount")
        .eq("round_id", currentRound.id);

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentRound?.id,
    refetchInterval: 2000,
  });

  // Most recently completed round's actual result
  const { data: lastCompletedRound } = useQuery({
    queryKey: ["coin-flip-last-completed-round"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_flip_rounds")
        .select("*")
        .eq("status", "completed")
        .order("finished_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    refetchInterval: 5000,
  });

  const { data: todayStats } = useQuery({
    queryKey: ["coin-flip-today-stats"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("coin_flip_stats")
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
    queryKey: ["coin-flip-all-time-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coin_flip_stats")
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
      setBettingDuration(settings.betting_duration_seconds || 15);
      setFlipDuration(settings.flip_duration_seconds || 3);
      setManualResultEnabled(settings.manual_result_enabled || false);
      setManualResult(settings.manual_result || null);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("coin_flip_settings")
        .update({
          rtp_percentage: rtpPercentage,
          house_edge: 100 - rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
          betting_duration_seconds: bettingDuration,
          flip_duration_seconds: flipDuration,
          manual_result_enabled: manualResultEnabled,
          manual_result: manualResult,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("id", settings?.id);

      if (error) throw error;

      // Log activity
      await supabase.from("admin_activity_logs").insert({
        admin_id: user.id,
        action_type: "settings_update",
        description: "Updated Coin Flip game settings",
        old_value: JSON.stringify(settings),
        new_value: JSON.stringify({
          rtp_percentage: rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          min_bet: minBet,
          max_bet: maxBet,
          betting_duration_seconds: bettingDuration,
          flip_duration_seconds: flipDuration,
          manual_result_enabled: manualResultEnabled,
          manual_result: manualResult,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["coin-flip-settings"] });
      toast.success("Coin Flip settings updated successfully");
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

  const headsTotal = (currentRoundBets || [])
    .filter((b) => b.side === "heads")
    .reduce((sum, b) => sum + b.amount, 0);
  const tailsTotal = (currentRoundBets || [])
    .filter((b) => b.side === "tails")
    .reduce((sum, b) => sum + b.amount, 0);

  const headsLoss = headsTotal * 1.95 - tailsTotal;
  const tailsLoss = tailsTotal * 1.95 - headsTotal;
  const houseFavorableSide: "heads" | "tails" = headsLoss < tailsLoss ? "heads" : "tails";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Coin Flip RTP Settings
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
                  Auto-adjust results to maintain target RTP
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bettingDuration">Betting Duration (seconds)</Label>
              <Input
                id="bettingDuration"
                type="number"
                min="5"
                max="60"
                value={bettingDuration}
                onChange={(e) => setBettingDuration(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="flipDuration">Flip Animation Duration (seconds)</Label>
              <Input
                id="flipDuration"
                type="number"
                min="1"
                max="10"
                value={flipDuration}
                onChange={(e) => setFlipDuration(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual Result Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Switch
              checked={manualResultEnabled}
              onCheckedChange={setManualResultEnabled}
            />
            <span className="text-sm">
              {manualResultEnabled ? "Manual control enabled" : "Random results (default)"}
            </span>
          </div>
          
          {manualResultEnabled && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setManualResult("heads")}
                className={`p-4 rounded-lg border text-center transition-all ${
                  manualResult === "heads"
                    ? "border-yellow-500 bg-yellow-500/10"
                    : "border-border hover:border-yellow-500/50"
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-yellow-900">H</span>
                </div>
                <div className="font-medium">Heads</div>
              </button>
              <button
                onClick={() => setManualResult("tails")}
                className={`p-4 rounded-lg border text-center transition-all ${
                  manualResult === "tails"
                    ? "border-gray-400 bg-gray-400/10"
                    : "border-border hover:border-gray-400/50"
                }`}
              >
                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mb-2">
                  <span className="text-xl font-bold text-gray-800">T</span>
                </div>
                <div className="font-medium">Tails</div>
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            ⚠️ Manual control overrides RTP settings for the next round only
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Live Outcome
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Unlike some games, the coin flip result isn't decided until the round resolves —
            it depends on live bet totals and RTP. This shows what would happen right now.
          </p>

          {manualResultEnabled && manualResult ? (
            <div className="p-4 rounded-lg border border-yellow-500/50 bg-yellow-500/10">
              <div className="text-sm text-muted-foreground">Manual override active</div>
              <div className="text-lg font-bold capitalize">{manualResult}</div>
              <div className="text-xs text-muted-foreground">This result will be forced for the next round</div>
            </div>
          ) : currentRound ? (
            <div className="p-4 rounded-lg border bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground capitalize">Round status: {currentRound.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Heads Bets</div>
                  <div className="text-lg font-bold">{symbol}{headsTotal.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tails Bets</div>
                  <div className="text-lg font-bold">{symbol}{tailsTotal.toLocaleString()}</div>
                </div>
              </div>
              {(headsTotal > 0 || tailsTotal > 0) && (
                <div className="text-sm">
                  House-favorable side right now:{" "}
                  <span className="font-bold capitalize">{houseFavorableSide}</span>
                  <span className="text-xs text-muted-foreground">
                    {" "}(picked with {(100 - rtpPercentage).toFixed(0)}% chance if this holds)
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No active round right now.
            </div>
          )}

          {lastCompletedRound && (
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="text-xs text-muted-foreground">Last completed round result</div>
              <div className="text-base font-bold capitalize">{lastCompletedRound.result}</div>
            </div>
          )}
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
          "Save Coin Flip Settings"
        )}
      </Button>
    </div>
  );
};
