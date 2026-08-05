import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Target, Percent, DollarSign, Settings2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ChickenRoadSettingsData {
  id: string;
  min_bet: number;
  max_bet: number;
  rtp_percentage: number;
  house_edge: number;
  auto_rtp_enabled: boolean;
  rtp_mode: string;
  manual_control_enabled: boolean;
  manual_crash_lanes_easy: number[];
  manual_crash_lanes_medium: number[];
  manual_crash_lanes_hard: number[];
  manual_crash_lanes_expert: number[];
  multiplier_easy: number;
  multiplier_medium: number;
  multiplier_hard: number;
  multiplier_expert: number;
  lanes_easy: number;
  lanes_medium: number;
  lanes_hard: number;
  lanes_expert: number;
  bet_button_text: string;
  lane_odds_easy: number[];
  lane_odds_medium: number[];
  lane_odds_hard: number[];
  lane_odds_expert: number[];
  use_custom_lane_odds: boolean;
}

export function ChickenRoadSettings() {
  const [settings, setSettings] = useState<ChickenRoadSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Form state
  const [minBet, setMinBet] = useState(10);
  const [maxBet, setMaxBet] = useState(10000);
  const [rtpPercentage, setRtpPercentage] = useState(95);
  const [autoRtpEnabled, setAutoRtpEnabled] = useState(true);
  const [rtpMode, setRtpMode] = useState("balanced");
  const [manualControlEnabled, setManualControlEnabled] = useState(false);
  const [manualCrashLanesEasy, setManualCrashLanesEasy] = useState<number[]>([]);
  const [manualCrashLanesMedium, setManualCrashLanesMedium] = useState<number[]>([]);
  const [manualCrashLanesHard, setManualCrashLanesHard] = useState<number[]>([]);
  const [manualCrashLanesExpert, setManualCrashLanesExpert] = useState<number[]>([]);
  
  // Multiplier/odds per difficulty
  const [multiplierEasy, setMultiplierEasy] = useState(1.5);
  const [multiplierMedium, setMultiplierMedium] = useState(2.0);
  const [multiplierHard, setMultiplierHard] = useState(3.0);
  const [multiplierExpert, setMultiplierExpert] = useState(5.0);
  
  // Lane counts per difficulty
  const [lanesEasy, setLanesEasy] = useState(30);
  const [lanesMedium, setLanesMedium] = useState(25);
  const [lanesHard, setLanesHard] = useState(22);
  const [lanesExpert, setLanesExpert] = useState(18);
  
  // Bet button text option
  const [betButtonText, setBetButtonText] = useState<string>('BET');

  // Per-lane custom odds
  const [useCustomLaneOdds, setUseCustomLaneOdds] = useState(false);
  const [laneOddsEasy, setLaneOddsEasy] = useState<number[]>([]);
  const [laneOddsMedium, setLaneOddsMedium] = useState<number[]>([]);
  const [laneOddsHard, setLaneOddsHard] = useState<number[]>([]);
  const [laneOddsExpert, setLaneOddsExpert] = useState<number[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Initialize lane odds when lane counts change
  useEffect(() => {
    if (laneOddsEasy.length !== lanesEasy) {
      const newOdds = Array.from({ length: lanesEasy }, (_, i) => 
        laneOddsEasy[i] ?? Number((1 + (i * 0.05)).toFixed(2))
      );
      setLaneOddsEasy(newOdds);
    }
  }, [lanesEasy]);

  useEffect(() => {
    if (laneOddsMedium.length !== lanesMedium) {
      const newOdds = Array.from({ length: lanesMedium }, (_, i) => 
        laneOddsMedium[i] ?? Number((1 + (i * 0.08)).toFixed(2))
      );
      setLaneOddsMedium(newOdds);
    }
  }, [lanesMedium]);

  useEffect(() => {
    if (laneOddsHard.length !== lanesHard) {
      const newOdds = Array.from({ length: lanesHard }, (_, i) => 
        laneOddsHard[i] ?? Number((1 + (i * 0.12)).toFixed(2))
      );
      setLaneOddsHard(newOdds);
    }
  }, [lanesHard]);

  useEffect(() => {
    if (laneOddsExpert.length !== lanesExpert) {
      const newOdds = Array.from({ length: lanesExpert }, (_, i) => 
        laneOddsExpert[i] ?? Number((1 + (i * 0.2)).toFixed(2))
      );
      setLaneOddsExpert(newOdds);
    }
  }, [lanesExpert]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("chicken_road_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;

      if (data) {
        setSettings(data as ChickenRoadSettingsData);
        setMinBet(data.min_bet);
        setMaxBet(data.max_bet);
        setRtpPercentage(data.rtp_percentage);
        setAutoRtpEnabled(data.auto_rtp_enabled || false);
        setRtpMode(data.rtp_mode || "balanced");
        setManualControlEnabled(data.manual_control_enabled || false);
        setManualCrashLanesEasy(data.manual_crash_lanes_easy || []);
        setManualCrashLanesMedium(data.manual_crash_lanes_medium || []);
        setManualCrashLanesHard(data.manual_crash_lanes_hard || []);
        setManualCrashLanesExpert(data.manual_crash_lanes_expert || []);
        setMultiplierEasy(data.multiplier_easy || 1.5);
        setMultiplierMedium(data.multiplier_medium || 2.0);
        setMultiplierHard(data.multiplier_hard || 3.0);
        setMultiplierExpert(data.multiplier_expert || 5.0);
        setLanesEasy(data.lanes_easy || 30);
        setLanesMedium(data.lanes_medium || 25);
        setLanesHard(data.lanes_hard || 22);
        setLanesExpert(data.lanes_expert || 18);
        setBetButtonText(data.bet_button_text || 'BET');
        
        // Load custom lane odds
        setUseCustomLaneOdds(data.use_custom_lane_odds || false);
        const parsedEasy = Array.isArray(data.lane_odds_easy) ? (data.lane_odds_easy as number[]) : [];
        const parsedMedium = Array.isArray(data.lane_odds_medium) ? (data.lane_odds_medium as number[]) : [];
        const parsedHard = Array.isArray(data.lane_odds_hard) ? (data.lane_odds_hard as number[]) : [];
        const parsedExpert = Array.isArray(data.lane_odds_expert) ? (data.lane_odds_expert as number[]) : [];
        
        // Initialize with defaults if empty
        setLaneOddsEasy(parsedEasy.length > 0 ? parsedEasy : 
          Array.from({ length: data.lanes_easy || 30 }, (_, i) => Number((1 + (i * 0.05)).toFixed(2))));
        setLaneOddsMedium(parsedMedium.length > 0 ? parsedMedium : 
          Array.from({ length: data.lanes_medium || 25 }, (_, i) => Number((1 + (i * 0.08)).toFixed(2))));
        setLaneOddsHard(parsedHard.length > 0 ? parsedHard : 
          Array.from({ length: data.lanes_hard || 22 }, (_, i) => Number((1 + (i * 0.12)).toFixed(2))));
        setLaneOddsExpert(parsedExpert.length > 0 ? parsedExpert : 
          Array.from({ length: data.lanes_expert || 18 }, (_, i) => Number((1 + (i * 0.2)).toFixed(2))));
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load Chicken Road settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    if (rtpPercentage < 50 || rtpPercentage > 100) {
      toast.error("RTP must be between 50% and 100%");
      return;
    }

    if (minBet <= 0 || maxBet <= 0 || minBet >= maxBet) {
      toast.error("Invalid bet limits");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("chicken_road_settings")
        .update({
          min_bet: minBet,
          max_bet: maxBet,
          rtp_percentage: rtpPercentage,
          house_edge: 100 - rtpPercentage,
          auto_rtp_enabled: autoRtpEnabled,
          rtp_mode: rtpMode,
          manual_control_enabled: manualControlEnabled,
          manual_crash_lanes_easy: manualControlEnabled ? manualCrashLanesEasy : [],
          manual_crash_lanes_medium: manualControlEnabled ? manualCrashLanesMedium : [],
          manual_crash_lanes_hard: manualControlEnabled ? manualCrashLanesHard : [],
          manual_crash_lanes_expert: manualControlEnabled ? manualCrashLanesExpert : [],
          multiplier_easy: multiplierEasy,
          multiplier_medium: multiplierMedium,
          multiplier_hard: multiplierHard,
          multiplier_expert: multiplierExpert,
          lanes_easy: lanesEasy,
          lanes_medium: lanesMedium,
          lanes_hard: lanesHard,
          lanes_expert: lanesExpert,
          bet_button_text: betButtonText,
          use_custom_lane_odds: useCustomLaneOdds,
          lane_odds_easy: laneOddsEasy,
          lane_odds_medium: laneOddsMedium,
          lane_odds_hard: laneOddsHard,
          lane_odds_expert: laneOddsExpert,
        })
        .eq("id", settings.id);

      if (error) throw error;

      toast.success("Chicken Road settings saved successfully");
      fetchSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleLane = (difficulty: "easy" | "medium" | "hard" | "expert", lane: number) => {
    const setters = {
      easy: setManualCrashLanesEasy,
      medium: setManualCrashLanesMedium,
      hard: setManualCrashLanesHard,
      expert: setManualCrashLanesExpert,
    };
    const values = {
      easy: manualCrashLanesEasy,
      medium: manualCrashLanesMedium,
      hard: manualCrashLanesHard,
      expert: manualCrashLanesExpert,
    };
    
    const currentLanes = values[difficulty];
    const setter = setters[difficulty];
    
    if (currentLanes.includes(lane)) {
      setter(currentLanes.filter(l => l !== lane));
    } else {
      setter([...currentLanes, lane].sort((a, b) => a - b));
    }
  };

  const getDifficultyLanes = (difficulty: "easy" | "medium" | "hard" | "expert") => {
    const laneCounts = { easy: lanesEasy, medium: lanesMedium, hard: lanesHard, expert: lanesExpert };
    const labels = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };
    return { lanes: laneCounts[difficulty], label: `${labels[difficulty]} (${laneCounts[difficulty]} lanes)` };
  };

  const updateLaneOdd = (difficulty: "easy" | "medium" | "hard" | "expert", laneIndex: number, value: number) => {
    const setters = {
      easy: setLaneOddsEasy,
      medium: setLaneOddsMedium,
      hard: setLaneOddsHard,
      expert: setLaneOddsExpert,
    };
    const values = {
      easy: laneOddsEasy,
      medium: laneOddsMedium,
      hard: laneOddsHard,
      expert: laneOddsExpert,
    };

    const newOdds = [...values[difficulty]];
    newOdds[laneIndex] = value;
    setters[difficulty](newOdds);
  };

  const generateLinearOdds = (difficulty: "easy" | "medium" | "hard" | "expert", startOdd: number, increment: number) => {
    const laneCounts = { easy: lanesEasy, medium: lanesMedium, hard: lanesHard, expert: lanesExpert };
    const setters = {
      easy: setLaneOddsEasy,
      medium: setLaneOddsMedium,
      hard: setLaneOddsHard,
      expert: setLaneOddsExpert,
    };

    const lanes = laneCounts[difficulty];
    const newOdds = Array.from({ length: lanes }, (_, i) => Number((startOdd + (i * increment)).toFixed(2)));
    setters[difficulty](newOdds);
  };

  const renderLaneSelector = (
    difficulty: "easy" | "medium" | "hard" | "expert",
    selectedLanes: number[]
  ) => {
    const { lanes, label } = getDifficultyLanes(difficulty);
    const options = Array.from({ length: lanes }, (_, i) => i);

    return (
      <div className="space-y-3">
        <Label className="text-sm font-medium">{label}</Label>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {options.map((lane) => {
            const isSelected = selectedLanes.includes(lane);
            return (
              <Button
                key={lane}
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => toggleLane(difficulty, lane)}
                disabled={!manualControlEnabled}
                className={`min-w-[40px] h-8 ${isSelected ? 'bg-destructive hover:bg-destructive/90' : ''}`}
              >
                {lane + 1}
              </Button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {selectedLanes.length > 0 
            ? `Crash lanes: ${selectedLanes.map(l => l + 1).join(', ')} (random pick each game)` 
            : "No lanes selected - uses RTP based calculation"}
        </p>
      </div>
    );
  };

  const renderLaneOddsEditor = (difficulty: "easy" | "medium" | "hard" | "expert") => {
    const colors = { easy: "text-green-500", medium: "text-yellow-500", hard: "text-orange-500", expert: "text-red-500" };
    const laneCounts = { easy: lanesEasy, medium: lanesMedium, hard: lanesHard, expert: lanesExpert };
    const odds = { easy: laneOddsEasy, medium: laneOddsMedium, hard: laneOddsHard, expert: laneOddsExpert };
    const labels = { easy: "Easy", medium: "Medium", hard: "Hard", expert: "Expert" };

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className={`text-sm font-medium ${colors[difficulty]}`}>
            {labels[difficulty]} ({laneCounts[difficulty]} lanes)
          </Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateLinearOdds(difficulty, 1.0, 0.03)}
              disabled={!useCustomLaneOdds}
            >
              Low Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateLinearOdds(difficulty, 1.0, 0.05)}
              disabled={!useCustomLaneOdds}
            >
              Medium Start
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => generateLinearOdds(difficulty, 1.0, 0.1)}
              disabled={!useCustomLaneOdds}
            >
              High Growth
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 max-h-60 overflow-y-auto p-2 bg-muted/30 rounded-lg">
          {odds[difficulty].map((odd, index) => (
            <div key={index} className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">L{index + 1}</Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                value={odd}
                onChange={(e) => updateLaneOdd(difficulty, index, Number(e.target.value))}
                disabled={!useCustomLaneOdds}
                className="h-8 text-xs px-1 text-center bg-background"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Final odds at lane {laneCounts[difficulty]}: <span className="font-bold text-primary">{odds[difficulty][laneCounts[difficulty] - 1]?.toFixed(2) || 'N/A'}x</span>
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="lane-odds">Lane Odds</TabsTrigger>
          <TabsTrigger value="control">Control</TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6 mt-6">
          {/* Betting Limits */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-green-500" />
                Betting Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum Bet</Label>
                  <Input
                    type="number"
                    value={minBet}
                    onChange={(e) => setMinBet(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Maximum Bet</Label>
                  <Input
                    type="number"
                    value={maxBet}
                    onChange={(e) => setMaxBet(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
              </div>
              
              {/* Bet Button Text Option */}
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Label>Bet Button Text</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose the text displayed on the main action button
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {["BET", "PLAY", "STAKE"].map((text) => (
                    <Button
                      key={text}
                      variant={betButtonText === text ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetButtonText(text)}
                      className="font-bold"
                    >
                      {text}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Difficulty Lanes Configuration */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings2 className="h-5 w-5 text-purple-500" />
                Difficulty Lane Counts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the number of lanes for each difficulty level.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-green-500">Easy</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    value={lanesEasy}
                    onChange={(e) => setLanesEasy(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-yellow-500">Medium</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    value={lanesMedium}
                    onChange={(e) => setLanesMedium(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-orange-500">Hard</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    value={lanesHard}
                    onChange={(e) => setLanesHard(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-red-500">Expert</Label>
                  <Input
                    type="number"
                    min="5"
                    max="50"
                    value={lanesExpert}
                    onChange={(e) => setLanesExpert(Number(e.target.value))}
                    className="bg-background/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RTP Settings */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Percent className="h-5 w-5 text-blue-500" />
                RTP Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>RTP Percentage (50-100%)</Label>
                <Input
                  type="number"
                  min={50}
                  max={100}
                  value={rtpPercentage}
                  onChange={(e) => setRtpPercentage(Number(e.target.value))}
                  className="bg-background/50"
                />
                <p className="text-xs text-muted-foreground">
                  House Edge: {(100 - rtpPercentage).toFixed(1)}%
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto RTP Adjustment</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically adjust crash lanes based on RTP target
                  </p>
                </div>
                <Switch
                  checked={autoRtpEnabled}
                  onCheckedChange={setAutoRtpEnabled}
                />
              </div>

              <div className="space-y-2">
                <Label>RTP Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {["tight", "balanced", "loose"].map((mode) => (
                    <Button
                      key={mode}
                      variant={rtpMode === mode ? "default" : "outline"}
                      size="sm"
                      onClick={() => setRtpMode(mode)}
                      className="capitalize"
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lane Odds Tab */}
        <TabsContent value="lane-odds" className="space-y-6 mt-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-5 w-5 text-amber-500" />
                Custom Lane Odds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div>
                  <Label className="text-amber-500 font-semibold">Enable Custom Lane Odds</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set specific multiplier for each lane instead of using base multiplier
                  </p>
                </div>
                <Switch
                  checked={useCustomLaneOdds}
                  onCheckedChange={setUseCustomLaneOdds}
                />
              </div>

              {useCustomLaneOdds && (
                <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-400">
                    💡 <strong>Tip:</strong> Use the preset buttons to quickly generate lane odds. "Low Start" begins at 1.0x with small increments (good for starting low). 
                    You can also manually edit each lane's multiplier.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {renderLaneOddsEditor("easy")}
                {renderLaneOddsEditor("medium")}
                {renderLaneOddsEditor("hard")}
                {renderLaneOddsEditor("expert")}
              </div>

              {!useCustomLaneOdds && (
                <Card className="border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Settings2 className="h-5 w-5 text-yellow-500" />
                      Base Difficulty Multipliers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      These base multipliers are used when custom lane odds are disabled.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label className="text-green-500">Easy ({lanesEasy} lanes)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={multiplierEasy}
                          onChange={(e) => setMultiplierEasy(Number(e.target.value))}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-yellow-500">Medium ({lanesMedium} lanes)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={multiplierMedium}
                          onChange={(e) => setMultiplierMedium(Number(e.target.value))}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-orange-500">Hard ({lanesHard} lanes)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={multiplierHard}
                          onChange={(e) => setMultiplierHard(Number(e.target.value))}
                          className="bg-background/50"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-red-500">Expert ({lanesExpert} lanes)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="1"
                          value={multiplierExpert}
                          onChange={(e) => setMultiplierExpert(Number(e.target.value))}
                          className="bg-background/50"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Control Tab */}
        <TabsContent value="control" className="space-y-6 mt-6">
          {/* Manual Control */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-red-500" />
                Manual Crash Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div>
                  <Label className="text-destructive font-semibold">Enable Manual Crash Control</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Override RTP and manually select which lanes cause crashes
                  </p>
                </div>
                <Switch
                  checked={manualControlEnabled}
                  onCheckedChange={setManualControlEnabled}
                />
              </div>

              {manualControlEnabled && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <p className="text-xs text-amber-400">
                    ⚠️ <strong>Warning:</strong> Manual control overrides RTP settings. 
                    If multiple lanes are selected, one will be randomly chosen as the crash lane each game.
                  </p>
                </div>
              )}

              <div className="space-y-6">
                {renderLaneSelector("easy", manualCrashLanesEasy)}
                {renderLaneSelector("medium", manualCrashLanesMedium)}
                {renderLaneSelector("hard", manualCrashLanesHard)}
                {renderLaneSelector("expert", manualCrashLanesExpert)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    </div>
  );
}
