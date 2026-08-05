import { Globe, ChevronDown, CheckCircle, PlusCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useActiveSite, type ActiveSite } from "@/contexts/ActiveSiteContext";
import type { Tenant } from "@/contexts/TenantContext";
import { cn } from "@/lib/utils";

interface SiteSelectorProps {
  /** Called when admin clicks "Add New Site" */
  onAddSite?: () => void;
}

export const SiteSelector = ({ onAddSite }: SiteSelectorProps) => {
  const { sites, activeSite, setActiveSite, isLoading } = useActiveSite();

  const label =
    activeSite === "all"
      ? "All Sites"
      : (activeSite as Tenant).name;

  const isSelected = (site: ActiveSite) => {
    if (activeSite === "all" && site === "all") return true;
    if (activeSite !== "all" && site !== "all") {
      return (activeSite as Tenant).id === (site as Tenant).id;
    }
    return false;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "gap-2 min-w-[160px] justify-between",
            "border-border/60 bg-card/80 backdrop-blur-sm",
            "hover:bg-primary/10 hover:border-primary/40 transition-all"
          )}
          disabled={isLoading}
          id="site-selector-trigger"
        >
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate max-w-[120px] text-sm font-medium">
              {isLoading ? "Loading…" : label}
            </span>
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56" id="site-selector-menu">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Select Site to Manage
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* All Sites option */}
        <DropdownMenuItem
          id="site-selector-all"
          onClick={() => setActiveSite("all")}
          className="gap-2 cursor-pointer"
        >
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="flex-1">All Sites</span>
          {isSelected("all") && (
            <CheckCircle className="w-3.5 h-3.5 text-primary" />
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Individual sites */}
        {sites.length === 0 && !isLoading && (
          <DropdownMenuItem disabled className="text-muted-foreground text-xs">
            No sites configured yet
          </DropdownMenuItem>
        )}

        {sites.map((site) => (
          <DropdownMenuItem
            key={site.id}
            id={`site-selector-${site.slug}`}
            onClick={() => setActiveSite(site)}
            className="gap-2 cursor-pointer"
          >
            <span className="flex-1 flex items-center gap-2">
              <span className="truncate">{site.name}</span>
              {!site.is_active && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0">
                  Off
                </Badge>
              )}
            </span>
            {isSelected(site) && (
              <CheckCircle className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            )}
          </DropdownMenuItem>
        ))}

        {/* Add New Site */}
        {onAddSite && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              id="site-selector-add"
              onClick={onAddSite}
              className="gap-2 cursor-pointer text-primary"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add New Site</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SiteSelector;
