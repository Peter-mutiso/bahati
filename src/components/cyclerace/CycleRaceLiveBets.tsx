import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Users } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface Bet {
  id: string;
  amount: number;
  cyclist_number: number;
  potential_payout: number;
  profit: number | null;
  status: string;
  created_at: string;
  profiles: {
    username?: string;
    avatar_url?: string | null;
  };
  isSimulated?: boolean;
}

const FAKE_USERNAMES = [
  "SpeedRacer", "CyclePro", "PedalKing", "RoadRunner", "VeloMaster",
  "SprintChamp", "TourWinner", "BikeHero", "RacingAce", "WheelStar",
  "CycleStorm", "PedalPower", "FastLane", "GearShift", "ChainBreaker",
  "WindRider", "HillClimber", "SprintKing", "VeloAce", "RaceChamp"
];

const generateFakePlayer = (): Bet => {
  const statuses = ["won", "lost"];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  const amount = Math.floor(Math.random() * 500) + 10;
  const cyclistNumber = Math.floor(Math.random() * 6) + 1;
  const multiplier = 2.3 + Math.random() * 2;
  const potentialPayout = amount * multiplier;
  const profit = status === "won" ? potentialPayout - amount : null;

  return {
    id: `fake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    cyclist_number: cyclistNumber,
    potential_payout: potentialPayout,
    profit,
    status,
    created_at: new Date().toISOString(),
    profiles: {
      username: FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)],
      avatar_url: null,
    },
    isSimulated: true,
  };
};

const CycleRaceLiveBets = () => {
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const [simulatedBets, setSimulatedBets] = useState<Bet[]>([]);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(() =>
    Math.floor(Math.random() * 3001) + 2000 // 2000-5000
  );
  const { symbol } = useCurrency();

  // Generate initial simulated bets - show more bets for realism
  useEffect(() => {
    const initialFakes = Array.from({ length: 15 }, () => generateFakePlayer());
    setSimulatedBets(initialFakes);
  }, []);

  // Rapidly update online players count and simulated bets
  useEffect(() => {
    // Fast interval for player count updates (every 500ms)
    const countInterval = setInterval(() => {
      setOnlinePlayersCount(prev => {
        const change = Math.floor(Math.random() * 100) - 50; // -50 to +50
        const newCount = prev + change;
        return Math.max(2000, Math.min(5000, newCount));
      });
    }, 500);

    // Fast interval for bet updates (every 800ms for quick feel)
    const betsInterval = setInterval(() => {
      setSimulatedBets(prev => {
        const updated = [...prev];

        // Add new fake players more often
        if (Math.random() > 0.3 && updated.length < 20) {
          updated.unshift(generateFakePlayer());
        }

        // Remove old bets frequently for fast updates
        if (updated.length > 10 && Math.random() > 0.4) {
          updated.shift();
        }
        if (Math.random() > 0.3 && updated.length < 20) {
          updated.unshift(generateFakePlayer());
        }

        // Remove old completed bets frequently for fast updates
        if (updated.length > 10 && Math.random() > 0.4) {
          const completedIdx = updated.findIndex(b => b.status !== "pending");
          if (completedIdx !== -1) {
            updated.splice(completedIdx, 1);
          }
        }

        return updated.slice(0, 20);
      });
    }, 800);

    return () => {
      clearInterval(countInterval);
      clearInterval(betsInterval);
    };
  }, []);

  useEffect(() => {
    loadMyBets();

    const channel = supabase
      .channel("cycle_bets_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cycling_race_bets",
        },
        () => {
          loadMyBets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadMyBets = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    // Load my bets only
    if (session) {
      const { data: myBetsData, error: myBetsError } = await supabase
        .from("cycling_race_bets")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (myBetsError) {
        console.error("Error loading my bets:", myBetsError);
      } else if (myBetsData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", session.user.id)
          .single();

        const betsWithProfile = myBetsData.map(bet => ({
          ...bet,
          profiles: profileData
        }));
        setMyBets(betsWithProfile as any);
      }
    } else {
      setMyBets([]);
    }
  };

  const colors = ["#00d4ff", "#ff006e", "#ffbe0b", "#8338ec", "#3a86ff", "#06ffa5"];

  const BetList = ({ bets }: { bets: Bet[] }) => (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {bets.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No bets yet</p>
      ) : (
        bets.map((bet) => {
          // Never fall back to email - the phone-based signup flow embeds
          // the player's phone number in the local part of their synthetic
          // auth email, so splitting it would leak that instead of showing
          // a safe placeholder.
          const displayName = bet.profiles?.username || "Player";
          return (
            <div
              key={bet.id}
              className="flex justify-between items-center p-3 bg-muted rounded-lg"
            >
              <div className="flex items-center gap-3 flex-1">
                <Avatar className="w-8 h-8 border-2 border-primary/50">
                  {bet.profiles?.avatar_url ? (
                    bet.profiles.avatar_url.startsWith('data:image') || bet.profiles.avatar_url.startsWith('http') ? (
                      <>
                        <AvatarImage src={bet.profiles.avatar_url} alt={displayName} className="object-cover" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-xs">
                          {displayName[0]?.toUpperCase()}
                        </AvatarFallback>
                      </>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-lg">
                        {bet.profiles.avatar_url}
                      </div>
                    )
                  ) : (
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-xs">
                      {displayName[0]?.toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="text-sm font-medium truncate">
                    {displayName}
                  </p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {symbol}{parseFloat(bet.amount.toString()).toFixed(2)}
                    </span>
                    <div 
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                      style={{
                        backgroundColor: `${colors[bet.cyclist_number - 1]}20`,
                        color: colors[bet.cyclist_number - 1],
                        border: `1px solid ${colors[bet.cyclist_number - 1]}`
                      }}
                    >
                      #{bet.cyclist_number}
                    </div>
                  </div>
                </div>
              </div>
              {bet.status === "won" ? (
                <div className="text-right">
                  <p className="text-sm font-bold text-success flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    +{symbol}{parseFloat((bet.profit || 0).toString()).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
              ) : bet.status === "lost" ? (
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">
                    Lost
                  </p>
                  <p className="text-xs text-muted-foreground">
                    -{symbol}{parseFloat(bet.amount.toString()).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-sm font-medium text-warning">
                    Pending
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {symbol}{parseFloat(bet.potential_payout.toString()).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Card className="p-4 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <span className="text-xs text-muted-foreground">
            <span className="font-bold text-success">{onlinePlayersCount.toLocaleString()}</span> players online
          </span>
        </div>
      </div>
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="all" className="gap-2">
            <Users className="w-4 h-4" />
            All Bets
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            My Bets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <BetList bets={simulatedBets} />
        </TabsContent>

        <TabsContent value="my">
          {myBets.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Sign in to see your bets
            </div>
          ) : (
            <BetList bets={myBets} />
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
};

export default CycleRaceLiveBets;
