import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ProvablyFairVerificationProps {
  serverSeed?: string;
  serverSeedHash?: string;
  clientSeed?: string;
  nonce?: number;
  crashPoint?: number;
}

export const ProvablyFairVerification = ({ 
  serverSeed, 
  serverSeedHash, 
  clientSeed, 
  nonce,
  crashPoint 
}: ProvablyFairVerificationProps) => {
  const { toast } = useToast();
  const [verifyServerSeed, setVerifyServerSeed] = useState("");
  const [verifyClientSeed, setVerifyClientSeed] = useState("");
  const [verifyNonce, setVerifyNonce] = useState("");
  const [calculatedCrash, setCalculatedCrash] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Auto-fill verification inputs when round data is available
  useEffect(() => {
    if (serverSeed) {
      setVerifyServerSeed(serverSeed);
    }
    if (clientSeed) {
      setVerifyClientSeed(clientSeed);
    }
    if (nonce !== undefined) {
      setVerifyNonce(nonce.toString());
    }
  }, [serverSeed, clientSeed, nonce]);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "Copied!",
      description: `${field} copied to clipboard`,
    });
  };

  const verifyResult = async () => {
    // Validate inputs
    if (!verifyServerSeed || !verifyClientSeed || !verifyNonce) {
      toast({
        title: "Missing Inputs",
        description: "Please fill in all fields (server seed, client seed, and nonce).",
        variant: "destructive",
      });
      return;
    }

    try {
      // Hash the server seed to verify
      const msgBuffer = new TextEncoder().encode(verifyServerSeed);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Calculate crash point
      const message = `${verifyClientSeed}-${verifyNonce}`;
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(verifyServerSeed),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      
      const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
      const sigHashArray = Array.from(new Uint8Array(signature));
      const hash = sigHashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const hs = parseInt(hash.slice(0, 8), 16);
      const e = Math.pow(2, 32);
      const crash = Math.floor(100 * e / (hs + e)) / 100;
      const finalCrash = Math.max(1.00, Math.min(crash, 100.00));

      setCalculatedCrash(finalCrash);

      // Verify hash matches (only if serverSeedHash is provided)
      if (serverSeedHash && calculatedHash === serverSeedHash) {
        toast({
          title: "✅ Verification Successful",
          description: `Calculated crash: ${finalCrash.toFixed(2)}x | Hash matches!`,
        });
      } else if (serverSeedHash) {
        toast({
          title: "❌ Verification Failed",
          description: "Server seed hash does not match!",
          variant: "destructive",
        });
      } else {
        toast({
          title: "✅ Crash Point Calculated",
          description: `Calculated crash: ${finalCrash.toFixed(2)}x`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify. Please check your inputs.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-card/50 backdrop-blur">
      <h3 className="text-xl font-bold mb-4 text-foreground">Provably Fair Verification</h3>
      
      <div className="space-y-4">
        <div>
          <Label className="text-sm text-muted-foreground">Server Seed Hash (SHA-256)</Label>
          <div className="flex gap-2">
            <Input 
              value={serverSeedHash || ""} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => copyToClipboard(serverSeedHash || "", "Server Seed Hash")}
            >
              {copiedField === "Server Seed Hash" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Server Seed (Revealed After Round)</Label>
          <div className="flex gap-2">
            <Input 
              value={serverSeed || "Hidden until round ends"} 
              readOnly 
              className="font-mono text-xs"
            />
            {serverSeed && (
              <Button 
                size="icon" 
                variant="ghost"
                onClick={() => copyToClipboard(serverSeed, "Server Seed")}
              >
                {copiedField === "Server Seed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Client Seed (Public)</Label>
          <div className="flex gap-2">
            <Input 
              value={clientSeed || ""} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button 
              size="icon" 
              variant="ghost"
              onClick={() => copyToClipboard(clientSeed || "", "Client Seed")}
            >
              {copiedField === "Client Seed" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Nonce (Round Number)</Label>
          <Input value={nonce !== undefined ? nonce : ""} readOnly />
        </div>

        <div>
          <Label className="text-sm text-muted-foreground">Actual Crash Point</Label>
          <Input value={crashPoint && crashPoint > 0 ? `${crashPoint.toFixed(2)}x` : "Hidden until round ends"} readOnly />
        </div>

        <div className="border-t pt-4 mt-4">
          <h4 className="font-semibold mb-3">Verify Manual</h4>
          
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Server Seed</Label>
              <Input 
                value={verifyServerSeed}
                onChange={(e) => setVerifyServerSeed(e.target.value)}
                placeholder="Paste server seed here"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Client Seed</Label>
              <Input 
                value={verifyClientSeed}
                onChange={(e) => setVerifyClientSeed(e.target.value)}
                placeholder="Paste client seed here"
                className="font-mono text-xs"
              />
            </div>

            <div>
              <Label className="text-xs">Nonce</Label>
              <Input 
                type="number"
                value={verifyNonce}
                onChange={(e) => setVerifyNonce(e.target.value)}
                placeholder="Enter round number"
              />
            </div>

            <Button onClick={verifyResult} className="w-full">
              Verify Result
            </Button>

            {calculatedCrash !== null && (
              <div className="bg-primary/10 p-3 rounded-lg">
                <p className="text-sm font-semibold text-primary">
                  Calculated Crash Point: {calculatedCrash.toFixed(2)}x
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded">
          <p className="font-semibold mb-1">How it works:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Server generates a random seed before the round</li>
            <li>Hash (SHA-256) of the seed is shown to players before the round starts</li>
            <li>After the round, server reveals the actual seed</li>
            <li>Players can verify the hash matches and calculate the crash point themselves</li>
            <li>Formula: HMAC-SHA256(serverSeed, clientSeed-nonce) → crash point</li>
          </ol>
        </div>
      </div>
    </Card>
  );
};
