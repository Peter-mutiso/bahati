// Complete theme definitions for the website
export interface Theme {
  id: string;
  name: string;
  description: string;
  mode: "dark" | "light";
  preview: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
  };
  colors: {
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    success: string;
    successForeground: string;
    border: string;
    input: string;
    ring: string;
  };
  gradients: {
    primary: string;
    secondary: string;
    background: string;
  };
  shadows: {
    glow: string;
    card: string;
  };
  radius: string;
}

export const THEMES: Theme[] = [
  // ========== DARK NEON THEMES ==========
  {
    id: "neon-cyan",
    name: "Neon Cyan",
    description: "Cyberpunk dark theme with electric cyan neon accents",
    mode: "dark",
    preview: {
      primary: "187 100% 50%",
      secondary: "266 100% 65%",
      background: "220 25% 6%",
      card: "220 20% 10%",
    },
    colors: {
      background: "220 25% 6%",
      foreground: "210 40% 98%",
      card: "220 20% 10%",
      cardForeground: "210 40% 98%",
      popover: "220 20% 10%",
      popoverForeground: "210 40% 98%",
      primary: "187 100% 50%",
      primaryForeground: "220 25% 6%",
      secondary: "266 100% 65%",
      secondaryForeground: "210 40% 98%",
      muted: "220 15% 15%",
      mutedForeground: "215 15% 65%",
      accent: "187 100% 50%",
      accentForeground: "220 25% 6%",
      destructive: "0 85% 60%",
      destructiveForeground: "210 40% 98%",
      success: "142 76% 48%",
      successForeground: "220 25% 6%",
      border: "220 15% 18%",
      input: "220 15% 15%",
      ring: "187 100% 50%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(187 100% 50%), hsl(210 100% 60%))",
      secondary: "linear-gradient(135deg, hsl(266 100% 65%), hsl(280 100% 70%))",
      background: "linear-gradient(180deg, hsl(220 25% 6%), hsl(220 30% 4%))",
    },
    shadows: {
      glow: "0 0 40px hsl(187 100% 50% / 0.3)",
      card: "0 8px 32px hsl(0 0% 0% / 0.5)",
    },
    radius: "0.75rem",
  },
  {
    id: "neon-purple",
    name: "Neon Purple",
    description: "Dark theme with vibrant purple and magenta neon glows",
    mode: "dark",
    preview: {
      primary: "280 100% 60%",
      secondary: "320 100% 55%",
      background: "270 30% 6%",
      card: "270 25% 10%",
    },
    colors: {
      background: "270 30% 6%",
      foreground: "280 20% 98%",
      card: "270 25% 10%",
      cardForeground: "280 20% 98%",
      popover: "270 25% 10%",
      popoverForeground: "280 20% 98%",
      primary: "280 100% 60%",
      primaryForeground: "270 30% 6%",
      secondary: "320 100% 55%",
      secondaryForeground: "280 20% 98%",
      muted: "270 20% 14%",
      mutedForeground: "280 15% 60%",
      accent: "300 100% 55%",
      accentForeground: "270 30% 6%",
      destructive: "0 85% 60%",
      destructiveForeground: "280 20% 98%",
      success: "142 76% 48%",
      successForeground: "270 30% 6%",
      border: "270 20% 18%",
      input: "270 20% 14%",
      ring: "280 100% 60%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(280 100% 60%), hsl(320 100% 55%))",
      secondary: "linear-gradient(135deg, hsl(320 100% 55%), hsl(340 100% 60%))",
      background: "linear-gradient(180deg, hsl(270 30% 6%), hsl(270 35% 4%))",
    },
    shadows: {
      glow: "0 0 40px hsl(280 100% 60% / 0.3)",
      card: "0 8px 32px hsl(0 0% 0% / 0.5)",
    },
    radius: "0.75rem",
  },
  {
    id: "neon-gold",
    name: "Neon Gold",
    description: "Luxurious dark theme with golden amber neon highlights",
    mode: "dark",
    preview: {
      primary: "45 100% 50%",
      secondary: "25 100% 55%",
      background: "30 20% 5%",
      card: "30 15% 9%",
    },
    colors: {
      background: "30 20% 5%",
      foreground: "45 30% 95%",
      card: "30 15% 9%",
      cardForeground: "45 30% 95%",
      popover: "30 15% 9%",
      popoverForeground: "45 30% 95%",
      primary: "45 100% 50%",
      primaryForeground: "30 20% 5%",
      secondary: "25 100% 55%",
      secondaryForeground: "45 30% 95%",
      muted: "30 15% 13%",
      mutedForeground: "45 15% 55%",
      accent: "40 100% 55%",
      accentForeground: "30 20% 5%",
      destructive: "0 85% 60%",
      destructiveForeground: "45 30% 95%",
      success: "142 76% 48%",
      successForeground: "30 20% 5%",
      border: "30 15% 18%",
      input: "30 15% 13%",
      ring: "45 100% 50%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(45 100% 50%), hsl(35 100% 45%))",
      secondary: "linear-gradient(135deg, hsl(25 100% 55%), hsl(15 100% 50%))",
      background: "linear-gradient(180deg, hsl(30 20% 5%), hsl(30 25% 3%))",
    },
    shadows: {
      glow: "0 0 40px hsl(45 100% 50% / 0.25)",
      card: "0 8px 32px hsl(0 0% 0% / 0.6)",
    },
    radius: "0.5rem",
  },

  // ========== DARK THEMES (Additional) ==========
  {
    id: "neon-green",
    name: "Neon Green",
    description: "Matrix-inspired dark theme with electric green neon",
    mode: "dark",
    preview: {
      primary: "142 100% 50%",
      secondary: "160 100% 45%",
      background: "160 30% 5%",
      card: "160 25% 8%",
    },
    colors: {
      background: "160 30% 5%",
      foreground: "150 30% 95%",
      card: "160 25% 8%",
      cardForeground: "150 30% 95%",
      popover: "160 25% 8%",
      popoverForeground: "150 30% 95%",
      primary: "142 100% 50%",
      primaryForeground: "160 30% 5%",
      secondary: "160 100% 45%",
      secondaryForeground: "150 30% 95%",
      muted: "160 20% 12%",
      mutedForeground: "150 15% 55%",
      accent: "142 100% 50%",
      accentForeground: "160 30% 5%",
      destructive: "0 85% 60%",
      destructiveForeground: "150 30% 95%",
      success: "142 76% 48%",
      successForeground: "160 30% 5%",
      border: "160 20% 16%",
      input: "160 20% 12%",
      ring: "142 100% 50%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(142 100% 50%), hsl(160 100% 45%))",
      secondary: "linear-gradient(135deg, hsl(160 100% 45%), hsl(180 90% 40%))",
      background: "linear-gradient(180deg, hsl(160 30% 5%), hsl(160 35% 3%))",
    },
    shadows: {
      glow: "0 0 40px hsl(142 100% 50% / 0.3)",
      card: "0 8px 32px hsl(0 0% 0% / 0.5)",
    },
    radius: "0.5rem",
  },
  {
    id: "neon-pink",
    name: "Neon Pink",
    description: "Bold dark theme with hot pink and magenta neon",
    mode: "dark",
    preview: {
      primary: "330 100% 60%",
      secondary: "350 100% 65%",
      background: "330 30% 6%",
      card: "330 25% 10%",
    },
    colors: {
      background: "330 30% 6%",
      foreground: "330 20% 98%",
      card: "330 25% 10%",
      cardForeground: "330 20% 98%",
      popover: "330 25% 10%",
      popoverForeground: "330 20% 98%",
      primary: "330 100% 60%",
      primaryForeground: "330 30% 6%",
      secondary: "350 100% 65%",
      secondaryForeground: "330 20% 98%",
      muted: "330 20% 14%",
      mutedForeground: "330 15% 60%",
      accent: "340 100% 55%",
      accentForeground: "330 30% 6%",
      destructive: "0 85% 60%",
      destructiveForeground: "330 20% 98%",
      success: "142 76% 48%",
      successForeground: "330 30% 6%",
      border: "330 20% 18%",
      input: "330 20% 14%",
      ring: "330 100% 60%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(330 100% 60%), hsl(350 100% 65%))",
      secondary: "linear-gradient(135deg, hsl(350 100% 65%), hsl(10 100% 60%))",
      background: "linear-gradient(180deg, hsl(330 30% 6%), hsl(330 35% 4%))",
    },
    shadows: {
      glow: "0 0 40px hsl(330 100% 60% / 0.3)",
      card: "0 8px 32px hsl(0 0% 0% / 0.5)",
    },
    radius: "0.75rem",
  },
  {
    id: "neon-blue",
    name: "Neon Blue",
    description: "Deep ocean dark theme with electric blue neon",
    mode: "dark",
    preview: {
      primary: "210 100% 55%",
      secondary: "230 100% 60%",
      background: "220 35% 5%",
      card: "220 30% 9%",
    },
    colors: {
      background: "220 35% 5%",
      foreground: "210 30% 98%",
      card: "220 30% 9%",
      cardForeground: "210 30% 98%",
      popover: "220 30% 9%",
      popoverForeground: "210 30% 98%",
      primary: "210 100% 55%",
      primaryForeground: "220 35% 5%",
      secondary: "230 100% 60%",
      secondaryForeground: "210 30% 98%",
      muted: "220 25% 13%",
      mutedForeground: "210 15% 60%",
      accent: "200 100% 50%",
      accentForeground: "220 35% 5%",
      destructive: "0 85% 60%",
      destructiveForeground: "210 30% 98%",
      success: "142 76% 48%",
      successForeground: "220 35% 5%",
      border: "220 25% 17%",
      input: "220 25% 13%",
      ring: "210 100% 55%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(210 100% 55%), hsl(230 100% 60%))",
      secondary: "linear-gradient(135deg, hsl(230 100% 60%), hsl(250 90% 55%))",
      background: "linear-gradient(180deg, hsl(220 35% 5%), hsl(220 40% 3%))",
    },
    shadows: {
      glow: "0 0 40px hsl(210 100% 55% / 0.3)",
      card: "0 8px 32px hsl(0 0% 0% / 0.5)",
    },
    radius: "0.625rem",
  },

  // ========== LIGHT THEMES ==========
  {
    id: "light-clean",
    name: "Clean White",
    description: "Crisp light theme with blue accents for a professional look",
    mode: "light",
    preview: {
      primary: "220 90% 50%",
      secondary: "200 90% 45%",
      background: "220 20% 96%",
      card: "220 15% 99%",
    },
    colors: {
      background: "220 20% 96%",
      foreground: "220 30% 15%",
      card: "220 15% 99%",
      cardForeground: "220 30% 15%",
      popover: "220 15% 99%",
      popoverForeground: "220 30% 15%",
      primary: "220 90% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "200 90% 45%",
      secondaryForeground: "0 0% 100%",
      muted: "220 15% 90%",
      mutedForeground: "220 15% 35%",
      accent: "220 90% 50%",
      accentForeground: "0 0% 100%",
      destructive: "0 85% 50%",
      destructiveForeground: "0 0% 100%",
      success: "142 76% 35%",
      successForeground: "0 0% 100%",
      border: "220 20% 85%",
      input: "220 15% 90%",
      ring: "220 90% 50%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(220 90% 50%), hsl(200 90% 45%))",
      secondary: "linear-gradient(135deg, hsl(200 90% 45%), hsl(180 85% 40%))",
      background: "linear-gradient(180deg, hsl(220 20% 96%), hsl(220 25% 92%))",
    },
    shadows: {
      glow: "0 0 30px hsl(220 90% 50% / 0.15)",
      card: "0 4px 20px hsl(220 30% 15% / 0.08)",
    },
    radius: "0.75rem",
  },
  {
    id: "light-mint",
    name: "Fresh Mint",
    description: "Refreshing light theme with teal and green accents",
    mode: "light",
    preview: {
      primary: "160 85% 35%",
      secondary: "180 80% 40%",
      background: "150 25% 94%",
      card: "150 20% 98%",
    },
    colors: {
      background: "150 25% 94%",
      foreground: "160 35% 12%",
      card: "150 20% 98%",
      cardForeground: "160 35% 12%",
      popover: "150 20% 98%",
      popoverForeground: "160 35% 12%",
      primary: "160 85% 35%",
      primaryForeground: "0 0% 100%",
      secondary: "180 80% 40%",
      secondaryForeground: "0 0% 100%",
      muted: "150 20% 88%",
      mutedForeground: "160 20% 35%",
      accent: "160 85% 35%",
      accentForeground: "0 0% 100%",
      destructive: "0 85% 50%",
      destructiveForeground: "0 0% 100%",
      success: "142 76% 35%",
      successForeground: "0 0% 100%",
      border: "150 25% 82%",
      input: "150 20% 88%",
      ring: "160 85% 35%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(160 85% 35%), hsl(180 80% 40%))",
      secondary: "linear-gradient(135deg, hsl(180 80% 40%), hsl(200 75% 45%))",
      background: "linear-gradient(180deg, hsl(150 25% 94%), hsl(150 30% 90%))",
    },
    shadows: {
      glow: "0 0 30px hsl(160 85% 35% / 0.15)",
      card: "0 4px 20px hsl(160 35% 12% / 0.06)",
    },
    radius: "1rem",
  },
  {
    id: "light-warm",
    name: "Warm Sunset",
    description: "Cozy light theme with warm orange and coral tones",
    mode: "light",
    preview: {
      primary: "25 95% 50%",
      secondary: "350 90% 55%",
      background: "35 35% 93%",
      card: "30 30% 97%",
    },
    colors: {
      background: "35 35% 93%",
      foreground: "25 35% 15%",
      card: "30 30% 97%",
      cardForeground: "25 35% 15%",
      popover: "30 30% 97%",
      popoverForeground: "25 35% 15%",
      primary: "25 95% 50%",
      primaryForeground: "0 0% 100%",
      secondary: "350 90% 55%",
      secondaryForeground: "0 0% 100%",
      muted: "30 30% 88%",
      mutedForeground: "25 25% 35%",
      accent: "25 95% 50%",
      accentForeground: "0 0% 100%",
      destructive: "0 85% 50%",
      destructiveForeground: "0 0% 100%",
      success: "142 76% 35%",
      successForeground: "0 0% 100%",
      border: "30 30% 82%",
      input: "30 30% 88%",
      ring: "25 95% 50%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(25 95% 50%), hsl(350 90% 55%))",
      secondary: "linear-gradient(135deg, hsl(350 90% 55%), hsl(330 85% 50%))",
      background: "linear-gradient(180deg, hsl(35 35% 93%), hsl(30 40% 88%))",
    },
    shadows: {
      glow: "0 0 30px hsl(25 95% 50% / 0.15)",
      card: "0 4px 20px hsl(25 35% 15% / 0.06)",
    },
    radius: "0.875rem",
  },
  {
    id: "light-lavender",
    name: "Soft Lavender",
    description: "Gentle light theme with purple and violet accents",
    mode: "light",
    preview: {
      primary: "270 80% 55%",
      secondary: "290 75% 50%",
      background: "270 25% 95%",
      card: "270 20% 98%",
    },
    colors: {
      background: "270 25% 95%",
      foreground: "270 35% 15%",
      card: "270 20% 98%",
      cardForeground: "270 35% 15%",
      popover: "270 20% 98%",
      popoverForeground: "270 35% 15%",
      primary: "270 80% 55%",
      primaryForeground: "0 0% 100%",
      secondary: "290 75% 50%",
      secondaryForeground: "0 0% 100%",
      muted: "270 20% 88%",
      mutedForeground: "270 20% 35%",
      accent: "270 80% 55%",
      accentForeground: "0 0% 100%",
      destructive: "0 85% 50%",
      destructiveForeground: "0 0% 100%",
      success: "142 76% 35%",
      successForeground: "0 0% 100%",
      border: "270 25% 82%",
      input: "270 20% 88%",
      ring: "270 80% 55%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(270 80% 55%), hsl(290 75% 50%))",
      secondary: "linear-gradient(135deg, hsl(290 75% 50%), hsl(310 70% 55%))",
      background: "linear-gradient(180deg, hsl(270 25% 95%), hsl(270 30% 91%))",
    },
    shadows: {
      glow: "0 0 30px hsl(270 80% 55% / 0.15)",
      card: "0 4px 20px hsl(270 35% 15% / 0.06)",
    },
    radius: "1rem",
  },
  {
    id: "light-rose",
    name: "Rose Garden",
    description: "Elegant light theme with rose and pink accents",
    mode: "light",
    preview: {
      primary: "350 85% 55%",
      secondary: "330 80% 50%",
      background: "350 25% 95%",
      card: "350 20% 98%",
    },
    colors: {
      background: "350 25% 95%",
      foreground: "350 35% 15%",
      card: "350 20% 98%",
      cardForeground: "350 35% 15%",
      popover: "350 20% 98%",
      popoverForeground: "350 35% 15%",
      primary: "350 85% 55%",
      primaryForeground: "0 0% 100%",
      secondary: "330 80% 50%",
      secondaryForeground: "0 0% 100%",
      muted: "350 20% 88%",
      mutedForeground: "350 20% 35%",
      accent: "350 85% 55%",
      accentForeground: "0 0% 100%",
      destructive: "0 85% 50%",
      destructiveForeground: "0 0% 100%",
      success: "142 76% 35%",
      successForeground: "0 0% 100%",
      border: "350 25% 82%",
      input: "350 20% 88%",
      ring: "350 85% 55%",
    },
    gradients: {
      primary: "linear-gradient(135deg, hsl(350 85% 55%), hsl(330 80% 50%))",
      secondary: "linear-gradient(135deg, hsl(330 80% 50%), hsl(310 75% 55%))",
      background: "linear-gradient(180deg, hsl(350 25% 95%), hsl(350 30% 91%))",
    },
    shadows: {
      glow: "0 0 30px hsl(350 85% 55% / 0.15)",
      card: "0 4px 20px hsl(350 35% 15% / 0.06)",
    },
    radius: "0.875rem",
  },
];

