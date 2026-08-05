import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Rocket, TrendingUp, Users, Trophy, Zap, Star, Crown, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface GuestOverlayProps {
  onSignUp: () => void;
}

const FloatingMultiplier = ({ value, delay, position }: { value: string; delay: number; position: string }) => {
  return (
    <div 
      className={cn(
        "absolute animate-pulse",
        position
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      <Card className="bg-gradient-to-br from-primary via-primary/90 to-secondary border-2 border-primary/50 shadow-2xl px-3 py-2 sm:px-4 sm:py-3 md:px-6 md:py-4 hover-scale">
        <div className="flex items-center gap-1 sm:gap-2">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-warning animate-pulse" />
          <span className="text-lg sm:text-2xl md:text-4xl font-black text-primary-foreground">{value}</span>
        </div>
      </Card>
    </div>
  );
};

const LiveStats = () => {
  const [players, setPlayers] = useState(1247);
  const [wins, setWins] = useState(89);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayers(prev => prev + Math.floor(Math.random() * 5 - 2));
      setWins(prev => Math.floor(Math.random() * 20) + 80);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
      <Card className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-primary/10 border-primary/30 animate-fade-in">
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
          <span className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground">{players.toLocaleString()}</span>
          <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">playing</span>
        </div>
      </Card>
      <Card className="px-2 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 bg-success/10 border-success/30 animate-fade-in">
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
          <Trophy className="w-3 h-3 sm:w-4 sm:h-4 text-success" />
          <span className="text-[10px] sm:text-xs md:text-sm font-bold text-foreground">{wins}</span>
          <span className="text-[9px] sm:text-[10px] md:text-xs text-muted-foreground">wins/min</span>
        </div>
      </Card>
    </div>
  );
};

export const GuestOverlay = ({ onSignUp }: GuestOverlayProps) => {
  return (
    <div className="relative">
      {/* Backdrop blur effect */}
      <div className="absolute inset-0 backdrop-blur-sm bg-background/60 rounded-lg z-10" />
      
      {/* Floating Multiplier Cards */}
      <FloatingMultiplier value="300x" delay={0} position="top-4 left-4 sm:top-8 sm:left-8 md:top-12 md:left-12" />
      <FloatingMultiplier value="500x" delay={0.5} position="top-4 right-4 sm:top-8 sm:right-8 md:top-12 md:right-12" />
      <FloatingMultiplier value="100x" delay={1} position="bottom-24 left-1/2 -translate-x-1/2 sm:bottom-32 md:bottom-40" />
      
      {/* Content overlay */}
      <Card className="absolute inset-0 z-20 flex flex-col items-center justify-center p-3 sm:p-4 md:p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-background/95 to-secondary/10 border-primary/20 overflow-hidden">
        <div className="max-w-2xl w-full text-center space-y-2 sm:space-y-3 md:space-y-4 animate-fade-in">
          {/* Live Stats */}
          <LiveStats />

          {/* Big Win Showcase */}
          <div className="relative mb-2 sm:mb-3 md:mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/20 to-transparent blur-xl" />
            <Card className="relative bg-gradient-to-r from-warning/20 via-warning/10 to-warning/20 border-warning/50 p-2 sm:p-3 md:p-4">
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2">
                <div className="flex items-center gap-1 sm:gap-1.5 md:gap-2">
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-warning" />
                  <span className="text-xs sm:text-sm md:text-base text-muted-foreground">Last Big Win</span>
                  <Crown className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-warning" />
                </div>
                <div className="flex items-baseline gap-1 sm:gap-2">
                  <span className="text-2xl sm:text-3xl md:text-5xl font-black bg-gradient-to-r from-warning via-warning/80 to-warning bg-clip-text text-transparent">
                    423.5x
                  </span>
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-warning animate-pulse" />
                </div>
                <span className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">Player won $8,470 just now!</span>
              </div>
            </Card>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:gap-3 mb-2 sm:mb-3 md:mb-4">
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 p-1.5 sm:p-2 md:p-3 rounded-lg bg-primary/10 border border-primary/20 hover-scale">
              <Rocket className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-primary" />
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">Instant Play</span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 p-1.5 sm:p-2 md:p-3 rounded-lg bg-success/10 border border-success/20 hover-scale">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-success" />
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">Fair Play</span>
            </div>
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2 p-1.5 sm:p-2 md:p-3 rounded-lg bg-warning/10 border border-warning/20 hover-scale">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-warning" />
              <span className="text-[9px] sm:text-[10px] md:text-xs font-medium">Big Wins</span>
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-2 sm:space-y-2.5 md:space-y-3">
            <h3 className="text-base sm:text-lg md:text-2xl font-bold text-foreground">
              Join the Action Now!
            </h3>
            <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground max-w-md mx-auto">
              Start playing in seconds. Watch the rocket fly and cash out before it crashes!
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4 pt-1 sm:pt-2">
              <Button
                size="sm"
                onClick={onSignUp}
                className="w-full sm:w-auto text-xs sm:text-sm md:text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 hover-scale"
              >
                <Rocket className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Sign Up Free
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onSignUp}
                className="w-full sm:w-auto text-xs sm:text-sm md:text-base border-primary/50 hover:bg-primary/10"
              >
                Log In
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
