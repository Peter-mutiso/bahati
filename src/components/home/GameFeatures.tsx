import { Card } from "@/components/ui/card";
import { Shield, Zap, Trophy, Users, TrendingUp, Sparkles } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const features = [
  {
    icon: Shield,
    title: "Provably Fair",
    description: "100% transparent and verifiable game outcomes",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    icon: Zap,
    title: "Instant Payouts",
    description: "Lightning-fast withdrawals to your wallet",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10"
  },
  {
    icon: Trophy,
    title: "High RTP",
    description: "Up to 99% return to player on games",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  },
  {
    icon: Users,
    title: "Multiplayer",
    description: "Compete with thousands of players live",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    icon: TrendingUp,
    title: "Real-Time Sync",
    description: "Synchronized gameplay across all devices",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10"
  },
  {
    icon: Sparkles,
    title: "Premium Graphics",
    description: "Stunning 3D animations and effects",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10"
  }
];

export const GameFeatures = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-3 md:py-4 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="text-center mb-4">
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
          Why Players Love Our Games
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground/80">
          Premium features that set us apart
        </p>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-card/30 backdrop-blur-xl border border-border/30 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="p-2.5 md:p-3 text-center">
                <div className={`${feature.bgColor} rounded-xl p-2 md:p-2.5 w-fit mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-4 h-4 md:w-5 md:h-5 ${feature.color}`} />
                </div>
                <h3 className="text-[11px] md:text-xs font-bold text-foreground mb-0.5">
                  {feature.title}
                </h3>
                <p className="text-[9px] md:text-[10px] text-muted-foreground/70 leading-tight line-clamp-2">
                  {feature.description}
                </p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
