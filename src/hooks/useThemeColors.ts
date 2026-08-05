import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, getThemeById, applyTheme, Theme } from "@/config/themes";
import { useTenantId } from "@/contexts/TenantContext";

export const useThemeColors = () => {
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const tenantId = useTenantId();

  useEffect(() => {
    const fetchAndApplyTheme = async () => {
      if (!tenantId) return;

      try {
        const { data, error } = await supabase
          .from("game_settings")
          .select("theme_name")
          .eq("tenant_id", tenantId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching theme:", error);
          applyTheme(THEMES[0]);
          return;
        }

        const themeName = data?.theme_name || "neon-cyan";
        const theme = await getThemeById(themeName);
        setCurrentTheme(theme);
        applyTheme(theme);
      } catch (error) {
        console.error("Error applying theme:", error);
        applyTheme(THEMES[0]);
      }
    };

    fetchAndApplyTheme();

    // Listen for theme changes
    const handleThemeChange = () => {
      fetchAndApplyTheme();
    };

    window.addEventListener("themeColorsChanged", handleThemeChange);

    // Subscribe to database changes
    const channel = supabase
      .channel("theme-changes")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "game_settings",
        },
        () => {
          fetchAndApplyTheme();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener("themeColorsChanged", handleThemeChange);
      supabase.removeChannel(channel);
    };
  }, [tenantId]);

  return { currentTheme, themes: THEMES };
};
