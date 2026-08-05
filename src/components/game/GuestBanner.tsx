import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, ArrowRight } from "lucide-react";

interface GuestBannerProps {
  onSignUp: () => void;
}

export const GuestBanner = ({ onSignUp }: GuestBannerProps) => {
  return (
    <Card className="bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 border-primary/30 p-2.5 sm:p-3 md:p-4 animate-fade-in shadow-soft-lg">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 md:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 text-center sm:text-left w-full sm:w-auto">
          <div className="p-1.5 sm:p-2 md:p-2.5 bg-primary/20 rounded-full flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-primary animate-pulse" />
          </div>
          <div className="flex-1 sm:flex-none">
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Sign up to play and win real rewards!</p>
          </div>
        </div>
        <Button 
          onClick={onSignUp}
          size="sm"
          className="w-full sm:w-auto text-xs sm:text-sm bg-primary hover:bg-primary/90 shadow-md hover-scale whitespace-nowrap"
        >
          Get Started
          <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
        </Button>
      </div>
    </Card>
  );
};
