import { Shield, ArrowLeft, Plus, Menu, Volume2, VolumeX, BookOpen, HelpCircle, TrendingUp, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCurrency } from "@/hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { useCycleRaceSound } from "@/hooks/useCycleRaceSound";

interface CycleRaceHeaderProps {
  balance: number;
  onOpenProvablyFair: () => void;
  onOpenCustomizeCyclists: () => void;
}

const CycleRaceHeader = ({ balance, onOpenProvablyFair, onOpenCustomizeCyclists }: CycleRaceHeaderProps) => {
  const { symbol } = useCurrency();
  const navigate = useNavigate();
  const { isSoundEnabled, toggleSound } = useCycleRaceSound();
  const [showRules, setShowRules] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex items-center justify-between h-12 sm:h-14">
            {/* Left - Menu & Back Arrow & Title */}
            <div className="flex items-center gap-1 sm:gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 sm:h-9 sm:w-9"
                  >
                    <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[320px]">
                  <SheetHeader>
                    <SheetTitle className="text-left">Settings</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    {/* Sound Toggle */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3">
                        {isSoundEnabled ? (
                          <Volume2 className="w-5 h-5 text-primary" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium text-sm">Sound Effects</p>
                          <p className="text-xs text-muted-foreground">
                            {isSoundEnabled ? "Enabled" : "Disabled"}
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={isSoundEnabled}
                        onCheckedChange={toggleSound}
                      />
                    </div>

                    {/* Game Info Links */}
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12"
                        onClick={() => setShowRules(true)}
                      >
                        <BookOpen className="w-5 h-5" />
                        Game Rules
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12"
                        onClick={() => setShowHowToPlay(true)}
                      >
                        <HelpCircle className="w-5 h-5" />
                        How to Play
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12"
                        onClick={() => navigate("/cycling-race-predictions")}
                      >
                        <TrendingUp className="w-5 h-5" />
                        Predictions
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 h-12"
                        onClick={onOpenCustomizeCyclists}
                      >
                        <User className="w-5 h-5" />
                        Customize Cyclists
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 sm:h-9 sm:w-9"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </Button>
              <h1 className="text-sm sm:text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Cycle Race
              </h1>
            </div>

            {/* Center - Balance with Deposit */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-background/50 px-2 sm:px-4 py-1 sm:py-2 rounded-xl sm:rounded-2xl border border-border/50">
                <div className="text-center">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Balance</p>
                  <p className="text-xs sm:text-sm font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    {symbol}{balance.toFixed(2)}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                className="rounded-full h-7 w-7 sm:h-8 sm:w-8 bg-primary hover:bg-primary/90"
                onClick={() => navigate('/wallet')}
              >
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            </div>

            {/* Right - Provably Fair */}
            <Button
              size="sm"
              variant="outline"
              className="rounded-full h-8 sm:h-9 px-2 sm:px-3"
              onClick={onOpenProvablyFair}
            >
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline ml-1 text-xs">Fair</span>
              <Badge variant="default" className="ml-1 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center bg-green-500 hover:bg-green-600 text-[10px]">
                ✓
              </Badge>
            </Button>
          </div>
        </div>
      </header>

      {/* Game Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Game Rules
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">1. Betting</h4>
                <p className="text-muted-foreground">Select a cyclist (1-6) and enter your bet amount before the race starts.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">2. Race</h4>
                <p className="text-muted-foreground">Once betting closes, cyclists race to the finish line. Each cyclist has different odds.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">3. Winning</h4>
                <p className="text-muted-foreground">If your chosen cyclist wins, you receive your bet multiplied by the cyclist's odds.</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2">4. Odds</h4>
                <p className="text-muted-foreground">Lower numbered cyclists have lower odds but higher win probability. Higher numbers have bigger payouts but less chance to win.</p>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* How to Play Dialog */}
      <Dialog open={showHowToPlay} onOpenChange={setShowHowToPlay}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              How to Play
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <div>
                  <h4 className="font-semibold">Choose Your Cyclist</h4>
                  <p className="text-muted-foreground">Tap on any cyclist number (1-6) to select them.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <div>
                  <h4 className="font-semibold">Set Your Bet</h4>
                  <p className="text-muted-foreground">Enter the amount you want to bet using +/- buttons or type directly.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <div>
                  <h4 className="font-semibold">Place Your Bet</h4>
                  <p className="text-muted-foreground">Click "Place Bet" to confirm. If race is ongoing, your bet queues for next round.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <div>
                  <h4 className="font-semibold">Watch & Win</h4>
                  <p className="text-muted-foreground">Watch the race! If your cyclist wins, winnings are credited automatically.</p>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CycleRaceHeader;
