import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CycleRacePredictions } from "@/components/admin/CycleRacePredictions";
import { Loader2 } from "lucide-react";

interface CyclistCustomization {
  name: string;
  flag: string;
}

// Combines the exact same checks useAdminCheck.ts and useMarketerCheck.ts
// already perform (user_roles for admin, marketers/status for an approved
// marketer) into a single page-level gate. Not a new authorization system -
// the two existing hooks each redirect on their own as soon as they mount,
// which would race/conflict if both were used on one page, so this reads
// the same underlying tables directly instead and decides once.
const CycleRacePredictionsOversight = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "admin" | "marketer" | "denied">("loading");
  const [cyclistCustomization, setCyclistCustomization] = useState<CyclistCustomization[]>([]);

  useEffect(() => {
    let isMounted = true;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (isMounted) navigate("/auth");
        return;
      }

      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (adminRole) {
        if (isMounted) setStatus("admin");
        return;
      }

      const { data: marketer } = await supabase
        .from("marketers")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (isMounted) setStatus(marketer?.status === "approved" ? "marketer" : "denied");
    };

    check();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (status !== "admin" && status !== "marketer") return;
    // Same source every other Cycle Race prediction screen uses for cyclist
    // display names (cycling_race_settings.cyclist_customization).
    supabase
      .from("cycling_race_settings")
      .select("cyclist_customization")
      .maybeSingle()
      .then(({ data }) => {
        if (Array.isArray(data?.cyclist_customization)) {
          setCyclistCustomization(data.cyclist_customization as unknown as CyclistCustomization[]);
        }
      });
  }, [status]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center gap-2">
        <h1 className="text-xl font-bold">Access Restricted</h1>
        <p className="text-muted-foreground text-sm max-w-sm">
          This page is only available to authorized admin or approved marketer accounts.
        </p>
      </div>
    );
  }

  // status is "admin" or "marketer" here - admin sees the existing
  // unrestricted oversight view (readOnly/onlyUpcoming default false,
  // matching CycleRaceSettings.tsx's usage exactly); marketer sees the
  // existing read-only, upcoming-only, real-outcome-only view (no House
  // Prediction/Confidence), matching MarketerDashboard.tsx's usage exactly.
  // RLS on cycling_race_predictions/cycling_race_races is what actually
  // enforces which rows either role can see - this page grants nothing new.
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <h1 className="text-xl font-bold">Cycle Race — Prediction Oversight</h1>
        <CycleRacePredictions
          cyclistCustomization={cyclistCustomization}
          readOnly={status === "marketer"}
          onlyUpcoming={status === "marketer"}
          limit={status === "marketer" ? 10 : 100}
        />
      </div>
    </div>
  );
};

export default CycleRacePredictionsOversight;
