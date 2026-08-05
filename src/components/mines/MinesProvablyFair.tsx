import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle2 } from "lucide-react";

interface MinesProvablyFairProps {
  serverSeed?: string;
  clientSeed?: string;
  nonce?: number;
}

export const MinesProvablyFair = ({
  serverSeed,
  clientSeed,
  nonce
}: MinesProvablyFairProps) => {
  return (
    <Card className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-background to-background" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Provably Fair
          <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Server Seed
            <span className="text-xs text-muted-foreground font-normal">(Encrypted)</span>
          </Label>
          <Input 
            value={serverSeed || ''} 
            readOnly 
            className="font-mono text-xs bg-muted/50 border-emerald-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Client Seed
            <span className="text-xs text-muted-foreground font-normal">(Your Input)</span>
          </Label>
          <Input 
            value={clientSeed || ''} 
            readOnly 
            className="font-mono text-xs bg-muted/50 border-emerald-500/20" 
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            Nonce
            <span className="text-xs text-muted-foreground font-normal">(Round Number)</span>
          </Label>
          <Input 
            value={nonce || ''} 
            readOnly 
            className="font-mono text-xs bg-muted/50 border-emerald-500/20" 
          />
        </div>

        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-xs text-muted-foreground leading-relaxed">
            🔒 <span className="font-semibold text-foreground">Verified Fair:</span> Mine positions are determined 
            using a cryptographic combination of server seed, client seed, and nonce, ensuring complete 
            fairness and transparency in every game round.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
