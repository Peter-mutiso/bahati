import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, ListOrdered } from "lucide-react";

interface CyclistCustomization {
  name: string;
  flag: string;
}

interface UpcomingRace {
  id: string;
  race_number: number;
  winner_cyclist: number | null;
  created_at: string;
}

interface CycleRaceUpcomingQueueProps {
  cyclistCustomization: CyclistCustomization[];
}

export function CycleRaceUpcomingQueue({ cyclistCustomization }: CycleRaceUpcomingQueueProps) {
  const { data: upcomingRaces, isLoading } = useQuery({
    queryKey: ["cycling-race-upcoming-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cycling_race_races")
        .select("id, race_number, winner_cyclist, created_at")
        .eq("status", "upcoming")
        .order("race_number", { ascending: true })
        .limit(100); // matches the engine's QUEUE_SIZE - bounds payload size regardless of tenant count

      if (error) throw error;
      return data as UpcomingRace[];
    },
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListOrdered className="w-5 h-5 text-primary" />
          Upcoming Race Queue
        </h3>
        <Badge variant="secondary">
          {upcomingRaces?.length || 0} queued
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        These races are already generated and waiting to run in order. This view is read-only -
        outcomes cannot be edited here. To influence future outcomes, use Manual Winner Control
        or RTP settings; changes apply as newly queued races are generated.
      </p>

      {upcomingRaces && upcomingRaces.length > 0 ? (
        <ScrollArea className="h-[420px] rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Race #</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Queued At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {upcomingRaces.map((race) => {
                const winnerIndex = (race.winner_cyclist || 1) - 1;
                const winner = cyclistCustomization[winnerIndex];
                return (
                  <TableRow key={race.id}>
                    <TableCell className="font-medium">#{race.race_number}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                          {race.winner_cyclist ?? "?"}
                        </span>
                        {winner?.name || `Cyclist ${race.winner_cyclist}`} {winner?.flag}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(race.created_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <ListOrdered className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>No races queued yet. The queue fills automatically as races run.</p>
        </div>
      )}
    </div>
  );
}
