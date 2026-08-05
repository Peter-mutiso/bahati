import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Shield, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

interface ProvablyFairModalProps {
  open: boolean;
  onClose: () => void;
}

const ProvablyFairModal = ({ open, onClose }: ProvablyFairModalProps) => {
  const [serverSeed, setServerSeed] = useState("a1b2c3d4e5f6...");
  const [clientSeed, setClientSeed] = useState("user_seed_123");
  const [nonce, setNonce] = useState("1");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-green-500" />
            <DialogTitle>Provably Fair Verification</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* What is Provably Fair */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              What is Provably Fair?
            </h3>
            <p className="text-sm text-muted-foreground">
              Our system uses cryptographic hashing to ensure every race result is predetermined
              and cannot be manipulated. You can verify the fairness of any race using the
              server seed, client seed, and nonce.
            </p>
          </div>

          {/* How to Verify */}
          <div>
            <h3 className="font-semibold mb-3">How to Verify (3 Steps)</h3>
            <div className="space-y-3">
              {[
                {
                  step: 1,
                  title: "Get Server Seed Hash",
                  desc: "Before race starts, we publish SHA-256 hash of server seed"
                },
                {
                  step: 2,
                  title: "Race Completes",
                  desc: "After race, we reveal the actual server seed"
                },
                {
                  step: 3,
                  title: "Verify Result",
                  desc: "Combine seeds and verify hash matches to confirm fairness"
                }
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-3 p-3 rounded-xl bg-accent/5 border border-border/50"
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seeds */}
          <div className="space-y-4">
            <div>
              <Label>Server Seed (SHA-256 Hash)</Label>
              <div className="flex gap-2 mt-1">
                <Input value={serverSeed} readOnly className="font-mono text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(serverSeed)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Client Seed (Your Seed)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  className="font-mono text-xs"
                  placeholder="Enter your custom seed"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(clientSeed)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label>Nonce</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={nonce}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(nonce)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Combined Seed & Result */}
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-green-600">
              <Check className="w-4 h-4" />
              Verification Result
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Combined Seed:</span>
                <span className="font-mono text-xs">SHA256(server + client + nonce)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Result:</span>
                <span className="font-semibold text-green-600">✓ Verified Fair</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Close
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700">
              Download Proof
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProvablyFairModal;
