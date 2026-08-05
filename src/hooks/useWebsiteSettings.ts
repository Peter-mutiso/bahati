import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/contexts/TenantContext";

interface WebsiteSettings {
  websiteName: string;
  websiteLogoUrl: string | null;
  faviconUrl: string | null;
}

export const useWebsiteSettings = () => {
  const tenantId = useTenantId();
  const [settings, setSettings] = useState<WebsiteSettings>({
    websiteName: "",
    websiteLogoUrl: null,
    faviconUrl: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from("game_settings")
        .select("website_name, website_logo_url, favicon_url")
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          websiteName: data.website_name || "",
          websiteLogoUrl: data.website_logo_url,
          faviconUrl: data.favicon_url,
        });
      }
    } catch (error) {
      console.error("Error fetching website settings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();

    // Listen for settings changes
    const handleSettingsChange = () => {
      fetchSettings();
    };

    window.addEventListener("websiteSettingsChanged", handleSettingsChange);
    return () => window.removeEventListener("websiteSettingsChanged", handleSettingsChange);
  }, [tenantId]);

  // Update document title when settings change
  useEffect(() => {
    if (settings.websiteName) {
      document.title = settings.websiteName;
    }
  }, [settings.websiteName]);

  // Update favicon when settings change
  useEffect(() => {
    const updateFavicon = () => {
      // Remove existing favicon links
      const existingLinks = document.querySelectorAll("link[rel*='icon']");
      existingLinks.forEach(link => link.remove());

      if (settings.faviconUrl) {
        // Add new favicon
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = settings.faviconUrl;
        document.head.appendChild(link);
      }
    };

    updateFavicon();
  }, [settings.faviconUrl]);

  return { ...settings, loading };
};
