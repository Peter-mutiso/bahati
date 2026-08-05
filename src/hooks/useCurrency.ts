import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/contexts/TenantContext";

export const useCurrency = () => {
  const tenantId = useTenantId();

  const { data: settings } = useQuery({
    queryKey: ["game-settings", tenantId],
    queryFn: async () => {
      if (!tenantId) return null;

      const { data, error } = await supabase
        .from("game_settings")
        .select("currency_symbol, currency_name")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    enabled: !!tenantId,
  });

  const formatCurrency = (amount: number) => {
    const symbol = settings?.currency_symbol || "KSH";
    return `${symbol}${amount.toFixed(2)}`;
  };

  return {
    symbol: settings?.currency_symbol || "KSH",
    name: settings?.currency_name || "KSH",
    formatCurrency,
  };
};
