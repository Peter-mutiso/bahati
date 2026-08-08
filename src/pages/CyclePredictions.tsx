import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BottomNav from "@/components/layout/BottomNav";
import DesktopNav from "@/components/layout/DesktopNav";
import { TrendingUp, Loader2, Info } from "lucide-react";

// This page never reads cycling_race_races and never reads the raw
// cycling_race_predictions table directly - it only calls the
// list_cycling_race_predictions() RPC (a SECURITY DEFINER Postgres
// function). That function decides server-side whether this account gets
// the real queued outcome (admins, marketers, demo/bot accounts) or an
// independently generated house prediction (real players). The client has
// no way to influence or observe that decision - it just renders whatever
// comes back.
const DEFAULT_TENANT_ID = "aaaaaaaa-0000-0000-0000-000000000001";

interface CyclistCustomization {
  name: string;
  flag: string;
}

interface CyclingRacePrediction {
  race_number: number;
  predicted_cyclist: number;
  confidence_percentage: number;
  is_verified_outcome: boolean;
}

const CyclePredictions = () => {
  const navigate = useNavigate();
  const [predictions, setPredictions] = useState<CyclingRacePrediction[]>([]);
  const [cyclistCustomization, setCyclistCustomization] = useState<CyclistCustomization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TEMPORARY DEBUG - remove after root cause is confirmed.
    console.log("[CyclePredictions DEBUG] effect mounted", { t: Date.now() });

    const checkAuth = async () => {
      console.log("[CyclePredictions DEBUG] checkAuth start", { t: Date.now() });
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[CyclePredictions DEBUG] getSession result", {
        t: Date.now(),
        userId: session?.user?.id ?? null,
      });
      if (!session) {
        navigate("/auth");
        return;
      }
      await loadData(session.user.id);
    };
    checkAuth();

    return () => {
      console.log("[CyclePredictions DEBUG] effect cleanup (component unmounting)", { t: Date.now() });
    };
  }, [navigate]);

  const loadData = async (userId: string) => {
    console.log("[CyclePredictions DEBUG] loadData start", { t: Date.now(), userId });

    let tenantId = DEFAULT_TENANT_ID;
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("tenant_id")
      .eq("id", userId)
      .single();
    console.log("[CyclePredictions DEBUG] profile lookup", {
      t: Date.now(),
      userId,
      profileTenantId: profile?.tenant_id ?? null,
      profileError: profileError?.message ?? null,
      usingFallbackDefault: !profile?.tenant_id,
    });
    if (profile?.tenant_id) tenantId = profile.tenant_id;

    const [{ data: settings }, { data: predictionRows, error }] = await Promise.all([
      supabase.from("cycling_race_settings").select("cyclist_customization").maybeSingle(),
      supabase.rpc("list_cycling_race_predictions", { p_tenant_id: tenantId, p_limit: 20 }),
    ]);

    console.log("[CyclePredictions DEBUG] loadData finished", {
      t: Date.now(),
      userId,
      tenantId,
      rpcError: error?.message ?? null,
      rowCount: predictionRows?.length ?? 0,
      rpcResult: predictionRows,
    });

    if (!error && predictionRows) setPredictions(predictionRows);

    if (Array.isArray(settings?.cyclist_customization)) {
      setCyclistCustomization(settings.cyclist_customization as unknown as CyclistCustomization[]);
    }

    setIsLoading(false);
    console.log("[CyclePredictions DEBUG] isLoading set to false", { t: Date.now() });
  };

  return (
    <div className="min-h-screen pb-20 md:pb-8 md:pt-16">
      <DesktopNav isAuthenticated={true} onAuthRequired={() => {}} />
      <div className="max-w-4xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gradient flex items-center gap-2">
          <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" />
          Cycle Race Predictions
        </h1>

        <Card className="p-3 sm:p-4 card-shadow flex items-start gap-3 bg-muted/40">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            These predictions are for entertainment purposes only. They do not affect race
            outcomes, betting, or payouts in any way.
          </p>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : predictions.length > 0 ? (
          <div className="space-y-3">
            {predictions.map((prediction) => {
              const winner = cyclistCustomization[prediction.predicted_cyclist - 1];
              return (
                <Card key={prediction.race_number} className="p-3 sm:p-4 card-shadow flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center text-lg font-bold flex-shrink-0">
                      {prediction.predicted_cyclist}
                    </span>
                    <div>
                      <p className="text-sm text-muted-foreground">Race #{prediction.race_number}</p>
                      <p className="font-bold">
                        {winner?.name || `Cyclist ${prediction.predicted_cyclist}`} {winner?.flag}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary" className="whitespace-nowrap">
                      {prediction.confidence_percentage}% confidence
                    </Badge>
                    {prediction.is_verified_outcome && (
                      <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                        Verified
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p>No predictions available right now. Check back soon.</p>
          </div>
        )}
      </div>
      <BottomNav isAuthenticated={true} />
    </div>
  );
};

export default CyclePredictions;
