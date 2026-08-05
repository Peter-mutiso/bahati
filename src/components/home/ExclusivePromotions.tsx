import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Gift, Sparkles, Zap, Trophy, Gift as GiftIcon, Flame, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";

interface Promotion {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  button_text: string;
  button_link: string | null;
  icon_type: string;
  badge_text: string;
  badge_color: string;
  gradient_from: string;
  gradient_to: string;
  is_active: boolean;
  sort_order: number;
}

interface ExclusivePromotionsProps {
  user: User | null;
  onAuthRequired: () => void;
  onSpinWheel: () => void;
}

const iconMap: Record<string, any> = {
  sparkles: Sparkles,
  zap: Zap,
  trophy: Trophy,
  gift: GiftIcon,
  flame: Flame,
  star: Star,
};

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  primary: {
    bg: "from-primary/20 via-primary/10 to-transparent",
    border: "border-primary/30 hover:border-primary/50",
    text: "text-primary",
    badge: "bg-primary text-primary-foreground",
  },
  accent: {
    bg: "from-accent/20 via-accent/10 to-transparent",
    border: "border-accent/30 hover:border-accent/50",
    text: "text-accent",
    badge: "bg-accent text-accent-foreground",
  },
  success: {
    bg: "from-success/20 via-success/10 to-transparent",
    border: "border-success/30 hover:border-success/50",
    text: "text-success",
    badge: "bg-success text-success-foreground",
  },
  destructive: {
    bg: "from-destructive/20 via-destructive/10 to-transparent",
    border: "border-destructive/30 hover:border-destructive/50",
    text: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
};

export const ExclusivePromotions = ({ user, onAuthRequired, onSpinWheel }: ExclusivePromotionsProps) => {
  const navigate = useNavigate();
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  useEffect(() => {
    const fetchPromotions = async () => {
      const { data } = await supabase
        .from("exclusive_promotions")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (data) {
        setPromotions(data);
      }
    };

    fetchPromotions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('promotions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exclusive_promotions'
        },
        () => {
          fetchPromotions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleButtonClick = (promotion: Promotion) => {
    if (promotion.button_link) {
      navigate(promotion.button_link);
    } else if (promotion.icon_type === 'zap') {
      if (user) {
        onSpinWheel();
      } else {
        onAuthRequired();
      }
    } else if (!user) {
      onAuthRequired();
    }
  };

  if (promotions.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-2 md:px-4 py-3 md:py-8">
      <div className="flex items-center gap-1.5 md:gap-2 mb-3 md:mb-6">
        <Gift className="w-4 h-4 md:w-7 md:h-7 text-primary" />
        <h2 className="text-base md:text-3xl font-bold text-foreground">Exclusive Promotions</h2>
      </div>

      <div className="grid grid-cols-3 gap-1.5 md:gap-3">
        {promotions.map((promotion) => {
          const Icon = iconMap[promotion.icon_type] || Sparkles;
          const colors = colorMap[promotion.badge_color] || colorMap.primary;

          return (
            <Card
              key={promotion.id}
              className={`group relative overflow-hidden bg-gradient-to-br ${colors.bg} ${colors.border} transition-all duration-300 hover:shadow-xl hover:shadow-${promotion.badge_color}/20`}
            >
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
              <div className="relative p-1.5 md:p-3">
                <div className="flex items-start justify-between mb-1 md:mb-2">
                  <div className={`bg-${promotion.badge_color}/20 rounded-full p-1 md:p-2`}>
                    <Icon className={`w-2.5 h-2.5 md:w-4 md:h-4 ${colors.text}`} />
                  </div>
                  <Badge className={`${colors.badge} text-[8px] md:text-[10px] font-bold animate-pulse px-1 py-0 md:px-2 md:py-0.5`}>
                    {promotion.badge_text}
                  </Badge>
                </div>
                <h3 className="text-[10px] md:text-base font-bold text-foreground mb-0.5 md:mb-1 line-clamp-1">
                  {promotion.title}
                </h3>
                <p className={`text-xs md:text-xl font-black ${colors.text} mb-0.5 md:mb-1.5 line-clamp-1`}>
                  {promotion.subtitle}
                </p>
                <p className="text-[8px] md:text-xs text-muted-foreground mb-1 md:mb-2 line-clamp-1 md:line-clamp-2">
                  {promotion.description}
                </p>
                <Button
                  size="sm"
                  onClick={() => handleButtonClick(promotion)}
                  className={`w-full ${
                    promotion.badge_color === 'accent'
                      ? 'border-accent text-accent hover:bg-accent hover:text-accent-foreground'
                      : `bg-${promotion.badge_color} hover:bg-${promotion.badge_color}/90 text-${promotion.badge_color}-foreground`
                  } font-semibold group-hover:scale-105 transition-transform h-6 md:h-8 text-[9px] md:text-xs px-1 md:px-4`}
                  variant={promotion.badge_color === 'accent' ? 'outline' : 'default'}
                >
                  {promotion.button_text}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
