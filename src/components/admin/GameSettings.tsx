import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Settings2, AlertCircle } from "lucide-react";
import { useActiveSite } from "@/contexts/ActiveSiteContext";

const GameSettings = () => {
  const { activeSite, tenantFilter } = useActiveSite();
  const queryClient = useQueryClient();
  const [minCrashPoint, setMinCrashPoint] = useState("");
  const [maxCrashPoint, setMaxCrashPoint] = useState("");
  const [currencySymbol, setCurrencySymbol] = useState("");
  const [currencyName, setCurrencyName] = useState("");
  const [manualCrashPoints, setManualCrashPoints] = useState<string[]>(["", "", "", "", ""]);
  const [useManualCrash, setUseManualCrash] = useState(false);

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ["game-settings", activeSite === "all" ? "all" : activeSite.id],
    queryFn: async () => {
      if (activeSite === "all") return null;
      const { data, error } = await supabase
        .from("game_settings")
        .select("*")
        .match(tenantFilter)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: activeSite !== "all",
  });

  useEffect(() => {
    if (error) {
      toast.error("Failed to load game settings: " + error.message);
    }
  }, [error]);

  useEffect(() => {
    if (settings) {
      setMinCrashPoint(settings.min_crash_point?.toString() ?? "1.01");
      setMaxCrashPoint(settings.max_crash_point?.toString() ?? "10.00");
      setCurrencySymbol(settings.currency_symbol ?? "₹");
      setCurrencyName(settings.currency_name ?? "INR");
      
      // Parse manual crash points array or initialize empty array
      const points = settings.manual_crash_points || [];
      const pointsArray = points.map((p: number) => p.toString());
      // Pad with empty strings to always have 5 slots
      while (pointsArray.length < 5) pointsArray.push("");
      setManualCrashPoints(pointsArray.slice(0, 5));
      setUseManualCrash(settings.use_manual_crash_point ?? false);
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof settings>) => {
      const { error } = await supabase
        .from("game_settings")
        .update({ ...updates, tenant_id: activeSite === "all" ? null : activeSite.id })
        .eq("id", settings?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["game-settings"] });
      toast.success("Game settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });

  const handleSave = () => {
    const minCrash = parseFloat(minCrashPoint);
    const maxCrash = parseFloat(maxCrashPoint);

    if (isNaN(minCrash) || minCrash < 1.01) {
      toast.error("Minimum crash point must be at least 1.01");
      return;
    }

    if (isNaN(maxCrash) || maxCrash <= minCrash) {
      toast.error("Maximum crash point must be greater than minimum");
      return;
    }

    const updates: Record<string, number | string | boolean | number[]> = {
      min_crash_point: minCrash,
      max_crash_point: maxCrash,
      currency_symbol: currencySymbol,
      currency_name: currencyName,
    };

    if (useManualCrash) {
      // Filter out empty values and validate
      const validPoints = manualCrashPoints
        .filter(p => p.trim() !== "")
        .map(p => parseFloat(p))
        .filter(p => !isNaN(p) && p >= 1.00);
      
      if (validPoints.length === 0) {
        toast.error("Please enter at least one valid crash point (minimum 1.00)");
        return;
      }
      
      updates.manual_crash_points = validPoints;
      updates.use_manual_crash_point = true;
    } else {
      updates.use_manual_crash_point = false;
      updates.manual_crash_points = [];
    }

    updateSettingsMutation.mutate(updates);
  };

  if (activeSite === "all") {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            Selection Required
          </CardTitle>
          <CardDescription>
            You must select a specific site from the dropdown above to manage its game settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return <div className="text-center py-8">Loading settings...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="w-5 h-5" />
          Game Settings
        </CardTitle>
        <CardDescription>
          Control crash game parameters and currency settings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="minCrash">Minimum Crash Point</Label>
            <Input
              id="minCrash"
              type="number"
              step="0.01"
              min="1.01"
              value={minCrashPoint}
              onChange={(e) => setMinCrashPoint(e.target.value)}
              placeholder="1.01"
            />
            <p className="text-xs text-muted-foreground">
              Lowest possible multiplier for the crash game
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxCrash">Maximum Crash Point</Label>
            <Input
              id="maxCrash"
              type="number"
              step="0.01"
              min="1.02"
              value={maxCrashPoint}
              onChange={(e) => setMaxCrashPoint(e.target.value)}
              placeholder="10.00"
            />
            <p className="text-xs text-muted-foreground">
              Highest possible multiplier for the crash game
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currencySymbol">Currency Symbol</Label>
            <Input
              id="currencySymbol"
              type="text"
              maxLength={3}
              value={currencySymbol}
              onChange={(e) => setCurrencySymbol(e.target.value)}
              placeholder="$"
            />
            <p className="text-xs text-muted-foreground">
              Symbol displayed for currency (e.g., $, €, ₹)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currencyName">Currency Name</Label>
            <Input
              id="currencyName"
              type="text"
              value={currencyName}
              onChange={(e) => setCurrencyName(e.target.value)}
              placeholder="USD"
            />
            <p className="text-xs text-muted-foreground">
              Full name of the currency (e.g., USD, EUR, INR)
            </p>
          </div>
        </div>

        <div className="border-t pt-6">
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Manual Crash Point Control (Next 5 Rounds)
              </h4>
              <p className="text-xs text-muted-foreground mb-4">
                Queue up to 5 manual crash points. Each round will consume the first value from the queue.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useManualCrash"
                  checked={useManualCrash}
                  onChange={(e) => setUseManualCrash(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="useManualCrash" className="cursor-pointer">
                  Enable Manual Crash Point
                </Label>
              </div>
            </div>

            {useManualCrash && (
              <div className="space-y-4">
                <Label>Crash Points Queue (1-5 rounds)</Label>
                <div className="grid gap-3 md:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`crashPoint${index + 1}`} className="text-xs">
                        Round {index + 1}
                      </Label>
                      <Input
                        id={`crashPoint${index + 1}`}
                        type="number"
                        step="0.01"
                        min="1.00"
                        value={manualCrashPoints[index]}
                        onChange={(e) => {
                          const newPoints = [...manualCrashPoints];
                          newPoints[index] = e.target.value;
                          setManualCrashPoints(newPoints);
                        }}
                        placeholder="e.g., 2.50"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  The rocket will crash at these multipliers in order. Empty slots will be skipped.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <h4 className="font-semibold text-sm">Current Settings Preview</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Crash Range:</span>
              <span className="ml-2 font-medium">
                {minCrashPoint}x - {maxCrashPoint}x
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Currency:</span>
              <span className="ml-2 font-medium">
                {currencySymbol} ({currencyName})
              </span>
            </div>
          </div>
        </div>

        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default GameSettings;
