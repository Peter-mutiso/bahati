import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCurrency } from "@/hooks/useCurrency";
import { Target } from "lucide-react";

interface WagerProgressProps {
  wagerRequired: number;
  wagerCompleted: number;
  wagerEnabled?: boolean;
}

export const WagerProgress = ({ wagerRequired, wagerCompleted, wagerEnabled = true }: WagerProgressProps) => {
  const { symbol } = useCurrency();
  
  if (!wagerEnabled || wagerRequired === 0) return null;

  const remaining = Math.max(0, wagerRequired - wagerCompleted);
  const progress = wagerRequired > 0 ? (wagerCompleted / wagerRequired) * 100 : 0;
  const isComplete = remaining === 0;

  return (
    <Card className="border-primary/20 bg-card/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Target className="w-4 h-4" />
          Wager Requirement
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">
            {isComplete ? (
              <span className="text-green-500 font-medium">✓ Completed</span>
            ) : (
              `${symbol}${remaining.toFixed(2)} left to wager`
            )}
          </span>
          <span className="text-muted-foreground">
            {symbol}{wagerCompleted.toFixed(2)} / {symbol}{wagerRequired.toFixed(2)}
          </span>
        </div>
        {!isComplete && (
          <p className="text-xs text-muted-foreground">
            Complete wager requirement to enable withdrawals
          </p>
        )}
      </CardContent>
    </Card>
  );
};
