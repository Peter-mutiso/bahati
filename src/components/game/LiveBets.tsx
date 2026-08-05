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
  cashed_out_at: number | null;
  status: string;
  profiles: {
    email: string;
    username?: string;
    avatar_url?: string | null;
  };
  game_rounds?: {
    crash_point: number;
  };
}

const LiveBets = () => {
  const [allBets, setAllBets] = useState<Bet[]>([]);
  const [myBets, setMyBets] = useState<Bet[]>([]);
  const { symbol } = useCurrency();

  useEffect(() => {
    loadBets();

    const channel = supabase
      .channel("bets_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bets",
        },
        () => {
          loadBets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadBets = async () => {
    const { data: { session } } = await supabase.auth.getSession();

    // Load all bets
    const { data: allBetsData, error: allBetsError } = await supabase
      .from("bets")
      .select("*, game_rounds(crash_point)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (allBetsError) {
      console.error("Error loading all bets:", allBetsError);
    } else if (allBetsData && allBetsData.length > 0) {
      // Fetch profiles separately
      const userIds = [...new Set(allBetsData.map(bet => bet.user_id))];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id, email, username, avatar_url")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading profiles:", profilesError);
        }

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
        const betsWithProfiles = allBetsData.map(bet => ({
          ...bet,
          profiles: profilesMap.get(bet.user_id)
        }));
        setAllBets(betsWithProfiles as any);
      }
    }

    // Load my bets
    if (session) {
      const { data: myBetsData, error: myBetsError } = await supabase
        .from("bets")
        .select("*, game_rounds(crash_point)")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (myBetsError) {
        console.error("Error loading my bets:", myBetsError);
      } else if (myBetsData) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id, email, username, avatar_url")
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

  const BetList = ({ bets }: { bets: Bet[] }) => (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {bets.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No bets yet</p>
      ) : (
        bets.map((bet) => {
          const displayName = bet.profiles?.username || bet.profiles?.email?.split("@")[0] || "Anonymous";
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
                  <p className="text-xs text-muted-foreground">
                    {symbol}{parseFloat(bet.amount.toString()).toFixed(2)}
                  </p>
                </div>
              </div>
              {bet.cashed_out_at ? (
                <div className="text-right">
                  <p className="text-sm font-bold text-success flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {parseFloat(bet.cashed_out_at.toString()).toFixed(2)}x
                  </p>
                  <p className="text-xs text-muted-foreground">Won</p>
                </div>
              ) : (
                <div className="text-right">
                  <p className="text-sm font-bold text-destructive">
                    Lost
                  </p>
                  {bet.game_rounds?.crash_point && (
                    <p className="text-xs text-muted-foreground">
                      @ {parseFloat(bet.game_rounds.crash_point.toString()).toFixed(2)}x
                    </p>
                  )}
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
          <BetList bets={allBets} />
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

export default LiveBets;