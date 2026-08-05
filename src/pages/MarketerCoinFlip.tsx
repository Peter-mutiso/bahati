import { useMarketerCheck } from "@/hooks/useMarketerCheck";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlipHorizontal, LogOut, Eye, Settings } from "lucide-react";
import { formatNairobiTime } from "@/lib/utils";

interface CoinFlipResult {
  id: string;
  round_number: number;
  result: string | null;
  status: string;
  created_at: string;
}

interface LiveRound {
  status: string;
  headsTotal: number;
  tailsTotal: number;
  favoredSide: "heads" | "tails" | null;
}

const MarketerCoinFlip = () => {
  const { isMarketer, isLoading, marketerId } = useMarketerCheck();
  const navigate = useNavigate();

  const [isAssigned, setIsAssigned] = useState<boolean | null>(null);
  const [results, setResults] = useState<CoinFlipResult[]>([]);
  const [liveRound, setLiveRound] = useState<LiveRound | null>(null);

  useEffect(() => {
    if (!isMarketer || !marketerId) return;
    loadData();

    // Polling fallback in case realtime events don't fire (e.g. publication/RLS gaps)
    const pollInterval = window.setInterval(loadData, 4000);

    const sub = supabase
      .channel("marketer-coin-flip-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "coin_flip_rounds" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "coin_flip_bets" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      window.clearInterval(pollInterval);
      supabase.removeChannel(sub);
    };
  }, [isMarketer, marketerId]);

  const loadData = async () => {
    if (!marketerId) return;

    const { data: assignment } = await supabase
      .from("marketer_game_assignments")
      .select("game_slug")
      .eq("marketer_id", marketerId)
      .eq("game_slug", "coin-flip")
      .maybeSingle();

    setIsAssigned(!!assignment);
    if (!assignment) return;

    const { data: flips } = await supabase
      .from("coin_flip_rounds")
      .select("id, round_number, result, status, created_at")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(20);

    setResults(flips ?? []);

    // Live forecast for the round currently in progress
    const { data: activeRound } = await supabase
      .from("coin_flip_rounds")
      .select("id, status")
      .in("status", ["betting", "flipping"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!activeRound) {
      setLiveRound(null);
      return;
    }

    const { data: bets } = await supabase
      .from("coin_flip_bets")
      .select("side, amount")
      .eq("round_id", activeRound.id);

    const headsTotal = (bets || []).filter(b => b.side === "heads").reduce((s, b) => s + b.amount, 0);
    const tailsTotal = (bets || []).filter(b => b.side === "tails").reduce((s, b) => s + b.amount, 0);

    let favoredSide: "heads" | "tails" | null = null;
    if (headsTotal > 0 || tailsTotal > 0) {
      const headsLoss = headsTotal * 1.95 - tailsTotal;
      const tailsLoss = tailsTotal * 1.95 - headsTotal;
      favoredSide = headsLoss < tailsLoss ? "heads" : "tails";
    }

    setLiveRound({ status: activeRound.status, headsTotal, tailsTotal, favoredSide });
  };

  if (isLoading || isAssigned === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isMarketer) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FlipHorizontal className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-lg font-bold">Coin Flip Predictor</h1>
              <p className="text-xs text-muted-foreground">Marketer view</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => { await supabase.auth.signOut(); navigate("/marketer-login"); }}
            className="text-destructive border-destructive/30 hover:bg-destructive/10 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-4 space-y-4">
        {!isAssigned ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
            <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Coin Flip is not assigned to your account.</p>
            <p className="text-xs text-muted-foreground mt-1">Ask the admin to assign this game to you.</p>
          </div>
        ) : (
          <>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlipHorizontal className="w-4 h-4 text-purple-400" />
                  Current Round
                </CardTitle>
              </CardHeader>
              <CardContent>
                {liveRound ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Round status: <span className="capitalize">{liveRound.status}</span>.
                      The result isn't locked in until the round resolves — this is a live forecast based on current bets.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                      <span>Heads: <span className="font-semibold">KES {liveRound.headsTotal.toLocaleString()}</span></span>
                      <span>Tails: <span className="font-semibold">KES {liveRound.tailsTotal.toLocaleString()}</span></span>
                      {liveRound.favoredSide && (
                        <span>
                          Favored right now: <span className="font-bold capitalize text-primary">{liveRound.favoredSide}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No round in progress right now.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Eye className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Recent Coin Flip Results</CardTitle>
                    <CardDescription>Updates automatically as rounds finish.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Round ID</TableHead>
                    <TableHead>Round #</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id} className="group hover:bg-primary/5 transition-colors">
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        #{r.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.round_number}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize text-sm font-bold text-primary">
                          {r.result ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {formatNairobiTime(r.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {results.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground italic">
                        No results yet — waiting for rounds to finish...
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              </CardContent>
            </Card>
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Confidentiality</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground space-y-2">
            <p className="text-red-400">⚠️ IMPORTANT: Do not share screenshots of this page with results visible. This tool is for your marketing preparation only.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MarketerCoinFlip;
