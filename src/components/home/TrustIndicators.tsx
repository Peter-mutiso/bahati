import { Card } from "@/components/ui/card";
import { Shield, Star, Users, Clock } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { useCountAnimation } from "@/hooks/useCountAnimation";

const indicators = [
  {
    value: "50K+",
    numericValue: 50,
    suffix: "K+",
    label: "Active Players",
    icon: Users,
    color: "text-blue-500",
    animate: true
  },
  {
    value: "4.9/5",
    numericValue: 49,
    suffix: "/5",
    decimals: 1,
    label: "User Rating",
    icon: Star,
    color: "text-yellow-500",
    animate: true
  },
  {
    value: "24/7",
    label: "Support Available",
    icon: Clock,
    color: "text-green-500",
    animate: false
  },
  {
    value: "100%",
    numericValue: 100,
    suffix: "%",
    label: "Secure & Safe",
    icon: Shield,
    color: "text-purple-500",
    animate: true
  }
];

const AnimatedIndicator = ({ 
  indicator, 
  index, 
  isVisible 
}: { 
  indicator: typeof indicators[0]; 
  index: number; 
  isVisible: boolean;
}) => {
  const Icon = indicator.icon;
  const count = useCountAnimation({
    end: indicator.numericValue || 0,
    duration: 2000,
    isVisible: isVisible && indicator.animate
  });

  const displayValue = indicator.animate
    ? indicator.decimals
      ? `${(count / 10).toFixed(indicator.decimals)}${indicator.suffix}`
      : `${count}${indicator.suffix}`
    : indicator.value;

  return (
    <div
      className="text-center animate-fade-in group"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-2 md:p-3 border border-border/30 group-hover:border-primary/40 transition-all group-hover:scale-105">
        <Icon className={`w-6 h-6 md:w-8 md:h-8 ${indicator.color} mx-auto mb-1.5 md:mb-2`} />
        <p className="text-lg md:text-2xl font-black text-foreground mb-0.5">
          {displayValue}
        </p>
        <p className="text-[9px] md:text-[10px] text-muted-foreground/70 font-medium leading-tight">
          {indicator.label}
        </p>
      </div>
    </div>
  );
};

export const TrustIndicators = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-3 md:py-4 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 backdrop-blur-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-20" />
        
        <div className="relative p-4 md:p-5">
          <div className="text-center mb-3 md:mb-4">
            <h3 className="text-base md:text-lg font-bold text-foreground mb-1">
              Trusted by Players Worldwide
            </h3>
            <p className="text-xs md:text-sm text-muted-foreground/80">
              Join a safe and secure gaming community
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3 md:gap-4">
            {indicators.map((indicator, index) => (
              <AnimatedIndicator
                key={index}
                indicator={indicator}
                index={index}
                isVisible={isVisible}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
