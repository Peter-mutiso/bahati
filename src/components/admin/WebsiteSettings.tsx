import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useActiveSite } from "@/contexts/ActiveSiteContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Palette, Check, Sparkles, Trash2, Paintbrush, AlertCircle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { THEMES, Theme } from "@/config/themes";
import { Badge } from "@/components/ui/badge";
import { CustomThemeBuilder } from "./CustomThemeBuilder";

export const WebsiteSettings = () => {
  const { activeSite, tenantFilter, tenantEq } = useActiveSite();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [websiteName, setWebsiteName] = useState("");
  const [websiteLogoUrl, setWebsiteLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [upiMethodName, setUpiMethodName] = useState("UPI");
  const [upiId, setUpiId] = useState("");
  const [upiEnabled, setUpiEnabled] = useState(true);
  const [upiQrEnabled, setUpiQrEnabled] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState("");
  const [usdtMethodName, setUsdtMethodName] = useState("USDT");
  const [usdtAddress, setUsdtAddress] = useState("");
  const [usdtEnabled, setUsdtEnabled] = useState(true);
  const [usdtQrEnabled, setUsdtQrEnabled] = useState(false);
  const [usdtQrUrl, setUsdtQrUrl] = useState("");
  const [usdtConversionRate, setUsdtConversionRate] = useState("80");
  const [btcMethodName, setBtcMethodName] = useState("BTC");
  const [btcAddress, setBtcAddress] = useState("");
  const [btcEnabled, setBtcEnabled] = useState(false);
  const [btcQrEnabled, setBtcQrEnabled] = useState(false);
  const [btcQrUrl, setBtcQrUrl] = useState("");
  const [showUtrNumber, setShowUtrNumber] = useState(true);
  const [showWalletAddress, setShowWalletAddress] = useState(true);
  const [minDeposit, setMinDeposit] = useState("10");
  const [maxDeposit, setMaxDeposit] = useState("100000");
  const [loanFeatureEnabled, setLoanFeatureEnabled] = useState(true);
  const [mpesaEnabled, setMpesaEnabled] = useState(false);
  const [withdrawalsEnabled, setWithdrawalsEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState("neon-cyan");
  const [customThemes, setCustomThemes] = useState<Theme[]>([]);
  const [themeToEdit, setThemeToEdit] = useState<Theme | null>(null);
  const { toast } = useToast();

  // Load custom themes from database
  const loadCustomThemes = async () => {
    try {
      const { data, error } = await supabase
        .from("custom_themes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const themes: Theme[] = data.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          mode: row.mode as "dark" | "light",
          preview: row.preview as any,
          colors: row.colors as any,
          gradients: row.gradients as any,
          shadows: row.shadows as any,
          radius: row.radius,
        }));
        setCustomThemes(themes);
      }
    } catch (error) {
      console.error("Error loading custom themes:", error);
    }
  };

  useEffect(() => {
    if (activeSite !== "all") {
      loadCustomThemes();
    }
  }, [activeSite]);

  const handleCustomThemeCreated = (theme: Theme) => {
    setCustomThemes(prev => [...prev, theme]);
    setSelectedTheme(theme.id);
    toast({
      title: "Theme Created",
      description: `${theme.name} has been added successfully`,
    });
  };

  const handleCustomThemeUpdated = (theme: Theme) => {
    setCustomThemes(prev => prev.map(t => t.id === theme.id ? theme : t));
    toast({
      title: "Theme Updated",
      description: `${theme.name} has been updated successfully`,
    });
  };

  const handleDeleteTheme = async (themeId: string) => {
    try {
      const { error } = await supabase
        .from("custom_themes")
        .delete()
        .eq("id", themeId);

      if (error) throw error;

      setCustomThemes(prev => prev.filter(t => t.id !== themeId));

      // If the deleted theme was selected, switch to default
      if (selectedTheme === themeId) {
        setSelectedTheme("neon-cyan");
      }

      toast({
        title: "Theme Deleted",
        description: "Custom theme has been removed",
      });
    } catch (error) {
      console.error("Error deleting theme:", error);
      toast({
        title: "Error",
        description: "Failed to delete theme",
        variant: "destructive",
      });
    }
  };

  const allThemes = [...THEMES, ...customThemes];

  useEffect(() => {
    if (activeSite !== "all") {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [activeSite]);

  const fetchSettings = async () => {
    if (activeSite === "all") return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("game_settings")
        .select("website_name, website_logo_url, favicon_url, upi_method_name, upi_id, upi_enabled, upi_qr_enabled, upi_qr_url, usdt_method_name, usdt_address, usdt_enabled, usdt_qr_enabled, usdt_qr_url, usdt_conversion_rate, btc_method_name, btc_address, btc_enabled, btc_qr_enabled, btc_qr_url, show_utr_number, show_wallet_address, min_deposit, max_deposit, loan_feature_enabled, mpesa_enabled, withdrawals_enabled, theme_name")
        .match(tenantFilter)
        .maybeSingle();

      // Log but don't throw — missing columns degrade gracefully
      if (error) {
        console.warn("game_settings fetch warning:", error.message);
      }

      // data is null when there are no rows — state defaults handle that
      if (data) {
        setWebsiteName(data.website_name || "Kuku Bahati");
        setWebsiteLogoUrl(data.website_logo_url || "");
        setFaviconUrl(data.favicon_url || "");
        setUpiMethodName(data.upi_method_name || "UPI");
        setUpiId(data.upi_id || "");
        setUpiEnabled(data.upi_enabled ?? true);
        setUpiQrEnabled(data.upi_qr_enabled ?? false);
        setUpiQrUrl(data.upi_qr_url || "");
        setUsdtMethodName(data.usdt_method_name || "USDT");
        setUsdtAddress(data.usdt_address || "");
        setUsdtEnabled(data.usdt_enabled ?? true);
        setUsdtQrEnabled(data.usdt_qr_enabled ?? false);
        setUsdtQrUrl(data.usdt_qr_url || "");
        setUsdtConversionRate((data as any).usdt_conversion_rate?.toString() || "80");
        setBtcMethodName((data as any).btc_method_name || "BTC");
        setBtcAddress((data as any).btc_address || "");
        setBtcEnabled((data as any).btc_enabled ?? false);
        setBtcQrEnabled((data as any).btc_qr_enabled ?? false);
        setBtcQrUrl((data as any).btc_qr_url || "");
        setShowUtrNumber((data as any).show_utr_number ?? true);
        setShowWalletAddress((data as any).show_wallet_address ?? true);
        setMinDeposit((data as any).min_deposit?.toString() || "10");
        setMaxDeposit((data as any).max_deposit?.toString() || "100000");
        setLoanFeatureEnabled((data as any).loan_feature_enabled ?? true);
        setMpesaEnabled((data as any).mpesa_enabled ?? false);
        setWithdrawalsEnabled((data as any).withdrawals_enabled ?? true);
        setSelectedTheme((data as any).theme_name || "neon-cyan");
      }
    } catch (error) {
      console.error("Error fetching website settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (theme: Theme) => {
    setSelectedTheme(theme.id);
    toast({
      title: "Theme Selected",
      description: `${theme.name} theme selected. Click "Save Changes" to apply.`,
    });
  };

  const handleSave = async () => {
    if (activeSite === "all") return;

    setSaving(true);
    try {
      // Get the existing row id (if any)
      const { data: existing } = await supabase
        .from("game_settings")
        .select("id")
        .match(tenantFilter)
        .maybeSingle();

      const payload = {
        website_name: websiteName,
        website_logo_url: websiteLogoUrl || null,
        favicon_url: faviconUrl || null,
        upi_method_name: upiMethodName,
        upi_id: upiId,
        upi_enabled: upiEnabled,
        upi_qr_enabled: upiQrEnabled,
        upi_qr_url: upiQrUrl || null,
        usdt_method_name: usdtMethodName,
        usdt_address: usdtAddress,
        usdt_enabled: usdtEnabled,
        usdt_qr_enabled: usdtQrEnabled,
        usdt_qr_url: usdtQrUrl || null,
        usdt_conversion_rate: parseFloat(usdtConversionRate) || 80,
        btc_method_name: btcMethodName,
        btc_address: btcAddress || null,
        btc_enabled: btcEnabled,
        btc_qr_enabled: btcQrEnabled,
        btc_qr_url: btcQrUrl || null,
        show_utr_number: showUtrNumber,
        show_wallet_address: showWalletAddress,
        min_deposit: parseFloat(minDeposit) || 10,
        max_deposit: parseFloat(maxDeposit) || 100000,
        loan_feature_enabled: loanFeatureEnabled,
        mpesa_enabled: mpesaEnabled,
        withdrawals_enabled: withdrawalsEnabled,
        theme_name: selectedTheme,
        tenant_id: activeSite.id,
      };

      let saveError: any = null;

      if (existing?.id) {
        // Row exists — update it
        const { error } = await supabase
          .from("game_settings")
          .update(payload)
          .eq("id", existing.id);
        saveError = error;
      } else {
        // No row yet — insert one
        const { error } = await supabase
          .from("game_settings")
          .insert(payload);
        saveError = error;
      }

      if (saveError) throw saveError;

      window.dispatchEvent(new CustomEvent("websiteSettingsChanged"));
      window.dispatchEvent(new CustomEvent("themeColorsChanged"));

      toast({
        title: "Success",
        description: "Website settings and theme updated successfully",
      });
    } catch (error) {
      console.error("Error saving website settings:", error);
      toast({
        title: "Error",
        description: "Failed to save website settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (activeSite === "all") {
    return (
      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-500">
            <AlertCircle className="w-5 h-5" />
            Selection Required
          </CardTitle>
          <CardDescription>
            You must select a specific site from the dropdown above to manage its branding and theme settings.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Website Configuration
        </CardTitle>
        <CardDescription>
          Configure your website branding, theme, and payment methods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="themes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="themes">Themes</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="payment">Payment Methods</TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Website Themes</h3>
                </div>
                <div className="flex gap-2">
                  <CustomThemeBuilder
                    onThemeCreated={handleCustomThemeCreated}
                    onThemeUpdated={handleCustomThemeUpdated}
                  />
                  {themeToEdit && (
                    <CustomThemeBuilder
                      key={themeToEdit.id}
                      editTheme={themeToEdit}
                      onThemeCreated={handleCustomThemeCreated}
                      onThemeUpdated={(theme) => {
                        handleCustomThemeUpdated(theme);
                        setThemeToEdit(null);
                      }}
                    />
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Select a complete theme or create your own custom color scheme
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allThemes.map((theme) => {
                  const isCustom = theme.id.startsWith("custom-");
                  return (
                    <div key={theme.id} className="relative group">
                      <button
                        onClick={() => handleThemeSelect(theme)}
                        className={`w-full p-4 border-2 rounded-xl transition-all duration-300 text-left ${selectedTheme === theme.id
                          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:shadow-md bg-card"
                          }`}
                      >
                        {selectedTheme === theme.id && (
                          <div className="absolute top-2 right-2">
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <Check className="w-4 h-4 text-primary-foreground" />
                            </div>
                          </div>
                        )}

                        {/* Theme Preview Colors */}
                        <div className="mb-3">
                          <div className="flex gap-1 mb-2">
                            <div
                              className="flex-1 h-12 rounded-lg shadow-inner"
                              style={{ backgroundColor: `hsl(${theme.preview.primary})` }}
                            />
                            <div
                              className="flex-1 h-12 rounded-lg shadow-inner"
                              style={{ backgroundColor: `hsl(${theme.preview.secondary})` }}
                            />
                          </div>
                          <div className="flex gap-1">
                            <div
                              className="flex-1 h-8 rounded-lg shadow-inner border"
                              style={{ backgroundColor: `hsl(${theme.preview.background})` }}
                            />
                            <div
                              className="flex-1 h-8 rounded-lg shadow-inner"
                              style={{ backgroundColor: `hsl(${theme.preview.card})` }}
                            />
                          </div>
                        </div>

                        {/* Theme Info */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{theme.name}</h4>
                            {theme.id === "neon-cyan" && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Default
                              </Badge>
                            )}
                            {isCustom && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 bg-primary/80">
                                Custom
                              </Badge>
                            )}
                            {theme.mode === "light" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                Light
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {theme.description}
                          </p>
                        </div>

                        {/* Hover effect indicator */}
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 pointer-events-none ${selectedTheme === theme.id ? "opacity-0" : "opacity-0 group-hover:opacity-100"
                          }`}>
                          <div className="absolute inset-0 rounded-xl border-2 border-primary/30" />
                        </div>
                      </button>

                      {/* Edit/Delete buttons for custom themes */}
                      {isCustom && (
                        <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Store theme to edit and trigger a state update
                              setThemeToEdit(theme);
                            }}
                          >
                            <Paintbrush className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 rounded-full shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete theme "${theme.name}"?`)) {
                                handleDeleteTheme(theme.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Current Theme Preview */}
              <div className="mt-6 p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Selected Theme Preview</span>
                </div>
                {(() => {
                  const currentTheme = allThemes.find(t => t.id === selectedTheme) || THEMES[0];
                  return (
                    <div
                      className="p-4 rounded-lg border"
                      style={{
                        background: currentTheme.gradients.background,
                        borderColor: `hsl(${currentTheme.colors.border})`
                      }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div
                          className="px-4 py-2 rounded-lg font-semibold text-sm"
                          style={{
                            background: `hsl(${currentTheme.colors.primary})`,
                            color: `hsl(${currentTheme.colors.primaryForeground})`
                          }}
                        >
                          Primary Button
                        </div>
                        <div
                          className="px-4 py-2 rounded-lg font-semibold text-sm"
                          style={{
                            background: `hsl(${currentTheme.colors.secondary})`,
                            color: `hsl(${currentTheme.colors.secondaryForeground})`
                          }}
                        >
                          Secondary
                        </div>
                        <div
                          className="px-4 py-2 rounded-lg font-semibold text-sm"
                          style={{
                            background: `hsl(${currentTheme.colors.accent})`,
                            color: `hsl(${currentTheme.colors.accentForeground})`
                          }}
                        >
                          Accent
                        </div>
                      </div>
                      <div
                        className="p-3 rounded-lg"
                        style={{
                          background: `hsl(${currentTheme.colors.card})`,
                          color: `hsl(${currentTheme.colors.cardForeground})`
                        }}
                      >
                        <p className="text-sm">This is how cards will look with the <strong>{currentTheme.name}</strong> theme.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="branding" className="space-y-6 mt-6">
            <div className="space-y-2">
              <Label htmlFor="website-name">Website Name</Label>
              <Input
                id="website-name"
                value={websiteName}
                onChange={(e) => setWebsiteName(e.target.value)}
                placeholder="Enter website name"
              />
              <p className="text-xs text-muted-foreground">
                This name will appear in the navigation and browser title
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website-logo">Logo URL</Label>
              <Input
                id="website-logo"
                value={websiteLogoUrl}
                onChange={(e) => setWebsiteLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Provide a URL to your logo image. Leave empty to use the default icon.
              </p>
              {websiteLogoUrl && (
                <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={websiteLogoUrl}
                    alt="Logo preview"
                    className="h-8 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      toast({
                        title: "Invalid Logo URL",
                        description: "The provided URL doesn't point to a valid image",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="favicon">Favicon URL</Label>
              <Input
                id="favicon"
                value={faviconUrl}
                onChange={(e) => setFaviconUrl(e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Provide a URL to your favicon. This will appear in the browser tab.
              </p>
              {faviconUrl && (
                <div className="mt-2 p-4 border border-border rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                  <img
                    src={faviconUrl}
                    alt="Favicon preview"
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      toast({
                        title: "Invalid Favicon URL",
                        description: "The provided URL doesn't point to a valid image",
                        variant: "destructive",
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="payment" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="upi-enabled" className="text-base font-semibold">Enable UPI</Label>
                  <p className="text-sm text-muted-foreground">Allow users to deposit via UPI</p>
                </div>
                <Switch
                  id="upi-enabled"
                  checked={upiEnabled}
                  onCheckedChange={setUpiEnabled}
                />
              </div>

              {upiEnabled && (
                <div className="space-y-4 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label htmlFor="upi-method-name">Payment Method Display Name</Label>
                    <Input
                      id="upi-method-name"
                      value={upiMethodName}
                      onChange={(e) => setUpiMethodName(e.target.value)}
                      placeholder="e.g., UPI, PhonePe, GPay"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input
                      id="upi-id"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="yourname@upi"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <Label htmlFor="upi-qr-enabled" className="text-sm font-medium">Show QR Code</Label>
                      <p className="text-xs text-muted-foreground">Display QR code for UPI payments</p>
                    </div>
                    <Switch
                      id="upi-qr-enabled"
                      checked={upiQrEnabled}
                      onCheckedChange={setUpiQrEnabled}
                    />
                  </div>

                  {upiQrEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="upi-qr-url">UPI QR Code URL</Label>
                      <Input
                        id="upi-qr-url"
                        value={upiQrUrl}
                        onChange={(e) => setUpiQrUrl(e.target.value)}
                        placeholder="https://example.com/upi-qr.png"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="usdt-enabled" className="text-base font-semibold">Enable USDT</Label>
                  <p className="text-sm text-muted-foreground">Allow users to deposit via USDT</p>
                </div>
                <Switch
                  id="usdt-enabled"
                  checked={usdtEnabled}
                  onCheckedChange={setUsdtEnabled}
                />
              </div>

              {usdtEnabled && (
                <div className="space-y-4 pl-4 border-l-2">
                  <div className="space-y-2">
                    <Label htmlFor="usdt-method-name">Payment Method Display Name</Label>
                    <Input
                      id="usdt-method-name"
                      value={usdtMethodName}
                      onChange={(e) => setUsdtMethodName(e.target.value)}
                      placeholder="e.g., USDT, Tether, Crypto"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usdt-address">USDT Wallet Address</Label>
                    <Input
                      id="usdt-address"
                      value={usdtAddress}
                      onChange={(e) => setUsdtAddress(e.target.value)}
                      placeholder="TRC20 or ERC20 address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="usdt-conversion-rate">USDT Conversion Rate</Label>
                    <Input
                      id="usdt-conversion-rate"
                      type="number"
                      value={usdtConversionRate}
                      onChange={(e) => setUsdtConversionRate(e.target.value)}
                      placeholder="80"
                    />
                    <p className="text-xs text-muted-foreground">
                      Currency value per 1 USDT (e.g., 80 means 1 USDT = 80 in local currency)
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <Label htmlFor="usdt-qr-enabled" className="text-sm font-medium">Show QR Code</Label>
                      <p className="text-xs text-muted-foreground">Display QR code for USDT payments</p>
                    </div>
                    <Switch
                      id="usdt-qr-enabled"
                      checked={usdtQrEnabled}
                      onCheckedChange={setUsdtQrEnabled}
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <Label htmlFor="btc-enabled" className="text-base font-semibold">Enable BTC</Label>
                        <p className="text-sm text-muted-foreground">Allow users to deposit via Bitcoin</p>
                      </div>
                      <Switch
                        id="btc-enabled"
                        checked={btcEnabled}
                        onCheckedChange={setBtcEnabled}
                      />
                    </div>

                    {btcEnabled && (
                      <div className="space-y-4 pl-4 border-l-2">
                        <div className="space-y-2">
                          <Label htmlFor="btc-method-name">Payment Method Display Name</Label>
                          <Input
                            id="btc-method-name"
                            value={btcMethodName}
                            onChange={(e) => setBtcMethodName(e.target.value)}
                            placeholder="e.g., BTC, Bitcoin"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="btc-address">BTC Wallet Address</Label>
                          <Input
                            id="btc-address"
                            value={btcAddress}
                            onChange={(e) => setBtcAddress(e.target.value)}
                            placeholder="Bitcoin wallet address"
                          />
                        </div>

                        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                          <div className="space-y-1">
                            <Label htmlFor="btc-qr-enabled" className="text-sm font-medium">Show QR Code</Label>
                            <p className="text-xs text-muted-foreground">Display QR code for BTC payments</p>
                          </div>
                          <Switch
                            id="btc-qr-enabled"
                            checked={btcQrEnabled}
                            onCheckedChange={setBtcQrEnabled}
                          />
                        </div>

                        {btcQrEnabled && (
                          <div className="space-y-2">
                            <Label htmlFor="btc-qr-url">BTC QR Code URL</Label>
                            <Input
                              id="btc-qr-url"
                              value={btcQrUrl}
                              onChange={(e) => setBtcQrUrl(e.target.value)}
                              placeholder="https://example.com/btc-qr.png"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {usdtQrEnabled && (
                    <div className="space-y-2">
                      <Label htmlFor="usdt-qr-url">USDT QR Code URL</Label>
                      <Input
                        id="usdt-qr-url"
                        value={usdtQrUrl}
                        onChange={(e) => setUsdtQrUrl(e.target.value)}
                        placeholder="https://example.com/usdt-qr.png"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* M-Pesa Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="mpesa-enabled" className="text-base font-semibold">Enable M-Pesa</Label>
                  <p className="text-sm text-muted-foreground">Allow users to deposit & withdraw via M-Pesa (STK Push)</p>
                </div>
                <Switch
                  id="mpesa-enabled"
                  checked={mpesaEnabled}
                  onCheckedChange={setMpesaEnabled}
                />
              </div>

              {mpesaEnabled && (
                <div className="space-y-4 pl-4 border-l-2 border-green-500/50">
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <span className="text-green-400 text-lg">📱</span>
                    <div>
                      <p className="text-sm font-medium text-green-400">M-Pesa STK Push Active</p>
                      <p className="text-xs text-muted-foreground">Users will receive an automated payment prompt on their phone</p>
                    </div>
                  </div>
                  <div className="p-3 bg-muted/30 border rounded-lg">
                    <p className="text-xs text-muted-foreground">Deposits: STK Push (users enter PIN on phone)</p>
                    <p className="text-xs text-muted-foreground">Withdrawals: B2C transfer directly to user's phone</p>
                    <p className="text-xs text-muted-foreground mt-1">Credentials are securely stored as server secrets.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold">Transaction Settings</h4>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="enable-withdrawals" className="text-sm font-medium">Enable Withdrawals</Label>
                  <p className="text-xs text-muted-foreground">Allow users to withdraw funds from their wallet</p>
                </div>
                <Switch
                  id="enable-withdrawals"
                  checked={withdrawalsEnabled}
                  onCheckedChange={setWithdrawalsEnabled}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="show-utr" className="text-sm font-medium">Show UTR Number Field</Label>
                  <p className="text-xs text-muted-foreground">Allow users to enter UTR/transaction reference</p>
                </div>
                <Switch
                  id="show-utr"
                  checked={showUtrNumber}
                  onCheckedChange={setShowUtrNumber}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="show-wallet" className="text-sm font-medium">Show Wallet Address Field</Label>
                  <p className="text-xs text-muted-foreground">Allow users to enter their wallet address for withdrawals</p>
                </div>
                <Switch
                  id="show-wallet"
                  checked={showWalletAddress}
                  onCheckedChange={setShowWalletAddress}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-deposit">Minimum Deposit</Label>
                  <Input
                    id="min-deposit"
                    type="number"
                    value={minDeposit}
                    onChange={(e) => setMinDeposit(e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-deposit">Maximum Deposit</Label>
                  <Input
                    id="max-deposit"
                    type="number"
                    value={maxDeposit}
                    onChange={(e) => setMaxDeposit(e.target.value)}
                    placeholder="100000"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="loan-enabled" className="text-sm font-medium">Enable Loan Feature</Label>
                  <p className="text-xs text-muted-foreground">Allow users to take small loans</p>
                </div>
                <Switch
                  id="loan-enabled"
                  checked={loanFeatureEnabled}
                  onCheckedChange={setLoanFeatureEnabled}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
