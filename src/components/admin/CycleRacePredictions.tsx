import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RefreshCw, TrendingUp, Settings2 } from "lucide-react";

// Every row here is generated automatically the instant a race is queued
// (trg_generate_cycling_race_prediction on cycling_race_races). There is no
// manual "add a prediction" flow - predictions always trace back to a real
// queued race via race_id, they just aren't all shown the same value:
// real_outcome_cyclist (the true queued winner) is only ever served to
// admins/marketers/demo/bot accounts by list_cycling_race_predictions();
// real players get house_prediction_cyclist instead. Regenerating a row
// only re-rolls house_prediction_cyclist - it can never touch
// real_outcome_cyclist or cycling_race_races.
interface CyclistCustomization {
  name: string;
  flag: string;
}

interface CyclingRacePrediction {
  id: string;
  race_number: number;
  real_outcome_cyclist: number;
  house_prediction_cyclist: number;
  confidence_percentage: number;
  // The prediction row's own status ('active' | 'archived') - NOT the race's
  // lifecycle status. Only meaningful for the admin (onlyUpcoming=false) view.
  status: string;
  created_at: string;
  // Present only when fetched via the onlyUpcoming=true join
  // (cycling_race_races!inner(status)) - the underlying race's actual
  // lifecycle status ('upcoming' while it's still in this list).
  cycling_race_races?: { status: string };
}

interface PredictionSettings {
  id: string;
  bias_mode: string;
  confidence_min: number;
  confidence_max: number;
}

interface CycleRacePredictionsProps {
  cyclistCustomization: CyclistCustomization[];
  // When true (marketer usage), hides the House Prediction Logic settings
  // card and the per-row regenerate action - both mutate
  // cycling_race_prediction_settings / call an admin-or-marketer RPC that a
  // marketer viewer doesn't need for a read-only "what's the real upcoming
  // winner" view. Default false preserves the existing admin behavior in
  // CycleRaceSettings.tsx exactly as it was.
  readOnly?: boolean;
  // When true, restricts to predictions whose underlying race is still
  // status='upcoming' (via an inner join on cycling_race_races, RLS-scoped
  // exactly like every other read of that table) and orders by race_number
  // ascending so the very next race to activate comes first. Default false
  // preserves the existing admin behavior (all predictions, newest first).
  onlyUpcoming?: boolean;
  // Row cap. Default 100 preserves existing admin behavior exactly.
  limit?: number;
}

