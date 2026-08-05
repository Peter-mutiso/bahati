import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Paintbrush, Sun, Moon, Save, RotateCcw, Eye, Sparkles, Loader2 } from "lucide-react";
import { Theme, THEMES, applyTheme } from "@/config/themes";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomThemeBuilderProps {
  onThemeCreated: (theme: Theme) => void;
  onThemeUpdated?: (theme: Theme) => void;
  editTheme?: Theme | null;
}

const defaultCustomTheme: Theme = {
  id: "custom",
  name: "My Custom Theme",
  description: "A personalized theme created from scratch",
  mode: "dark",
  preview: {
    primary: "200 100% 50%",
    secondary: "280 100% 60%",
    background: "220 25% 8%",
    card: "220 20% 12%",
  },
  colors: {
    background: "220 25% 8%",
    foreground: "210 40% 98%",
    card: "220 20% 12%",
    cardForeground: "210 40% 98%",
    popover: "220 20% 12%",
    popoverForeground: "210 40% 98%",
    primary: "200 100% 50%",
    primaryForeground: "220 25% 8%",
    secondary: "280 100% 60%",
    secondaryForeground: "210 40% 98%",
    muted: "220 15% 18%",
    mutedForeground: "215 15% 65%",
    accent: "200 100% 50%",
    accentForeground: "220 25% 8%",
    destructive: "0 85% 60%",
    destructiveForeground: "210 40% 98%",
    success: "142 76% 48%",
    successForeground: "220 25% 8%",
    border: "220 15% 20%",
    input: "220 15% 18%",
    ring: "200 100% 50%",
  },
  gradients: {
    primary: "linear-gradient(135deg, hsl(200 100% 50%), hsl(220 100% 60%))",
    secondary: "linear-gradient(135deg, hsl(280 100% 60%), hsl(300 100% 65%))",
    background: "linear-gradient(180deg, hsl(220 25% 8%), hsl(220 30% 5%))",
  },
  shadows: {
    glow: "0 0 40px hsl(200 100% 50% / 0.3)",
    card: "0 8px 32px hsl(0 0% 0% / 0.5)",
  },
  radius: "0.75rem",
};

// Convert HSL string to hex for color picker
const hslToHex = (hsl: string): string => {
  const parts = hsl.split(" ");
  if (parts.length < 3) return "#000000";
  
  const h = parseFloat(parts[0]) / 360;
  const s = parseFloat(parts[1].replace("%", "")) / 100;
  const l = parseFloat(parts[2].replace("%", "")) / 100;
  
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  const toHex = (x: number) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Convert hex to HSL string
const hexToHsl = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

const ColorPicker = ({ label, value, onChange, description }: ColorPickerProps) => {
  const hexValue = hslToHex(value);
  
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-background/50">
      <div className="relative">
        <input
          type="color"
          value={hexValue}
          onChange={(e) => onChange(hexToHsl(e.target.value))}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-border"
          style={{ backgroundColor: hexValue }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-[10px] text-muted-foreground truncate">{description}</p>
        )}
      </div>
      <code className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded hidden sm:block">
        {value}
      </code>
    </div>
  );
};

