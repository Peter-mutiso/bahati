import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Gem, Bomb } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { motion } from "framer-motion";
import { useMemo } from "react";

// Generate random AI players
const generateAIPlayers = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `ai-${i}`,
    amount: Math.floor(Math.random() * 900) + 100,
    current_multiplier: parseFloat((Math.random() * 4 + 1).toFixed(2)),
    tiles_revealed: Array.from({ length: Math.floor(Math.random() * 8) + 1 }, (_, j) => j),
    mines_count: Math.floor(Math.random() * 4) + 3,
    status: 'active'
  }));
};

export const MinesLiveBets = () => {
  const { formatCurrency } = useCurrency();
  
  // Generate 5-8 random AI players
  const aiPlayers = useMemo(() => generateAIPlayers(Math.floor(Math.random() * 4) + 5), []);

  const { data: realBets } = useQuery({
    queryKey: ["mines-live-bets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mines_bets")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 3000,
  });

  // Combine real bets with AI players
  const liveBets = useMemo(() => {
    const real = realBets || [];
    const combined = [...real, ...aiPlayers];
    return combined.slice(0, 10);
  }, [realBets, aiPlayers]);

  return (
    <Card className="relative overflow-hidden">
      {/* Premium gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-emerald-500/5" />
      
      <CardHeader className="relative z-10">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          Live Players
          {liveBets && liveBets.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="ml-auto text-xs px-2.5 py-1 rounded-full bg-primary/20 text-primary font-semibold ring-2 ring-primary/30"
            >
              {liveBets.length} active
            </motion.span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-2 relative z-10 max-h-[400px] overflow-y-auto custom-scrollbar">
        {liveBets.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No active games right now</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Be the first to play!</p>
          </div>
        ) : (
          liveBets.map((bet, index) => (
            <motion.div
              key={bet.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative p-3 rounded-xl bg-gradient-to-br from-card/80 to-card/40 border-2 border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--primary)/0.15)] backdrop-blur-sm"
            >
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-xl" />
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center ring-2 ring-primary/30">
                      <Gem className="w-5 h-5 text-primary" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute -inset-1 bg-primary/20 rounded-full blur-md -z-10"
                    />
                  </div>
                  
                  <div>
                    <p className="text-sm font-semibold">Player #{index + 1}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gem className="w-3 h-3 text-emerald-400" />
                        {bet.tiles_revealed?.length || 0}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Bomb className="w-3 h-3 text-destructive" />
                        {bet.mines_count}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary font-bold text-base">
                    <TrendingUp className="w-4 h-4" />
                    <span>{(bet.current_multiplier || 1).toFixed(2)}x</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(bet.amount)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
