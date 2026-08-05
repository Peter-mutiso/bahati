import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const MinesSettings = () => {
  const queryClient = useQueryClient();
  const [minBet, setMinBet] = useState("10");
  const [maxBet, setMaxBet] = useState("100000");
  const [houseEdge, setHouseEdge] = useState("3");
  const [rtpPercentage, setRtpPercentage] = useState("97");
  const [autoRtpEnabled, setAutoRtpEnabled] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["mines-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mines_settings")
        .select("*")
        .single();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings) {
      setMinBet(settings.min_bet.toString());
      setMaxBet(settings.max_bet.toString());
      setHouseEdge(settings.house_edge.toString());
      setRtpPercentage(settings.rtp_percentage.toString());
      setAutoRtpEnabled(settings.auto_rtp_enabled || false);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from("mines_settings")
        .update(updates)
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mines-settings"] });
      toast.success("Mines settings updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      min_bet: parseFloat(minBet),
      max_bet: parseFloat(maxBet),
      house_edge: parseFloat(houseEdge),
      rtp_percentage: parseFloat(rtpPercentage),
      auto_rtp_enabled: autoRtpEnabled,
    });
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mines Game Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Minimum Bet</Label>
            <Input
              type="number"
              value={minBet}
              onChange={(e) => setMinBet(e.target.value)}
              placeholder="10"
            />
          </div>

          <div className="space-y-2">
            <Label>Maximum Bet</Label>
            <Input
              type="number"
              value={maxBet}
              onChange={(e) => setMaxBet(e.target.value)}
              placeholder="100000"
            />
          </div>

          <div className="space-y-2">
            <Label>House Edge (%)</Label>
            <Input
              type="number"
              value={houseEdge}
              onChange={(e) => setHouseEdge(e.target.value)}
              placeholder="3"
              step="0.1"
            />
          </div>

          <div className="space-y-2">
            <Label>RTP Percentage (%)</Label>
            <Input
              type="number"
              value={rtpPercentage}
              onChange={(e) => setRtpPercentage(e.target.value)}
              placeholder="97"
              step="0.1"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Auto RTP Management</Label>
            <p className="text-sm text-muted-foreground">
              Automatically adjust game outcomes to maintain target RTP
            </p>
          </div>
          <Switch
            checked={autoRtpEnabled}
            onCheckedChange={setAutoRtpEnabled}
          />
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};