export const CustomThemeBuilder = ({ onThemeCreated, onThemeUpdated, editTheme }: CustomThemeBuilderProps) => {
  const [open, setOpen] = useState(false);
  const [customTheme, setCustomTheme] = useState<Theme>(editTheme || defaultCustomTheme);
  const [themeName, setThemeName] = useState(editTheme?.name || "My Custom Theme");
  const [themeMode, setThemeMode] = useState<"dark" | "light">(editTheme?.mode || "dark");
  const [gradientStart, setGradientStart] = useState(editTheme?.colors.background || defaultCustomTheme.colors.background);
  const [gradientEnd, setGradientEnd] = useState(editTheme?.colors.background || defaultCustomTheme.colors.background);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const isEditing = !!editTheme;

  // Auto-open dialog when editTheme is provided
  useEffect(() => {
    if (editTheme) {
      setOpen(true);
    }
  }, [editTheme]);

  const updateColor = (key: keyof Theme["colors"], value: string) => {
    setCustomTheme(prev => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
      preview: {
        ...prev.preview,
        ...(key === "primary" ? { primary: value } : {}),
        ...(key === "secondary" ? { secondary: value } : {}),
        ...(key === "background" ? { background: value } : {}),
        ...(key === "card" ? { card: value } : {}),
      },
    }));
  };

  const updateGradient = (key: keyof Theme["gradients"], colors: { start: string; end: string }) => {
    const gradient = `linear-gradient(180deg, hsl(${colors.start}), hsl(${colors.end}))`;
    setCustomTheme(prev => ({
      ...prev,
      gradients: { ...prev.gradients, [key]: gradient },
    }));
    
    // Update local gradient state
    if (key === "background") {
      setGradientStart(colors.start);
      setGradientEnd(colors.end);
    }
  };

  const handlePreview = () => {
    const previewTheme: Theme = {
      ...customTheme,
      id: "custom-preview",
      name: themeName,
      mode: themeMode,
    };
    applyTheme(previewTheme);
    toast({
      title: "Preview Applied",
      description: "Theme preview is now active. Save to keep changes.",
    });
  };

  const handleSave = async () => {
    if (!themeName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a theme name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const themeData: Theme = {
        ...customTheme,
        id: isEditing ? editTheme.id : `custom-${Date.now()}`,
        name: themeName,
        description: isEditing ? editTheme.description : "Custom theme created with Theme Builder",
        mode: themeMode,
      };

      const { data: { user } } = await supabase.auth.getUser();
      
      const dbData = {
        id: themeData.id,
        name: themeData.name,
        description: themeData.description,
        mode: themeData.mode,
        preview: themeData.preview,
        colors: themeData.colors,
        gradients: themeData.gradients,
        shadows: themeData.shadows,
        radius: themeData.radius,
        created_by: user?.id,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("custom_themes")
          .update(dbData)
          .eq("id", themeData.id);

        if (error) throw error;
        
        if (onThemeUpdated) {
          onThemeUpdated(themeData);
        }
      } else {
        const { error } = await supabase
          .from("custom_themes")
          .insert(dbData);

        if (error) throw error;
        
        onThemeCreated(themeData);
      }

      setOpen(false);
      toast({
        title: isEditing ? "Theme Updated" : "Theme Created",
        description: `${themeName} has been ${isEditing ? "updated" : "saved"} successfully.`,
      });
    } catch (error) {
      console.error("Error saving theme:", error);
      toast({
        title: "Error",
        description: "Failed to save theme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setCustomTheme(defaultCustomTheme);
    setThemeName("My Custom Theme");
    setThemeMode("dark");
  };

  const loadFromExisting = (themeId: string) => {
    const existingTheme = THEMES.find(t => t.id === themeId);
    if (existingTheme) {
      setCustomTheme({ ...existingTheme });
      setThemeName(`${existingTheme.name} (Copy)`);
      setThemeMode(existingTheme.mode);
      setGradientStart(existingTheme.colors.background);
      setGradientEnd(existingTheme.colors.background);
      toast({
        title: "Theme Loaded",
        description: `Starting from ${existingTheme.name}`,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Paintbrush className="w-4 h-4" />
          Create Custom Theme
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-primary" />
            {isEditing ? "Edit Custom Theme" : "Custom Theme Builder"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? `Edit "${themeName}" theme` : "Create your own personalized color scheme from scratch"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          {/* Left: Controls */}
          <div className="space-y-4">
            {/* Theme Basics */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Theme Basics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Theme Name</Label>
                  <Input
                    value={themeName}
                    onChange={(e) => setThemeName(e.target.value)}
                    placeholder="My Custom Theme"
                    className="h-9"
                  />
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs">Mode</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={themeMode === "dark" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setThemeMode("dark")}
                        className="flex-1 gap-1.5"
                      >
                        <Moon className="w-3.5 h-3.5" />
                        Dark
                      </Button>
                      <Button
                        type="button"
                        variant={themeMode === "light" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setThemeMode("light")}
                        className="flex-1 gap-1.5"
                      >
                        <Sun className="w-3.5 h-3.5" />
                        Light
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Start from existing theme</Label>
                  <Select onValueChange={loadFromExisting}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select a base theme..." />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border border-border z-50">
                      {THEMES.map(theme => (
                        <SelectItem key={theme.id} value={theme.id}>
                          {theme.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Color Tabs */}
            <ScrollArea className="h-[340px] pr-3">
              <Tabs defaultValue="main" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-3">
                  <TabsTrigger value="main" className="text-xs">Main</TabsTrigger>
                  <TabsTrigger value="background" className="text-xs">Background</TabsTrigger>
                  <TabsTrigger value="ui" className="text-xs">UI</TabsTrigger>
                  <TabsTrigger value="status" className="text-xs">Status</TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="space-y-2 mt-0">
                  <ColorPicker
                    label="Primary"
                    value={customTheme.colors.primary}
                    onChange={(v) => updateColor("primary", v)}
                    description="Main accent color"
                  />
                  <ColorPicker
                    label="Secondary"
                    value={customTheme.colors.secondary}
                    onChange={(v) => updateColor("secondary", v)}
                    description="Secondary accent"
                  />
                  <ColorPicker
                    label="Foreground"
                    value={customTheme.colors.foreground}
                    onChange={(v) => updateColor("foreground", v)}
                    description="Main text color"
                  />
                  <ColorPicker
                    label="Accent"
                    value={customTheme.colors.accent}
                    onChange={(v) => updateColor("accent", v)}
                    description="Highlight color"
                  />
                </TabsContent>

                <TabsContent value="background" className="space-y-2 mt-0">
                  <div className="p-3 rounded-lg border border-border bg-muted/30 mb-2">
                    <p className="text-xs text-muted-foreground">
                      Customize your website's background appearance with solid colors or gradients
                    </p>
                  </div>
                  <ColorPicker
                    label="Background Base"
                    value={customTheme.colors.background}
                    onChange={(v) => updateColor("background", v)}
                    description="Main background color"
                  />
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Background Gradient</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">Create a gradient background (top to bottom)</p>
                    <div className="space-y-2">
                      <ColorPicker
                        label="Gradient Start"
                        value={gradientStart}
                        onChange={(v) => {
                          setGradientStart(v);
                          updateColor("background", v);
                          updateGradient("background", { start: v, end: gradientEnd });
                        }}
                        description="Top color"
                      />
                      <ColorPicker
                        label="Gradient End"
                        value={gradientEnd}
                        onChange={(v) => {
                          setGradientEnd(v);
                          updateGradient("background", { start: gradientStart, end: v });
                        }}
                        description="Bottom color"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="ui" className="space-y-2 mt-0">
                  <ColorPicker
                    label="Card"
                    value={customTheme.colors.card}
                    onChange={(v) => updateColor("card", v)}
                    description="Card backgrounds"
                  />
                  <ColorPicker
                    label="Card Text"
                    value={customTheme.colors.cardForeground}
                    onChange={(v) => updateColor("cardForeground", v)}
                    description="Text on cards"
                  />
                  <ColorPicker
                    label="Muted"
                    value={customTheme.colors.muted}
                    onChange={(v) => updateColor("muted", v)}
                    description="Muted backgrounds"
                  />
                  <ColorPicker
                    label="Muted Text"
                    value={customTheme.colors.mutedForeground}
                    onChange={(v) => updateColor("mutedForeground", v)}
                    description="Secondary text"
                  />
                  <ColorPicker
                    label="Border"
                    value={customTheme.colors.border}
                    onChange={(v) => updateColor("border", v)}
                    description="Border color"
                  />
                  <ColorPicker
                    label="Input"
                    value={customTheme.colors.input}
                    onChange={(v) => updateColor("input", v)}
                    description="Input backgrounds"
                  />
                  <ColorPicker
                    label="Ring"
                    value={customTheme.colors.ring}
                    onChange={(v) => updateColor("ring", v)}
                    description="Focus ring color"
                  />
                </TabsContent>

                <TabsContent value="status" className="space-y-2 mt-0">
                  <ColorPicker
                    label="Success"
                    value={customTheme.colors.success}
                    onChange={(v) => updateColor("success", v)}
                    description="Success indicators"
                  />
                  <ColorPicker
                    label="Success Text"
                    value={customTheme.colors.successForeground}
                    onChange={(v) => updateColor("successForeground", v)}
                    description="Text on success"
                  />
                  <ColorPicker
                    label="Destructive"
                    value={customTheme.colors.destructive}
                    onChange={(v) => updateColor("destructive", v)}
                    description="Error/danger color"
                  />
                  <ColorPicker
                    label="Destructive Text"
                    value={customTheme.colors.destructiveForeground}
                    onChange={(v) => updateColor("destructiveForeground", v)}
                    description="Text on destructive"
                  />
                </TabsContent>
              </Tabs>
            </ScrollArea>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="p-4 rounded-xl border-2"
                  style={{ 
                    background: `linear-gradient(180deg, hsl(${customTheme.colors.background}), hsl(${customTheme.colors.background}))`,
                    borderColor: `hsl(${customTheme.colors.border})`
                  }}
                >
                  {/* Header Preview */}
                  <div 
                    className="flex items-center justify-between p-3 rounded-lg mb-3"
                    style={{ backgroundColor: `hsl(${customTheme.colors.card})` }}
                  >
                    <span 
                      className="font-semibold text-sm"
                      style={{ color: `hsl(${customTheme.colors.cardForeground})` }}
                    >
                      {themeName}
                    </span>
                    <div 
                      className="px-2 py-1 rounded text-xs font-medium"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.primary})`,
                        color: `hsl(${customTheme.colors.primaryForeground})`
                      }}
                    >
                      Badge
                    </div>
                  </div>

                  {/* Buttons Preview */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.primary})`,
                        color: `hsl(${customTheme.colors.primaryForeground})`
                      }}
                    >
                      Primary
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.secondary})`,
                        color: `hsl(${customTheme.colors.secondaryForeground})`
                      }}
                    >
                      Secondary
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.accent})`,
                        color: `hsl(${customTheme.colors.accentForeground})`
                      }}
                    >
                      Accent
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.destructive})`,
                        color: `hsl(${customTheme.colors.destructiveForeground})`
                      }}
                    >
                      Danger
                    </div>
                    <div 
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                      style={{ 
                        backgroundColor: `hsl(${customTheme.colors.success})`,
                        color: `hsl(${customTheme.colors.successForeground})`
                      }}
                    >
                      Success
                    </div>
                  </div>

                  {/* Card Preview */}
                  <div 
                    className="p-3 rounded-lg mb-3"
                    style={{ 
                      backgroundColor: `hsl(${customTheme.colors.card})`,
                      borderColor: `hsl(${customTheme.colors.border})`
                    }}
                  >
                    <h4 
                      className="font-semibold text-sm mb-1"
                      style={{ color: `hsl(${customTheme.colors.cardForeground})` }}
                    >
                      Card Title
                    </h4>
                    <p 
                      className="text-xs"
                      style={{ color: `hsl(${customTheme.colors.mutedForeground})` }}
                    >
                      This is how muted text appears on cards.
                    </p>
                  </div>

                  {/* Input Preview */}
                  <div 
                    className="p-2 rounded-lg border text-xs"
                    style={{ 
                      backgroundColor: `hsl(${customTheme.colors.input})`,
                      borderColor: `hsl(${customTheme.colors.border})`,
                      color: `hsl(${customTheme.colors.foreground})`
                    }}
                  >
                    Input field preview...
                  </div>

                  {/* Muted Section */}
                  <div 
                    className="p-3 rounded-lg mt-3"
                    style={{ backgroundColor: `hsl(${customTheme.colors.muted})` }}
                  >
                    <p 
                      className="text-xs"
                      style={{ color: `hsl(${customTheme.colors.mutedForeground})` }}
                    >
                      Muted background section with subdued text styling.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreview}
                className="gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="flex-1 gap-1.5"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    {isEditing ? "Save Changes" : "Create Theme"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