export const getThemeById = async (id: string): Promise<Theme> => {
  // Check predefined themes first
  const predefinedTheme = THEMES.find((theme) => theme.id === id);
  if (predefinedTheme) return predefinedTheme;
  
  // Check custom themes from database
  try {
    const { createClient } = await import("@supabase/supabase-js");
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );
    
    const { data, error } = await supabase
      .from("custom_themes")
      .select("*")
      .eq("id", id)
      .single();
    
    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        mode: data.mode as "dark" | "light",
        preview: data.preview as any,
        colors: data.colors as any,
        gradients: data.gradients as any,
        shadows: data.shadows as any,
        radius: data.radius,
      };
    }
  } catch (error) {
    console.error("Error loading custom theme:", error);
  }
  
  // Fallback to first theme
  return THEMES[0];
};

export const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  
  // Apply dark/light mode class
  if (theme.mode === "light") {
    root.classList.remove("dark");
    root.classList.add("light");
  } else {
    root.classList.remove("light");
    root.classList.add("dark");
  }
  
  // Apply all color variables
  root.style.setProperty("--background", theme.colors.background);
  root.style.setProperty("--foreground", theme.colors.foreground);
  root.style.setProperty("--card", theme.colors.card);
  root.style.setProperty("--card-foreground", theme.colors.cardForeground);
  root.style.setProperty("--popover", theme.colors.popover);
  root.style.setProperty("--popover-foreground", theme.colors.popoverForeground);
  root.style.setProperty("--primary", theme.colors.primary);
  root.style.setProperty("--primary-foreground", theme.colors.primaryForeground);
  root.style.setProperty("--secondary", theme.colors.secondary);
  root.style.setProperty("--secondary-foreground", theme.colors.secondaryForeground);
  root.style.setProperty("--muted", theme.colors.muted);
  root.style.setProperty("--muted-foreground", theme.colors.mutedForeground);
  root.style.setProperty("--accent", theme.colors.accent);
  root.style.setProperty("--accent-foreground", theme.colors.accentForeground);
  root.style.setProperty("--destructive", theme.colors.destructive);
  root.style.setProperty("--destructive-foreground", theme.colors.destructiveForeground);
  root.style.setProperty("--success", theme.colors.success);
  root.style.setProperty("--success-foreground", theme.colors.successForeground);
  root.style.setProperty("--border", theme.colors.border);
  root.style.setProperty("--input", theme.colors.input);
  root.style.setProperty("--ring", theme.colors.ring);
  
  // Apply gradients
  root.style.setProperty("--gradient-primary", theme.gradients.primary);
  root.style.setProperty("--gradient-secondary", theme.gradients.secondary);
  root.style.setProperty("--gradient-dark", theme.gradients.background);
  
  // Apply shadows
  root.style.setProperty("--shadow-glow", theme.shadows.glow);
  root.style.setProperty("--shadow-card", theme.shadows.card);
  
  // Apply border radius
  root.style.setProperty("--radius", theme.radius);
  
  // Update body background
  document.body.style.background = theme.gradients.background;
};
