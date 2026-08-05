import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const useMarketerCheck = () => {
  const [isMarketer, setIsMarketer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [marketerId, setMarketerId] = useState<string | null>(null);
  const [assignedTenantId, setAssignedTenantId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          navigate("/marketer-login");
          return;
        }

        const { data: marketer, error } = await supabase
          .from("marketers")
          .select("id, status")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error || !marketer) {
          navigate("/marketer-login");
          return;
        }

        if (marketer.status !== "approved") {
          navigate("/marketer-pending");
          return;
        }

        // Fetch assigned site
        const { data: assignment } = await supabase
          .from("marketer_site_assignments")
          .select("tenant_id")
          .eq("marketer_id", marketer.id)
          .maybeSingle();

        setMarketerId(marketer.id);
        setAssignedTenantId(assignment?.tenant_id ?? null);
        setIsMarketer(true);
      } catch (err) {
        console.error("Marketer check error:", err);
        navigate("/marketer-login");
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [navigate]);

  return { isMarketer, isLoading, marketerId, assignedTenantId };
};
