import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Check, Shield, Lock, Key, Hash, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface CoinFlipProvablyFairModalProps {
  open: boolean;
  onClose: () => void;
  serverSeedHash?: string | null;
  revealedServerSeed?: string | null;
  clientSeed?: string | null;
  nonce?: number | null;
  result?: "heads" | "tails" | null;
}

async function hashSeed(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyResult(serverSeed: string, clientSeed: string, nonce: number): Promise<"heads" | "tails"> {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await hashSeed(combined);
  const value = parseInt(hash.substring(0, 8), 16);
  return value % 2 === 0 ? "heads" : "tails";
}

const CoinFlipProvablyFairModal = ({ 
  open, 
  onClose,
  serverSeedHash,
  revealedServerSeed,
  clientSeed: initialClientSeed,
  nonce: initialNonce,
  result
}: CoinFlipProvablyFairModalProps) => {
  const [serverSeed, setServerSeed] = useState(revealedServerSeed || "");
  const [clientSeed, setClientSeed] = useState(initialClientSeed || "");
  const [nonce, setNonce] = useState(initialNonce?.toString() || "");
  const [copied, setCopied] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"pending" | "verified" | "failed">("pending");
  const [calculatedResult, setCalculatedResult] = useState<"heads" | "tails" | null>(null);

  useEffect(() => {
    setServerSeed(revealedServerSeed || "");
    setClientSeed(initialClientSeed || "");
    setNonce(initialNonce?.toString() || "");
    setVerificationStatus("pending");
    setCalculatedResult(null);
  }, [revealedServerSeed, initialClientSeed, initialNonce]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleVerify = async () => {
    if (!serverSeed || !clientSeed || !nonce) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      // First verify server seed hash matches
      if (serverSeedHash) {
        const computedHash = await hashSeed(serverSeed);
        if (computedHash !== serverSeedHash) {
          setVerificationStatus("failed");
          toast.error("Server seed hash does not match!");
          return;
        }
      }

      // Calculate result
      const calculatedResult = await verifyResult(serverSeed, clientSeed, parseInt(nonce));
      setCalculatedResult(calculatedResult);

      // Check if matches actual result
      if (result && calculatedResult === result) {
        setVerificationStatus("verified");
        toast.success("Result verified successfully!");
      } else if (result) {
        setVerificationStatus("failed");
        toast.error("Calculated result does not match!");
      } else {
        setVerificationStatus("verified");
        toast.success(`Calculated result: ${calculatedResult}`);
      }
    } catch (error) {
      setVerificationStatus("failed");
      toast.error("Verification failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-500" />
            Provably Fair Verification
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">How It Works</TabsTrigger>
            <TabsTrigger value="verify">Verify Round</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Server Seed Hash</h4>
                  <p className="text-sm text-muted-foreground">
                    Before each round, we generate a secret server seed and show you its SHA-256 hash.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Client Seed + Nonce</h4>
                  <p className="text-sm text-muted-foreground">
                    A client seed and nonce are combined with the server seed to determine the outcome.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Verification</h4>
                  <p className="text-sm text-muted-foreground">
                    After the round, we reveal the server seed. You can verify the hash matches and recalculate the result.
                  </p>
                </div>
              </div>
            </div>

            {serverSeedHash && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                <Label className="text-xs text-muted-foreground">Current Round Server Seed Hash</Label>
                <p className="font-mono text-xs mt-1 break-all text-foreground">{serverSeedHash}</p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-2 text-green-500">
                <Check className="w-5 h-5" />
                <span className="font-semibold">100% Verifiable</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Every coin flip result is cryptographically verifiable using SHA-256 hashing.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="verify" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4" />
                  Server Seed {revealedServerSeed ? "(Revealed)" : "(Hidden until round ends)"}
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={serverSeed}
                    onChange={(e) => setServerSeed(e.target.value)}
                    className="bg-background/50 font-mono text-xs"
                    placeholder={revealedServerSeed ? "" : "Revealed after round completes"}
                    disabled={!revealedServerSeed}
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(serverSeed, "Server Seed")}
                    disabled={!serverSeed}
                  >
                    {copied === "Server Seed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Key className="w-4 h-4" />
                  Client Seed
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={clientSeed}
                    onChange={(e) => setClientSeed(e.target.value)}
                    className="bg-background/50 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(clientSeed, "Client Seed")}
                    disabled={!clientSeed}
                  >
                    {copied === "Client Seed" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Hash className="w-4 h-4" />
                  Nonce
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={nonce}
                    onChange={(e) => setNonce(e.target.value)}
                    className="bg-background/50 font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(nonce, "Nonce")}
                    disabled={!nonce}
                  >
                    {copied === "Nonce" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <Button 
              className="w-full" 
              variant="default"
              onClick={handleVerify}
              disabled={!serverSeed || !clientSeed || !nonce}
            >
              Verify Result
            </Button>

            <div className={`p-3 rounded-xl ${
              verificationStatus === "verified" 
                ? "bg-green-500/10 border border-green-500/30" 
                : verificationStatus === "failed"
                  ? "bg-red-500/10 border border-red-500/30"
                  : "bg-muted/30"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Verification Status</span>
                <span className={`text-sm font-semibold ${
                  verificationStatus === "verified" 
                    ? "text-green-500" 
                    : verificationStatus === "failed"
                      ? "text-red-500"
                      : "text-muted-foreground"
                }`}>
                  {verificationStatus === "verified" && "✓ Verified Fair"}
                  {verificationStatus === "failed" && "✗ Verification Failed"}
                  {verificationStatus === "pending" && "Awaiting verification"}
                </span>
              </div>
              {calculatedResult && (
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
                  <span className="text-sm text-muted-foreground">Calculated Result</span>
                  <span className={`text-sm font-bold uppercase ${
                    calculatedResult === "heads" ? "text-yellow-500" : "text-gray-400"
                  }`}>
                    {calculatedResult}
                  </span>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CoinFlipProvablyFairModal;
