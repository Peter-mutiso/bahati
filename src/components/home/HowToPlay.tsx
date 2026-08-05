import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Wallet, Gamepad2, Trophy } from "lucide-react";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";

const steps = [
  {
    number: 1,
    icon: UserPlus,
    title: "Create Account",
    description: "Sign up in seconds with email or social login",
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    number: 2,
    icon: Wallet,
    title: "Deposit Funds",
    description: "Add funds securely via UPI, USDT or other methods",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10"
  },
  {
    number: 3,
    icon: Gamepad2,
    title: "Choose Game",
    description: "Pick from 6+ exciting multiplayer casino games",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10"
  },
  {
    number: 4,
    icon: Trophy,
    title: "Win Big",
    description: "Cash out anytime and withdraw your winnings instantly",
    color: "text-green-500",
    bgColor: "bg-green-500/10"
  }
];

export const HowToPlay = () => {
  const { ref, isVisible } = useScrollAnimation();

  return (
    <div 
      ref={ref}
      className={`max-w-7xl mx-auto px-4 py-3 md:py-4 transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
    >
      <div className="text-center mb-3 md:mb-4">
        <Badge className="bg-primary/20 text-primary border-primary/30 mb-2 text-[10px] md:text-xs py-0.5">
          GETTING STARTED
        </Badge>
        <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
          Start Playing in 4 Easy Steps
        </h2>
        <p className="text-xs md:text-sm text-muted-foreground/80">
          Join thousands of players and start winning
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 relative">
        {/* Connection Line (Desktop) */}
        <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className="relative overflow-hidden rounded-2xl bg-card/30 backdrop-blur-xl border border-border/30 hover:border-primary/40 transition-all duration-300 hover:scale-[1.02] animate-fade-in group"
              style={{ animationDelay: `${index * 75}ms` }}
            >
              <div className="p-3 md:p-4 text-center relative z-10">
                {/* Step Number Badge */}
                <div className="absolute top-2 right-2 md:top-3 md:right-3">
                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-primary/30">
                    <span className="text-[10px] md:text-xs font-black text-primary">{step.number}</span>
                  </div>
                </div>

                {/* Icon */}
                <div className={`${step.bgColor} rounded-xl p-2 md:p-2.5 w-fit mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-5 h-5 md:w-6 md:h-6 ${step.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-xs md:text-sm font-bold text-foreground mb-1">
                  {step.title}
                </h3>
                <p className="text-[10px] md:text-xs text-muted-foreground/70 leading-tight line-clamp-2">
                  {step.description}
                </p>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          );
        })}
      </div>
    </div>
  );
};
