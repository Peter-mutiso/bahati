import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Clock, PlayCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function WingoSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({
    min_bet: 10,
    max_bet: 10000,
    betting_duration_seconds: 25,
    result_duration_seconds: 5,
    house_edge: 3,
    rtp_percentage: 97,
    rtp_mode: 'auto',
    auto_rtp_enabled: true,
    manual_result_enabled: false,
    manual_result: '',
    red_multiplier: 2,
    green_multiplier: 4.5,
    violet_multiplier: 2,
  });
  const [liveRound, setLiveRound] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [bettingPool, setBettingPool] = useState<any>({
    colors: {},
    numbers: {},
    bigSmall: { big: 0, small: 0 }
  });

  useEffect(() => {
    fetchSettings();
    fetchLiveRound();
    subscribeToRounds();
    subscribeToBets();
    
    const timer = setInterval(() => {
      if (liveRound && liveRound.status === 'betting') {
        const elapsed = Date.now() - new Date(liveRound.started_at).getTime();
        const remaining = Math.max(0, (settings.betting_duration_seconds * 1000) - elapsed);
        setTimeLeft(Math.ceil(remaining / 1000));
      }
    }, 100);

    return () => clearInterval(timer);
  }, [liveRound, settings.betting_duration_seconds]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('wingo_settings')
      .select('*')
      .maybeSingle();

    if (data) {
      setSettings(data);
    }
  };

  const fetchLiveRound = async () => {
    const { data } = await supabase
      .from('wingo_rounds')
      .select('*')
      .in('status', ['betting', 'finished'])
      .order('round_number', { ascending: false })
      .limit(1)
      .maybeSingle();
    setLiveRound(data);
    if (data) {
      fetchBettingPool(data.id);
    }
  };

  const fetchBettingPool = async (roundId: string) => {
    const { data: bets } = await supabase
      .from('wingo_bets')
      .select('color, amount')
      .eq('round_id', roundId)
      .eq('status', 'pending');

    if (bets) {
      const pool = {
        colors: {} as Record<string, number>,
        numbers: {} as Record<string, number>,
        bigSmall: { big: 0, small: 0 }
      };

      bets.forEach(bet => {
        // Aggregate by color
        pool.colors[bet.color] = (pool.colors[bet.color] || 0) + bet.amount;

        // Extract number from color (e.g., "red-0" -> "0")
        const numberMatch = bet.color.match(/\d+/);
        if (numberMatch) {
          const num = numberMatch[0];
          pool.numbers[num] = (pool.numbers[num] || 0) + bet.amount;

          // Big/Small calculation
          const numValue = parseInt(num);
          if (numValue >= 5) {
            pool.bigSmall.big += bet.amount;
          } else {
            pool.bigSmall.small += bet.amount;
          }
        }
      });

      setBettingPool(pool);
    }
  };

  const subscribeToRounds = () => {
    const channel = supabase
      .channel('admin-wingo-rounds')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wingo_rounds'
      }, () => {
        fetchLiveRound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToBets = () => {
    const channel = supabase
      .channel('admin-wingo-bets')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wingo_bets'
      }, (payload) => {
        if (liveRound && payload.new && (payload.new as any).round_id === liveRound.id) {
          fetchBettingPool(liveRound.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleManualProcess = async () => {
    if (!liveRound) return;
    
    setProcessing(true);
    try {
      const { error } = await supabase.functions.invoke('wingo-engine', {
        body: { action: 'process_round', roundId: liveRound.id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Round processed manually"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process round",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('wingo_settings')
      .upsert({
        ...settings,
        id: '00000000-0000-0000-0000-000000000001'
      });

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update settings",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Wingo settings updated successfully"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Wingo Settings</h2>
        <p className="text-muted-foreground">Configure Wingo game parameters and monitor live rounds</p>
      </div>

      {/* Live Round Monitor */}
      <Card className="p-6 space-y-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">Live Round Monitor</h3>
          </div>
          {liveRound && (
            <Badge variant={liveRound.status === 'betting' ? 'default' : 'secondary'}>
              {liveRound.status}
            </Badge>
          )}
        </div>

        {liveRound ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Period</Label>
                <p className="text-2xl font-bold text-primary">{liveRound.round_number}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Time Left</Label>
                <p className="text-2xl font-bold">{timeLeft}s</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Status</Label>
                <p className="text-lg font-semibold capitalize">{liveRound.status}</p>
              </div>
              {liveRound.result && (
                <div>
                  <Label className="text-xs text-muted-foreground">Result</Label>
                  <p className="text-2xl font-bold">{liveRound.result_number}</p>
                </div>
              )}
            </div>

            {liveRound.status === 'betting' && (
              <div className="flex gap-2">
                <Button
                  onClick={handleManualProcess}
                  disabled={processing}
                  variant="default"
                  className="gap-2"
                >
                  {processing && <Loader2 className="h-4 w-4 animate-spin" />}
                  <PlayCircle className="h-4 w-4" />
                  Process Round Now
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No active round</p>
        )}
      </Card>

      {/* Live Betting Pool */}
      {liveRound && liveRound.status === 'betting' && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Live Betting Pool</h3>
          
          <div className="space-y-6">
            {/* Big/Small Bets */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Big vs Small</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs text-muted-foreground mb-1">Big (5-9)</p>
                  <p className="text-2xl font-bold text-primary">₹{bettingPool.bigSmall.big.toFixed(2)}</p>
                </div>
                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-xs text-muted-foreground mb-1">Small (0-4)</p>
                  <p className="text-2xl font-bold text-accent">₹{bettingPool.bigSmall.small.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Number Bets */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Bets by Number</Label>
              <div className="grid grid-cols-5 gap-2">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <div key={num} className="p-3 rounded-lg bg-secondary/50 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{num}</p>
                    <p className="text-sm font-semibold">₹{(bettingPool.numbers[num] || 0).toFixed(0)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Color Bets */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Bets by Color</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(bettingPool.colors).map(([color, amount]) => (
                  <div key={color} className="p-3 rounded-lg bg-secondary/50 border border-border">
                    <p className="text-xs text-muted-foreground mb-1 capitalize">{color.replace(/-\d+/, '')}</p>
                    <p className="text-lg font-semibold">₹{(amount as number).toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Betting Limits</h3>
          
          <div className="space-y-2">
            <Label>Minimum Bet</Label>
            <Input
              type="number"
              value={settings.min_bet}
              onChange={(e) => setSettings({ ...settings, min_bet: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Bet</Label>
            <Input
              type="number"
              value={settings.max_bet}
              onChange={(e) => setSettings({ ...settings, max_bet: Number(e.target.value) })}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Round Duration</h3>
          
          <div className="space-y-2">
            <Label>Betting Duration (seconds)</Label>
            <Input
              type="number"
              value={settings.betting_duration_seconds}
              onChange={(e) => setSettings({ ...settings, betting_duration_seconds: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Result Display Duration (seconds)</Label>
            <Input
              type="number"
              value={settings.result_duration_seconds}
              onChange={(e) => setSettings({ ...settings, result_duration_seconds: Number(e.target.value) })}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">RTP Settings</h3>
          
          <div className="space-y-2">
            <Label>House Edge (%)</Label>
            <Input
              type="number"
              value={settings.house_edge}
              onChange={(e) => setSettings({ ...settings, house_edge: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>RTP Percentage (%)</Label>
            <Input
              type="number"
              value={settings.rtp_percentage}
              onChange={(e) => setSettings({ ...settings, rtp_percentage: Number(e.target.value) })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label>Auto RTP Enabled</Label>
            <Switch
              checked={settings.auto_rtp_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, auto_rtp_enabled: checked })}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Multipliers</h3>
          
          <div className="space-y-2">
            <Label>Red Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.red_multiplier}
              onChange={(e) => setSettings({ ...settings, red_multiplier: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Green Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.green_multiplier}
              onChange={(e) => setSettings({ ...settings, green_multiplier: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Violet Multiplier</Label>
            <Input
              type="number"
              step="0.1"
              value={settings.violet_multiplier}
              onChange={(e) => setSettings({ ...settings, violet_multiplier: Number(e.target.value) })}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h3 className="font-semibold text-lg">Manual Control</h3>
          
          <div className="flex items-center justify-between">
            <Label>Manual Result Enabled</Label>
            <Switch
              checked={settings.manual_result_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, manual_result_enabled: checked })}
            />
          </div>

          <div className="space-y-2">
            <Label>Manual Result (0-9)</Label>
            <Input
              type="text"
              placeholder="Enter number 0-9"
              value={settings.manual_result || ''}
              onChange={(e) => setSettings({ ...settings, manual_result: e.target.value })}
              disabled={!settings.manual_result_enabled}
            />
          </div>
        </Card>
      </div>

      <Button onClick={handleSave} disabled={loading} size="lg">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Save Settings
      </Button>
    </div>
  );
}