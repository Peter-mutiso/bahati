import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Bike, Sparkles, User, Flag, Plus, Minus, Activity, Eye } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";

interface CyclistCustomization {
  name: string;
  flag: string;
}

interface LiveBetPool {
  cyclist_number: number;
  total_amount: number;
  bet_count: number;
}

export function CycleRaceSettings() {
  const queryClient = useQueryClient();
  const { symbol: currencySymbol } = useCurrency();
  
  const { data: settings, isLoading } = useQuery({
    queryKey: ["cycling-race-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycling_race_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch active race for live betting pool
  const { data: activeRace } = useQuery({
    queryKey: ["cycling-race-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycling_race_races")
        .select("*")
        .in("status", ["preparing", "betting", "racing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    refetchInterval: 3000
  });

  // Fetch most recent race overall (includes finished) for the Outcome tab
  const { data: latestRace } = useQuery({
    queryKey: ["cycling-race-latest"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycling_race_races")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    refetchInterval: 3000
  });

  // Fetch live betting pool for current round
  const { data: liveBetPool, refetch: refetchBetPool } = useQuery({
    queryKey: ["cycling-race-live-pool", activeRace?.id],
    queryFn: async () => {
      if (!activeRace?.id) return [];
      
      const { data, error } = await supabase
        .from("cycling_race_bets")
        .select("cyclist_number, amount")
        .eq("race_id", activeRace.id)
        .eq("status", "pending");
      
      if (error) throw error;
      
      // Aggregate by cyclist
      const poolMap = new Map<number, { total_amount: number; bet_count: number }>();
      data?.forEach(bet => {
        const existing = poolMap.get(bet.cyclist_number) || { total_amount: 0, bet_count: 0 };
        poolMap.set(bet.cyclist_number, {
          total_amount: existing.total_amount + bet.amount,
          bet_count: existing.bet_count + 1
        });
      });
      
      return Array.from(poolMap.entries()).map(([cyclist_number, stats]) => ({
        cyclist_number,
        ...stats
      })) as LiveBetPool[];
    },
    enabled: !!activeRace?.id,
    refetchInterval: 1000
  });

  // Real-time subscription for bet updates
  useEffect(() => {
    if (!activeRace?.id) return;

    const channel = supabase
      .channel('admin-live-bets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cycling_race_bets',
          filter: `race_id=eq.${activeRace.id}`
        },
        () => {
          refetchBetPool();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRace?.id, refetchBetPool]);

  const defaultCyclistNames = ["Lightning", "Thunder", "Storm", "Blaze", "Flash", "Rocket", "Turbo", "Bolt", "Swift", "Arrow"];
  const defaultFlags = ["🇰🇪", "🇺🇸", "🇬🇧", "🇯🇵", "🇩🇪", "🇫🇷", "🇧🇷", "🇦🇺", "🇨🇦", "🇰🇷"];

  const [formData, setFormData] = useState<{
    min_bet: number;
    max_bet: number;
    race_duration_seconds: number;
    betting_duration_seconds: number;
    number_of_cyclists: number;
    rtp_percentage: number;
    rtp_mode: string;
    house_edge: number;
    auto_rtp_enabled: boolean;
    manual_winner_enabled: boolean;
    manual_winner_cyclist: number;
    use_custom_odds: boolean;
    cyclist_odds: number[];
    cyclist_customization: CyclistCustomization[];
  }>({
    min_bet: 10,
    max_bet: 10000,
    race_duration_seconds: 30,
    betting_duration_seconds: 15,
    number_of_cyclists: 10,
    rtp_percentage: 95,
    rtp_mode: "high",
    house_edge: 5,
    auto_rtp_enabled: true,
    manual_winner_enabled: false,
    manual_winner_cyclist: 1,
    use_custom_odds: false,
    cyclist_odds: [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0],
    cyclist_customization: defaultCyclistNames.map((name, i) => ({ name, flag: defaultFlags[i] })),
  });

  // Sync formData with loaded settings
  useEffect(() => {
    if (settings) {
      const loadedOdds = Array.isArray(settings.cyclist_odds) 
        ? settings.cyclist_odds as number[]
        : [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0, 15.0];
      
      const loadedCustomization = Array.isArray(settings.cyclist_customization)
        ? (settings.cyclist_customization as unknown as CyclistCustomization[])
        : defaultCyclistNames.map((name, i) => ({ name, flag: defaultFlags[i] }));
      
      setFormData({
        min_bet: settings.min_bet,
        max_bet: settings.max_bet,
        race_duration_seconds: settings.race_duration_seconds,
        betting_duration_seconds: settings.betting_duration_seconds,
        number_of_cyclists: settings.number_of_cyclists,
        rtp_percentage: settings.rtp_percentage,
        rtp_mode: settings.rtp_mode,
        house_edge: settings.house_edge,
        auto_rtp_enabled: settings.auto_rtp_enabled ?? true,
        manual_winner_enabled: settings.manual_winner_enabled ?? false,
        manual_winner_cyclist: settings.manual_winner_cyclist || 1,
        use_custom_odds: settings.use_custom_odds ?? false,
        cyclist_odds: loadedOdds,
        cyclist_customization: loadedCustomization,
      });
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("cycling_race_settings")
        .update({
          min_bet: data.min_bet,
          max_bet: data.max_bet,
          race_duration_seconds: data.race_duration_seconds,
          betting_duration_seconds: data.betting_duration_seconds,
          number_of_cyclists: data.number_of_cyclists,
          rtp_percentage: data.rtp_percentage,
          rtp_mode: data.rtp_mode,
          house_edge: data.house_edge,
          auto_rtp_enabled: data.auto_rtp_enabled,
          manual_winner_enabled: data.manual_winner_enabled,
          manual_winner_cyclist: data.manual_winner_cyclist,
          use_custom_odds: data.use_custom_odds,
          cyclist_odds: data.cyclist_odds as unknown as any,
          cyclist_customization: data.cyclist_customization as unknown as any,
          updated_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycling-race-settings"] });
      toast.success("Cycle race settings updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings.mutate(formData);
  };

  const handleRtpModeChange = (mode: string) => {
    let rtpPercentage = 95;
    let houseEdge = 5;
    
    switch (mode) {
      case "high":
        rtpPercentage = 95;
        houseEdge = 5;
        break;
      case "balanced":
        rtpPercentage = 85;
        houseEdge = 15;
        break;
      case "low":
        rtpPercentage = 30;
        houseEdge = 70;
        break;
    }
    
    setFormData(prev => ({
      ...prev,
      rtp_mode: mode,
      rtp_percentage: rtpPercentage,
      house_edge: houseEdge,
    }));
  };

  const handleCyclistOddsChange = (cyclistIndex: number, value: number) => {
    setFormData(prev => {
      const newOdds = [...prev.cyclist_odds];
      newOdds[cyclistIndex] = value;
      return { ...prev, cyclist_odds: newOdds };
    });
  };

  const handleCyclistNameChange = (cyclistIndex: number, name: string) => {
    setFormData(prev => {
      const newCustomization = [...prev.cyclist_customization];
      if (!newCustomization[cyclistIndex]) {
        newCustomization[cyclistIndex] = { name: defaultCyclistNames[cyclistIndex], flag: defaultFlags[cyclistIndex] };
      }
      newCustomization[cyclistIndex] = { ...newCustomization[cyclistIndex], name };
      return { ...prev, cyclist_customization: newCustomization };
    });
  };

  const handleCyclistFlagChange = (cyclistIndex: number, flag: string) => {
    setFormData(prev => {
      const newCustomization = [...prev.cyclist_customization];
      if (!newCustomization[cyclistIndex]) {
        newCustomization[cyclistIndex] = { name: defaultCyclistNames[cyclistIndex], flag: defaultFlags[cyclistIndex] };
      }
      newCustomization[cyclistIndex] = { ...newCustomization[cyclistIndex], flag };
      return { ...prev, cyclist_customization: newCustomization };
    });
  };

  const generateLinearOdds = () => {
    const numCyclists = formData.number_of_cyclists;
    const newOdds = Array.from({ length: 10 }, (_, i) => {
      if (i < numCyclists) {
        // Linear progression from 1.5x to higher based on position
        return parseFloat((1.5 + (i * (15 - 1.5) / (numCyclists - 1))).toFixed(2));
      }
      return formData.cyclist_odds[i] || 15;
    });
    setFormData(prev => ({ ...prev, cyclist_odds: newOdds }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bike className="h-5 w-5" />
          Cycle Race Settings
        </CardTitle>
        <CardDescription>
          Configure betting limits, race duration, cyclist count, odds, and game mechanics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="live">Live Pool</TabsTrigger>
              <TabsTrigger value="outcome">Outcome</TabsTrigger>
              <TabsTrigger value="cyclists">Cyclists</TabsTrigger>
              <TabsTrigger value="odds">Odds</TabsTrigger>
              <TabsTrigger value="control">Control</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-4">
              {/* Betting Limits */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Betting Limits</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="min_bet">Minimum Bet</Label>
                    <Input
                      id="min_bet"
                      type="number"
                      step="0.01"
                      value={formData.min_bet}
                      onChange={(e) => setFormData(prev => ({ ...prev, min_bet: parseFloat(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="max_bet">Maximum Bet</Label>
                    <Input
                      id="max_bet"
                      type="number"
                      step="0.01"
                      value={formData.max_bet}
                      onChange={(e) => setFormData(prev => ({ ...prev, max_bet: parseFloat(e.target.value) }))}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Race Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Race Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="betting_duration">Betting Duration (seconds)</Label>
                    <Input
                      id="betting_duration"
                      type="number"
                      value={formData.betting_duration_seconds}
                      onChange={(e) => setFormData(prev => ({ ...prev, betting_duration_seconds: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="race_duration">Race Duration (seconds)</Label>
                    <Input
                      id="race_duration"
                      type="number"
                      value={formData.race_duration_seconds}
                      onChange={(e) => setFormData(prev => ({ ...prev, race_duration_seconds: parseInt(e.target.value) }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="number_of_cyclists">Number of Cyclists</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          number_of_cyclists: Math.max(2, prev.number_of_cyclists - 1) 
                        }))}
                        disabled={formData.number_of_cyclists <= 2}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold">{formData.number_of_cyclists}</span>
                        <span className="text-sm text-muted-foreground ml-1">cyclists</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setFormData(prev => ({ 
                          ...prev, 
                          number_of_cyclists: Math.min(10, prev.number_of_cyclists + 1) 
                        }))}
                        disabled={formData.number_of_cyclists >= 10}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Min: 2 | Max: 10</p>
                  </div>
                </div>
              </div>

              {/* RTP Settings */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">RTP Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="rtp_mode">RTP Mode</Label>
                    <Select 
                      value={formData.rtp_mode} 
                      onValueChange={handleRtpModeChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High (95% RTP - 5% House)</SelectItem>
                        <SelectItem value="balanced">Balanced (85% RTP - 15% House)</SelectItem>
                        <SelectItem value="low">Low (30% RTP - 70% House)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rtp_percentage">RTP Percentage</Label>
                    <Input
                      id="rtp_percentage"
                      type="number"
                      step="0.01"
                      value={formData.rtp_percentage}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_rtp"
                    checked={formData.auto_rtp_enabled}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_rtp_enabled: checked }))}
                  />
                  <Label htmlFor="auto_rtp" className="cursor-pointer">
                    Enable Automatic RTP Adjustment
                  </Label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="live" className="space-y-6 mt-4">
              {/* Live Betting Pool Monitor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5 text-green-500 animate-pulse" />
                    Live Betting Pool
                  </h3>
                  {activeRace ? (
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                      Race #{activeRace.race_number} - {activeRace.status}
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs font-medium">
                      No Active Race
                    </span>
                  )}
                </div>

                {activeRace ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Array.from({ length: formData.number_of_cyclists }, (_, i) => {
                      const cyclistNum = i + 1;
                      const pool = liveBetPool?.find(p => p.cyclist_number === cyclistNum);
                      const cyclist = formData.cyclist_customization[i];
                      
                      return (
                        <div 
                          key={cyclistNum} 
                          className="p-3 rounded-lg border bg-card/50 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                              {cyclistNum}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {cyclist?.name || `Cyclist ${cyclistNum}`}
                            </span>
                            <span>{cyclist?.flag || '🚴'}</span>
                          </div>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-primary">
                              {currencySymbol}{(pool?.total_amount || 0).toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {pool?.bet_count || 0} bets
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No active race. Live betting pool will appear when a race starts.</p>
                  </div>
                )}

                {liveBetPool && liveBetPool.length > 0 && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Total Pool</span>
                        <div className="text-xl font-bold text-primary">
                          {currencySymbol}{liveBetPool.reduce((sum, p) => sum + p.total_amount, 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Total Bets</span>
                        <div className="text-xl font-bold">
                          {liveBetPool.reduce((sum, p) => sum + p.bet_count, 0)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="outcome" className="space-y-6 mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  Predetermined Outcome
                </h3>
                <p className="text-sm text-muted-foreground">
                  The winning cyclist is decided the moment a race is created, before betting closes.
                  This shows that outcome early so you know how the current race will end.
                </p>

                {latestRace ? (
                  (() => {
                    const winnerIndex = (latestRace.winner_cyclist || 1) - 1;
                    const winner = formData.cyclist_customization[winnerIndex];
                    return (
                      <div className="p-4 rounded-lg border bg-card/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Race #{latestRace.race_number}</span>
                          <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-medium capitalize">
                            {latestRace.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold">
                            {latestRace.winner_cyclist ?? "?"}
                          </span>
                          <div>
                            <div className="text-lg font-bold">
                              {winner?.name || `Cyclist ${latestRace.winner_cyclist}`} {winner?.flag}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {latestRace.status === "finished" ? "Finished with this winner" : "Will win this race"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>No race data yet. The outcome will appear once a race is created.</p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="cyclists" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Cyclist Names & Flags
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Customize cyclist names and country flags to boost local engagement. Use emoji flags or text.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: formData.number_of_cyclists }, (_, i) => (
                    <div key={i} className="space-y-3 p-4 rounded-lg border bg-muted/30">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          {i + 1}
                        </span>
                        Cyclist {i + 1}
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <Input
                            type="text"
                            placeholder={defaultCyclistNames[i]}
                            value={formData.cyclist_customization[i]?.name || ''}
                            onChange={(e) => handleCyclistNameChange(i, e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Flag className="w-3 h-3" /> Flag
                          </Label>
                          <Input
                            type="text"
                            placeholder={defaultFlags[i]}
                            value={formData.cyclist_customization[i]?.flag || ''}
                            onChange={(e) => handleCyclistFlagChange(i, e.target.value)}
                            className="text-center text-lg"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="odds" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Cyclist Odds Configuration</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="use_custom_odds"
                        checked={formData.use_custom_odds}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, use_custom_odds: checked }))}
                      />
                      <Label htmlFor="use_custom_odds" className="cursor-pointer">
                        Use Custom Odds
                      </Label>
                    </div>
                    {formData.use_custom_odds && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={generateLinearOdds}
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Linear
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {formData.use_custom_odds 
                    ? "Configure individual odds for each cyclist. Higher numbers = higher odds (more risk, more reward)."
                    : "Enable custom odds to manually set multipliers for each cyclist position."}
                </p>

                {formData.use_custom_odds && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Array.from({ length: formData.number_of_cyclists }, (_, i) => (
                      <div key={i} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                            {i + 1}
                          </span>
                          Cyclist {i + 1}
                        </Label>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.1"
                            min="1.1"
                            max="100"
                            value={formData.cyclist_odds[i] || 1.5 + i}
                            onChange={(e) => handleCyclistOddsChange(i, parseFloat(e.target.value) || 1.5)}
                            className="text-center"
                          />
                          <span className="text-sm text-muted-foreground">x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!formData.use_custom_odds && (
                  <div className="p-4 rounded-lg border border-dashed bg-muted/20">
                    <p className="text-center text-muted-foreground">
                      Auto-calculated odds based on cyclist position (higher number = higher odds)
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="control" className="space-y-6 mt-4">
              {/* Manual Winner Control */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Manual Winner Control</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="manual_winner"
                      checked={formData.manual_winner_enabled}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, manual_winner_enabled: checked }))}
                    />
                    <Label htmlFor="manual_winner" className="cursor-pointer">
                      Enable Manual Winner Selection
                    </Label>
                  </div>
                  
                  {formData.manual_winner_enabled && (
                    <div className="space-y-2">
                      <Label htmlFor="manual_winner_cyclist">Select Winner Cyclist</Label>
                      <Select 
                        value={formData.manual_winner_cyclist.toString()} 
                        onValueChange={(value) => setFormData(prev => ({ ...prev, manual_winner_cyclist: parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: formData.number_of_cyclists }, (_, i) => i + 1).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              Cyclist {num} ({formData.use_custom_odds ? `${formData.cyclist_odds[num - 1]}x` : `~${(1.5 + (num - 1) * 0.5).toFixed(1)}x`})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        When enabled, this cyclist will always win the race
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button 
            type="submit" 
            disabled={updateSettings.isPending}
            className="w-full"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Settings
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}