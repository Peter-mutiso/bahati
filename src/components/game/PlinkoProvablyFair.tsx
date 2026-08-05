import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Copy, RotateCw } from "lucide-react";

const MULTIPLIERS = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16]
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [18, 4, 1.7, 0.9, 0.5, 0.3, 0.2, 0.3, 0.5, 0.9, 1.7, 4, 18],
    16: [43, 7, 4, 2, 1.5, 0.3, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.3, 1.5, 2, 4, 7, 43]
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [58, 8, 3, 0.5, 0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 3, 8, 58],
    16: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110]
  }
};

export const PlinkoProvablyFair = () => {
  const [serverSeed, setServerSeed] = useState("");
  const [clientSeed, setClientSeed] = useState("");
  const [nonce, setNonce] = useState("");
  const [risk, setRisk] = useState<"low" | "medium" | "high">("medium");
  const [rows, setRows] = useState<8 | 12 | 16>(12);
  const [verifiedSlot, setVerifiedSlot] = useState<number | null>(null);
  const [verifiedMultiplier, setVerifiedMultiplier] = useState<number | null>(null);

  const hashAndVerify = async () => {
    if (!serverSeed || !clientSeed || !nonce) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const combined = `${serverSeed}-${clientSeed}-${nonce}`;
      const msgBuffer = new TextEncoder().encode(combined);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      // Use first 8 characters of hash to determine result
      const hexSegment = hashHex.substring(0, 8);
      const decimalValue = parseInt(hexSegment, 16);
      const normalized = decimalValue / 0xFFFFFFFF;

      // Simulate ball drops
      let position = rows / 2;
      for (let i = 0; i < rows; i++) {
        const dropHash = hashHex.substring(i * 2, i * 2 + 2);
        const dropValue = parseInt(dropHash, 16) / 255;
        if (dropValue < 0.5) {
          position -= 0.5;
        } else {
          position += 0.5;
        }
      }

      const resultSlot = Math.round(position);
      const clampedSlot = Math.max(0, Math.min(rows, resultSlot));
      const multiplier = MULTIPLIERS[risk][rows][clampedSlot];

      setVerifiedSlot(clampedSlot);
      setVerifiedMultiplier(multiplier);
      toast.success("Verification successful!");
    } catch (error) {
      console.error("Verification error:", error);
      toast.error("Verification failed");
    }
  };

  const autoFill = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to use auto-fill");
        return;
      }

      const { data: latestBet, error } = await supabase
        .from("plinko_bets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !latestBet) {
        toast.error("No previous bets found");
        return;
      }

      setServerSeed(latestBet.server_seed);
      setClientSeed(latestBet.client_seed);
      setNonce(latestBet.nonce.toString());
      setRisk(latestBet.risk as "low" | "medium" | "high");
      setRows(latestBet.rows as 8 | 12 | 16);
      toast.success("Auto-filled with latest bet data");
    } catch (error) {
      console.error("Auto-fill error:", error);
      toast.error("Failed to auto-fill");
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <Card className="p-4 sm:p-6 card-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="text-lg sm:text-xl font-bold">Provably Fair Verification</h2>
      </div>

      <Tabs defaultValue="verify" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="verify">Verify</TabsTrigger>
          <TabsTrigger value="info">How it Works</TabsTrigger>
        </TabsList>

        <TabsContent value="verify" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={autoFill}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RotateCw className="w-4 h-4" />
              Auto-fill Latest Bet
            </Button>
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="serverSeed">Server Seed</Label>
              <div className="flex gap-2">
                <Input
                  id="serverSeed"
                  value={serverSeed}
                  onChange={(e) => setServerSeed(e.target.value)}
                  placeholder="Enter server seed"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(serverSeed, "Server seed")}
                  disabled={!serverSeed}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="clientSeed">Client Seed</Label>
              <div className="flex gap-2">
                <Input
                  id="clientSeed"
                  value={clientSeed}
                  onChange={(e) => setClientSeed(e.target.value)}
                  placeholder="Enter client seed"
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(clientSeed, "Client seed")}
                  disabled={!clientSeed}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="nonce">Nonce</Label>
              <Input
                id="nonce"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                placeholder="Enter nonce"
                className="font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="risk">Risk Level</Label>
                <select
                  id="risk"
                  value={risk}
                  onChange={(e) => setRisk(e.target.value as "low" | "medium" | "high")}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <Label htmlFor="rows">Rows</Label>
                <select
                  id="rows"
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value) as 8 | 12 | 16)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background"
                >
                  <option value="8">8</option>
                  <option value="12">12</option>
                  <option value="16">16</option>
                </select>
              </div>
            </div>
          </div>

          <Button onClick={hashAndVerify} className="w-full">
            Verify Result
          </Button>

          {verifiedSlot !== null && verifiedMultiplier !== null && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold text-success">Verification Result:</h3>
              <p className="text-sm">
                <span className="text-muted-foreground">Result Slot:</span>{" "}
                <span className="font-bold">{verifiedSlot}</span>
              </p>
              <p className="text-sm">
                <span className="text-muted-foreground">Multiplier:</span>{" "}
                <span className="font-bold text-primary">{verifiedMultiplier}x</span>
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="info" className="space-y-3 text-sm">
          <div>
            <h3 className="font-semibold mb-2">What is Provably Fair?</h3>
            <p className="text-muted-foreground">
              Provably Fair is a technology that ensures game outcomes cannot be manipulated. 
              Every round uses cryptographic hashing to guarantee fairness.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">How Plinko Verification Works:</h3>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li>Server generates a random server seed</li>
              <li>Client generates a random client seed</li>
              <li>Both seeds and a nonce are combined and hashed using SHA-256</li>
              <li>The hash determines the ball's path through the Plinko board</li>
              <li>The final slot position determines your multiplier</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Verify Your Bets:</h3>
            <p className="text-muted-foreground">
              Use the "Auto-fill Latest Bet" button to automatically populate the verification 
              form with your most recent bet data. Click "Verify Result" to confirm the outcome 
              matches what you received.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
