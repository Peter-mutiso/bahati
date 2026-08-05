import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  domain: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface TenantContextValue {
  tenant: Tenant | null;
  isLoading: boolean;
  /** true when running on localhost (dev mode) – uses Default Site */
  isDev: boolean;
  /**
   * true when the current domain is not registered in the tenants table
   * OR the tenant exists but is_active = false.
   * Game content must NOT render when this is true.
   */
  isUnauthorized: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  isLoading: true,
  isDev: false,
  isUnauthorized: false,
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  const isDev =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  useEffect(() => {
    const resolveTenant = async () => {
      const hostname = window.location.hostname;

      if (isDev) {
        // ── Development: fall back to Default Site so local testing always works ──
        const { data } = await supabase
          .from("tenants")
          .select("*")
          .eq("slug", "default")
          .maybeSingle();

        if (data) {
          setTenant(data);
          (window as any).__TENANT_ID__ = data.id;
        }
        // Even if the DB is empty in dev, we don't block access
        setIsLoading(false);
        return;
      }

      // ── Production: domain MUST be registered and active ─────────────────────
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("domain", hostname)
        .maybeSingle();

      if (error) {
        console.error("[TenantContext] Failed to resolve tenant:", error.message);
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      if (!data) {
        // Domain not in the tenants table at all
        console.warn(`[TenantContext] Domain "${hostname}" is not registered.`);
        setIsUnauthorized(true);
        setIsLoading(false);
        return;
      }

      if (!data.is_active) {
        // Domain exists but has been deactivated by admin
        console.warn(`[TenantContext] Domain "${hostname}" is registered but inactive.`);
        setIsUnauthorized(true);
        setTenant(data); // keep the data so we can show the site name in the block screen
        setIsLoading(false);
        return;
      }

      // ✅ Authorised
      setTenant(data);
      (window as any).__TENANT_ID__ = data.id;
      setIsLoading(false);
    };

    resolveTenant();
  }, [isDev]);

  return (
    <TenantContext.Provider value={{ tenant, isLoading, isDev, isUnauthorized }}>
      {children}
    </TenantContext.Provider>
  );
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useTenant = (): TenantContextValue => {
  return useContext(TenantContext);
};

/**
 * Returns the tenant_id to pass into Supabase queries on game sites.
 * Usage:
 *   const tid = useTenantId();
 *   const { data } = await supabase.from('profiles').select('*').eq('tenant_id', tid);
 */
export const useTenantId = (): string | null => {
  const { tenant } = useContext(TenantContext);
  return tenant?.id ?? null;
};
