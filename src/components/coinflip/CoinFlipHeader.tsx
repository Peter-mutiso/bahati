import { ArrowLeft, Shield, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";

interface CoinFlipHeaderProps {
  balance: number;
  onOpenProvablyFair: () => void;
}

const CoinFlipHeader = ({ balance, onOpenProvablyFair }: CoinFlipHeaderProps) => {
  const { symbol } = useCurrency();
  const navigate = useNavigate();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Left - Back & Title */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8 sm:h-9 sm:w-9"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <span className="font-bold text-lg sm:text-xl">Coin Flip</span>
        </div>

        {/* Center - Balance */}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card/50 border border-border/50">
          <span className="text-sm text-muted-foreground">Balance:</span>
          <span className="font-bold text-foreground">
            {symbol}{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>

        {/* Right - Provably Fair */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenProvablyFair}
          className="flex items-center gap-1.5 text-xs sm:text-sm"
        >
          <div className="flex items-center justify-center w-4 h-4 rounded-full bg-green-500/20">
            <Check className="h-2.5 w-2.5 text-green-500" />
          </div>
          <Shield className="h-3.5 w-3.5 text-green-500" />
          <span className="hidden sm:inline text-muted-foreground">Provably Fair</span>
        </Button>
      </div>
    </div>
  );
};

export default CoinFlipHeader;
