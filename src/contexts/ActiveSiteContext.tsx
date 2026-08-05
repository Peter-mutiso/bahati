import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant } from "@/contexts/TenantContext";

// ─── Types ────────────────────────────────────────────────────────────────────

/** "all" means aggregate view across all sites. A Tenant object means filtered to that site. */
export type ActiveSite = Tenant | "all";

interface ActiveSiteContextValue {
  /** All registered tenants */
  sites: Tenant[];
  /** Currently selected site in the admin dropdown */
  activeSite: ActiveSite;
  /** Change the selected site */
  setActiveSite: (site: ActiveSite) => void;
  /** Whether sites are still loading */
  isLoading: boolean;
  /**
   * Returns a Supabase `.match()` compatible object.
   * Pass to `.match(tenantFilter)` on any admin query.
   * - If "all" → returns {} (no filter = all tenants)
   * - If a specific site → returns { tenant_id: site.id }
   */
  tenantFilter: Record<string, string>;
  /**
   * Equivalent helper for .eq() style: returns [column, value] or null if "all".
   * Usage: if (tenantEq) query = query.eq(tenantEq[0], tenantEq[1]);
   */
  tenantEq: [string, string] | null;
  /** Refresh the tenant list from the database */
  refreshSites: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ActiveSiteContext = createContext<ActiveSiteContextValue>({
  sites: [],
  activeSite: "all",
  setActiveSite: () => {},
  isLoading: true,
  tenantFilter: {},
  tenantEq: null,
  refreshSites: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const ActiveSiteProvider = ({ children }: { children: ReactNode }) => {
  const [sites, setSites] = useState<Tenant[]>([]);
  const [activeSite, setActiveSite] = useState<ActiveSite>("all");
  const [isLoading, setIsLoading] = useState(true);

  const fetchSites = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[ActiveSiteContext] Failed to load tenants:", error.message);
    } else {
      setSites(data ?? []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSites();
  }, []);

  // Derived helpers
  const tenantFilter: Record<string, string> =
    activeSite === "all" ? {} : { tenant_id: activeSite.id };

  const tenantEq: [string, string] | null =
    activeSite === "all" ? null : ["tenant_id", activeSite.id];

  return (
    <ActiveSiteContext.Provider
      value={{
        sites,
        activeSite,
        setActiveSite,
        isLoading,
        tenantFilter,
        tenantEq,
        refreshSites: fetchSites,
      }}
    >
      {children}
    </ActiveSiteContext.Provider>
  );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useActiveSite = (): ActiveSiteContextValue => {
  return useContext(ActiveSiteContext);
};

/**
 * Returns the active tenant_id or null when "all sites" is selected.
 * Convenient for simple single-column filters.
 */
export const useActiveTenantId = (): string | null => {
  const { activeSite } = useContext(ActiveSiteContext);
  return activeSite === "all" ? null : activeSite.id;
};
