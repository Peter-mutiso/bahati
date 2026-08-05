import { useTenant } from "@/contexts/TenantContext";
import { AlertCircle, ServerCrash } from "lucide-react";
import { ReactNode } from "react";

export const TenantGate = ({ children }: { children: ReactNode }) => {
  const { isLoading, isUnauthorized, tenant } = useTenant();
  const isAdminRoute = window.location.pathname.startsWith('/admin');
  const adminDomain = import.meta.env.VITE_ADMIN_DOMAIN || 'admin.kukubahati.com';
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const isMasterAdminDomain = window.location.hostname === adminDomain || isLocalhost;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-muted-foreground animate-pulse">connecting...</p>
      </div>
    );
  }

  // 0. Admin Domain Landing Redirect: If on the master admin domain but NOT an admin route, redirect to login.
  // We allow localhost to bypass this for development.
  if (isMasterAdminDomain && !isAdminRoute && !isLocalhost) {
    window.location.href = '/admin-login';
    return null;
  }

  // 1. Strict Admin Guard: If trying to access admin from a game site, block completely.
  if (isAdminRoute && !isMasterAdminDomain) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <ServerCrash className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            The platform administration panel is strictly isolated to the master domain. 
          </p>
          <a href="/" className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium">
            Return to Game
          </a>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Game Site Guard: Block game rendering if domain is unregistered.
  // CRITICAL: We skip this check for the Master Admin Domain so you can always log in 
  // to the panel even before the domain is registered in the database.
  if (isUnauthorized && !isMasterAdminDomain) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
        <div className="max-w-md w-full bg-card border rounded-lg p-8 shadow-xl flex flex-col items-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
            <ServerCrash className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Domain Not Authorized</h1>
          <p className="text-muted-foreground mb-6">
            The domain <strong className="text-foreground">{window.location.hostname}</strong>{" "}
            is not registered to any active game site.
          </p>
          {tenant && !tenant.is_active && (
            <div className="flex items-start gap-3 bg-amber-500/10 text-amber-500 p-4 rounded-md text-left w-full">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Site is Currently Inactive</p>
                <p className="text-xs mt-1">
                  This site ({tenant.name}) has been deactivated by the platform administrator.
                </p>
              </div>
            </div>
          )}
          {!tenant && (
            <div className="flex items-start gap-3 bg-muted p-4 rounded-md text-left w-full">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">
                <p>If you are the administrator, please log in to the central Admin Panel and add this domain in the <strong>Sites Management</strong> tab.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