export function CycleRacePredictions({
  cyclistCustomization,
  readOnly = false,
  onlyUpcoming = false,
  limit = 100,
}: CycleRacePredictionsProps) {
  const queryClient = useQueryClient();

  const { data: predictions, isLoading } = useQuery({
    queryKey: ["cycling-race-predictions", onlyUpcoming, limit],
    queryFn: async () => {
      if (onlyUpcoming) {
        // Inner join scopes rows to races still in the 'upcoming' queue -
        // RLS on cycling_race_races is enforced independently on the joined
        // table, same as any other read of it (no new access is granted).
        const { data, error } = await supabase
          .from("cycling_race_predictions")
          .select(
            "id, race_number, real_outcome_cyclist, house_prediction_cyclist, confidence_percentage, status, created_at, cycling_race_races!inner(status)"
          )
          .eq("cycling_race_races.status", "upcoming")
          .order("race_number", { ascending: true })
          .limit(limit);

        if (error) throw error;
        return data as unknown as CyclingRacePrediction[];
      }

      const { data, error } = await supabase
        .from("cycling_race_predictions")
        .select("id, race_number, real_outcome_cyclist, house_prediction_cyclist, confidence_percentage, status, created_at")
        .order("race_number", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as unknown as CyclingRacePrediction[];
    },
    refetchInterval: 5000,
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["cycling-race-prediction-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycling_race_prediction_settings")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PredictionSettings | null;
    },
    enabled: !readOnly,
  });

  const [biasMode, setBiasMode] = useState("uniform");
  const [confidenceMin, setConfidenceMin] = useState("55");
  const [confidenceMax, setConfidenceMax] = useState("95");

  useEffect(() => {
    if (settings) {
      setBiasMode(settings.bias_mode);
      setConfidenceMin(settings.confidence_min.toString());
      setConfidenceMax(settings.confidence_max.toString());
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!settings) throw new Error("Settings not loaded yet");
      const { data: user } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("cycling_race_prediction_settings")
        .update({
          bias_mode: biasMode,
          confidence_min: parseFloat(confidenceMin),
          confidence_max: parseFloat(confidenceMax),
          updated_by: user.user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", settings.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycling-race-prediction-settings"] });
      toast.success("House prediction logic updated");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to update settings"),
  });

  const regenerate = useMutation({
    mutationFn: async (predictionId: string) => {
      const { error } = await supabase.rpc("regenerate_house_cycling_race_prediction", {
        p_prediction_id: predictionId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cycling-race-predictions"] });
      toast.success("House prediction regenerated");
    },
    onError: (error: Error) => toast.error(error.message || "Failed to regenerate prediction"),
  });

  const cyclistLabel = (num: number) => {
    const c = cyclistCustomization[num - 1];
    return `${c?.name || `Cyclist ${num}`} ${c?.flag || ""}`.trim();
  };

  if (isLoading || isLoadingSettings) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* onlyUpcoming (marketer): no internal heading/description here - the
          caller (MarketerDashboard.tsx) already renders its own "Cycle Race —
          Next 10 Upcoming Rounds" heading and description directly above
          this component, so this avoids a second, redundant one. */}
      {!onlyUpcoming && (
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Player Predictions
          </h3>
          <p className="text-sm text-muted-foreground">
            A prediction is created automatically for every queued race - it is never a
            standalone value. Real players only ever see "House Prediction" (generated
            independently of the real outcome). Admins and marketers see both columns here for
            oversight; demo and bot accounts are served the real outcome by design.
          </p>
        </div>
      )}

      {/* House logic settings - admin only: cycling_race_prediction_settings
          has no marketer SELECT/UPDATE policy, so this would silently fail
          to load and fail to save for a marketer. */}
      {!readOnly && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              House Prediction Logic
            </CardTitle>
            <CardDescription>
              Controls how the decoy prediction shown to real players is generated. Changing this
              never affects the real queue or settlement.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <Label htmlFor="bias_mode">Bias Mode</Label>
              <Select value={biasMode} onValueChange={setBiasMode}>
                <SelectTrigger id="bias_mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="uniform">Uniform (equal chance)</SelectItem>
                  <SelectItem value="favor_low">Favor Low Numbers</SelectItem>
                  <SelectItem value="favor_high">Favor High Numbers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="confidence_min">Min Confidence %</Label>
              <Input
                id="confidence_min"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={confidenceMin}
                onChange={(e) => setConfidenceMin(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confidence_max">Max Confidence %</Label>
              <Input
                id="confidence_max"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={confidenceMax}
                onChange={(e) => setConfidenceMax(e.target.value)}
              />
            </div>
            <Button
              type="button"
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
            >
              {saveSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Logic
            </Button>
          </CardContent>
        </Card>
      )}

      {predictions && predictions.length > 0 ? (
        <ScrollArea className="h-[420px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Race #</TableHead>
                <TableHead>{onlyUpcoming ? "Real Prediction" : "Real Outcome"}</TableHead>
                {!onlyUpcoming && <TableHead>House Prediction (shown to players)</TableHead>}
                {!onlyUpcoming && <TableHead>Confidence</TableHead>}
                <TableHead>Status</TableHead>
                {!readOnly && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {predictions.map((prediction) => (
                <TableRow key={prediction.id}>
                  <TableCell className="font-medium">#{prediction.race_number}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-2 ${onlyUpcoming ? "text-base font-semibold" : ""}`}>
                      <span className="w-6 h-6 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-xs font-bold">
                        {prediction.real_outcome_cyclist}
                      </span>
                      {cyclistLabel(prediction.real_outcome_cyclist)}
                    </span>
                  </TableCell>
                  {!onlyUpcoming && (
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {prediction.house_prediction_cyclist}
                        </span>
                        {cyclistLabel(prediction.house_prediction_cyclist)}
                        {prediction.house_prediction_cyclist === prediction.real_outcome_cyclist && (
                          <Badge variant="secondary" className="text-[10px]">coincidental match</Badge>
                        )}
                      </span>
                    </TableCell>
                  )}
                  {!onlyUpcoming && <TableCell>{prediction.confidence_percentage}%</TableCell>}
                  <TableCell>
                    {(() => {
                      // onlyUpcoming shows the underlying RACE's lifecycle
                      // status (fetched via cycling_race_races!inner(status)
                      // in the query) - not the prediction row's own
                      // 'active'/'archived' status, which is a different
                      // field with a different meaning. Admin's default view
                      // (onlyUpcoming=false) never fetches the joined status,
                      // so it keeps showing prediction.status exactly as before.
                      const displayStatus = onlyUpcoming
                        ? prediction.cycling_race_races?.status ?? prediction.status
                        : prediction.status;
                      return (
                        <Badge variant={displayStatus === "active" || displayStatus === "upcoming" ? "default" : "secondary"}>
                          {displayStatus}
                        </Badge>
                      );
                    })()}
                  </TableCell>
                  {!readOnly && (
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        title="Regenerate house prediction"
                        onClick={() => regenerate.mutate(prediction.id)}
                        disabled={regenerate.isPending}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No predictions yet. They appear automatically as races are queued.</p>
        </div>
      )}
    </div>
  );
}
