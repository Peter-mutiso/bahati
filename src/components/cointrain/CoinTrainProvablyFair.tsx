import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Copy, Check, Train } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CoinTrainProvablyFairProps {
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  crashPoint?: number;
}

export const CoinTrainProvablyFair = ({
  serverSeed,
  serverSeedHash,
  clientSeed,
  nonce,
  crashPoint,
}: CoinTrainProvablyFairProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  const [verifyServerSeed, setVerifyServerSeed] = useState("");
  const [verifyClientSeed, setVerifyClientSeed] = useState("");
  const [verifyNonce, setVerifyNonce] = useState("");
  const [verificationResult, setVerificationResult] = useState<number | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const handleAutoFill = () => {
    if (serverSeed) setVerifyServerSeed(serverSeed);
    if (clientSeed) setVerifyClientSeed(clientSeed);
    if (nonce) setVerifyNonce(nonce.toString());
  };

  const verifyResult = async () => {
    if (!verifyServerSeed || !verifyClientSeed || !verifyNonce) {
      toast({ title: "Missing Data", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    try {
      const message = `${verifyClientSeed}-${verifyNonce}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(verifyServerSeed),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
      const hashArray = Array.from(new Uint8Array(signature));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const hs = parseInt(hash.slice(0, 8), 16);
      const e = Math.pow(2, 32);
      const crashMultiplier = 99 / (1 - (hs / e));
      const calculatedCrash = Math.max(1.00, Math.min(Math.floor(crashMultiplier) / 100, 10000.00));
      
      setVerificationResult(calculatedCrash);
      
      toast({
        title: "Verification Complete",
        description: `Calculated derail point: ${calculatedCrash.toFixed(2)}x`,
      });
    } catch (error) {
      toast({ title: "Verification Failed", description: "Could not verify the result", variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-4 border-amber-500/30 bg-gradient-to-b from-amber-900/20 to-transparent">
      <div className="flex items-center gap-2 text-amber-400">
        <ShieldCheck className="w-5 h-5" />
        <h3 className="font-semibold">Provably Fair Verification</h3>
      </div>

      <div className="space-y-3">
        {/* Current Round Info */}
        <div className="space-y-2 p-3 rounded-lg bg-amber-900/30 border border-amber-500/20">
          <h4 className="text-sm font-medium text-amber-200">Current Journey</h4>
          
          <div className="space-y-1">
            <Label className="text-xs text-amber-300/70">Server Seed Hash (Revealed before journey)</Label>
            <div className="flex gap-2">
              <Input 
                value={serverSeedHash || "Waiting..."} 
                readOnly 
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
              {serverSeedHash && (
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => copyToClipboard(serverSeedHash, "Hash")}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-800/50"
                >
                  {copied === "Hash" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              )}
            </div>
          </div>

          {serverSeed && (
            <div className="space-y-1">
              <Label className="text-xs text-amber-300/70">Server Seed (Revealed after derail)</Label>
              <div className="flex gap-2">
                <Input 
                  value={serverSeed} 
                  readOnly 
                  className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
                />
                <Button 
                  size="icon" 
                  variant="outline" 
                  onClick={() => copyToClipboard(serverSeed, "Seed")}
                  className="border-amber-500/50 text-amber-300 hover:bg-amber-800/50"
                >
                  {copied === "Seed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-amber-300/70">Client Seed</Label>
              <Input 
                value={clientSeed || "—"} 
                readOnly 
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-300/70">Nonce</Label>
              <Input 
                value={nonce?.toString() || "—"} 
                readOnly 
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
            </div>
          </div>

          {crashPoint && crashPoint > 0 && (
            <div className="pt-2 border-t border-amber-500/20">
              <p className="text-sm text-amber-200">
                Derailed at: <span className="font-bold text-amber-400">{crashPoint.toFixed(2)}x</span>
              </p>
            </div>
          )}
        </div>

        {/* Verification Tool */}
        <div className="space-y-2 p-3 rounded-lg bg-amber-950/30 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-amber-200">Verify Any Journey</h4>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleAutoFill}
              className="text-xs border-amber-500/50 text-amber-300 hover:bg-amber-800/50"
            >
              Auto-fill Current
            </Button>
          </div>
          
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-amber-300/70">Server Seed</Label>
              <Input 
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                placeholder="Enter server seed"
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-300/70">Client Seed</Label>
              <Input 
                value={verifyClientSeed}
                onChange={(e) => setVerifyClientSeed(e.target.value)}
                placeholder="Enter client seed"
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-amber-300/70">Nonce</Label>
              <Input 
                value={verifyNonce}
                onChange={(e) => setVerifyNonce(e.target.value)}
                placeholder="Enter nonce"
                className="text-xs bg-amber-950/50 border-amber-500/30 text-amber-100 font-mono"
              />
            </div>
          </div>

          <Button 
            onClick={verifyResult} 
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
          >
            <Train className="w-4 h-4 mr-2" />
            Verify Journey
          </Button>

          {verificationResult !== null && (
            <div className="p-2 rounded bg-amber-900/50 border border-amber-500/30 text-center">
              <p className="text-sm text-amber-200">Calculated Derail Point:</p>
              <p className="text-xl font-bold text-amber-400">{verificationResult.toFixed(2)}x</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};