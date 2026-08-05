import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck } from "lucide-react";

interface AviatorProvablyFairProps {
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  crashPoint?: number;
}

export const AviatorProvablyFair = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  crashPoint,
}: AviatorProvablyFairProps) => {
  return (
    <Card className="p-4 border-red-900/30 bg-gradient-to-b from-slate-800/80 to-red-950/20">
      <div className="flex items-center gap-2 mb-4">
        <ShieldCheck className="w-5 h-5 text-red-400" />
        <h3 className="font-semibold text-red-100">Provably Fair</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Server Seed Hash (SHA-256)</Label>
          <Input
            value={serverSeedHash || "Waiting for next round..."}
            readOnly
            className="text-xs bg-slate-800/80 border-red-900/50 text-red-100 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-slate-400">Client Seed</Label>
          <Input
            value={clientSeed || "N/A"}
            readOnly
            className="text-xs bg-slate-800/80 border-red-900/50 text-red-100 font-mono"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Nonce (Round #)</Label>
            <Input
              value={nonce || 0}
              readOnly
              className="text-xs bg-slate-800/80 border-red-900/50 text-red-100 font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Crash Point</Label>
            <Input
              value={crashPoint ? `${crashPoint.toFixed(2)}x` : "In progress..."}
              readOnly
              className="text-xs bg-slate-800/80 border-red-900/50 text-red-100 font-mono"
            />
          </div>
        </div>

        {serverSeed && (
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Revealed Server Seed</Label>
            <Input
              value={serverSeed}
              readOnly
              className="text-xs bg-slate-800/80 border-red-900/50 text-red-100 font-mono"
            />
          </div>
        )}

        <div className="p-3 bg-red-900/20 rounded-lg border border-red-800/30">
          <p className="text-xs text-red-200/80">
            <strong className="text-red-300">How it works:</strong> The crash point is determined using 
            HMAC-SHA256(serverSeed, clientSeed-nonce). The server seed hash is shown before the round, 
            and revealed after to prove fairness.
          </p>
        </div>
      </div>
    </Card>
  );
};