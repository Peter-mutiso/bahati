import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RaceSettings {
  race_duration_seconds: number;
  betting_duration_seconds: number;
  number_of_cyclists: number;
  rtp_percentage: number;
  manual_winner_enabled: boolean;
  manual_winner_cyclist: number | null;
}

// How many pre-generated races should always be sitting in the 'upcoming'
// queue, ready to activate. Winners for these are decided once, when a race
// is added to the queue - never recomputed later.
const QUEUE_SIZE = 100;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Read body once and parse
    let action = 'status';
    let raceId: string | undefined;
    let status: string | undefined;
    let tenantId: string = 'aaaaaaaa-0000-0000-0000-000000000001';
    
    try {
      const bodyText = await req.text();
      if (bodyText) {
        const body = JSON.parse(bodyText);
        action = body.action || 'status';
        raceId = body.raceId;
        status = body.status;
        tenantId = body.tenantId || tenantId;
      }
    } catch (e) {
      console.log('No body or invalid JSON, defaulting to status check');
    }
    
    console.log(`Race engine action: ${action}`);

    if (action === 'create-race') {
      // Get settings
      const { data: settings } = await supabase
        .from('cycling_race_settings')
        .select('*')
        .single();

      if (!settings) {
        throw new Error('Settings not found');
      }

      // Pop the earliest pre-generated race off the 'upcoming' queue and
      // promote it to active. This is an atomic DB operation (FOR UPDATE
      // SKIP LOCKED inside the function) so it can't hand out the same
      // queued race twice. The winner was already decided when this race
      // was queued - it is not regenerated here, except that a currently
      // enabled manual winner override still applies instantly.
      const { data: activatedRace, error: activateError } = await supabase.rpc(
        'activate_next_cycling_race',
        {
          p_tenant_id: tenantId,
          p_manual_winner_enabled: settings.manual_winner_enabled,
          p_manual_winner_cyclist: settings.manual_winner_cyclist,
          p_race_duration: settings.race_duration_seconds
        }
      );

      if (activateError) throw activateError;

      let race = activatedRace;

      if (!race) {
        // Queue was empty (e.g. very first run before it has ever been
        // seeded). Fall back to the original immediate-generation behavior
        // so the game never stalls, then let the top-up below start filling
        // the queue for next time.
        console.log('Upcoming queue empty, generating race immediately as fallback');

        // race_number is left unset - the column default (a DB sequence)
        // allocates it atomically, so two concurrent fallbacks can never
        // collide on the same number.
        const { data: fallbackRace, error: insertError } = await supabase
          .from('cycling_race_races')
          .insert({
            winner_cyclist: determineWinner(settings),
            race_duration: settings.race_duration_seconds,
            status: 'preparing',
            started_at: new Date().toISOString(),
            tenant_id: tenantId
          })
          .select()
          .single();

        if (insertError) throw insertError;
        race = fallbackRace;
      }

      console.log(`Race activated: ${race.id}, Number: ${race.race_number}, Winner: ${race.winner_cyclist} (RTP: ${settings.rtp_percentage}%)`);

      // Keep the queue topped up to QUEUE_SIZE for future rounds. This only
      // ever adds new rows for the race(s) just consumed - it never touches
      // winners already sitting in the queue.
      await ensureQueueFilled(supabase, settings, tenantId);

      return new Response(
        JSON.stringify({ success: true, race }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update-race') {
      if (!raceId || !status) {
        throw new Error('Missing raceId or status for update-race action');
      }
      
      const updates: any = { status };
      if (status === 'finished') {
        updates.finished_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('cycling_race_races')
        .update(updates)
        .eq('id', raceId);

      if (error) throw error;

      // Process bets if finished
      if (status === 'finished') {
        const { data: race } = await supabase
          .from('cycling_race_races')
          .select('winner_cyclist')
          .eq('id', raceId)
          .single();

        if (race) {
          await processRaceBets(supabase, raceId, race.winner_cyclist);
        }
      }

      console.log(`Race ${raceId} updated to: ${status}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: return status
    const { data: activeRace } = await supabase
      .from('cycling_race_races')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['preparing', 'locking', 'racing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return new Response(
      JSON.stringify({ 
        success: true, 
        activeRace,
        message: activeRace ? 'Race active' : 'No active race'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Race engine error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Determine a winner using the existing manual-override / weighted-RTP
// logic. This is the same algorithm the engine always used for create-race -
// it has just been extracted so it can also be used to pre-generate races
// for the upcoming queue, instead of only running at the exact moment a
// race goes live.
function determineWinner(settings: RaceSettings): number {
  if (settings.manual_winner_enabled && settings.manual_winner_cyclist) {
    return settings.manual_winner_cyclist;
  }

  // More lethal RTP: favor lower-odds cyclists (higher chance of house winning)
  const rtpFactor = settings.rtp_percentage / 100;
  const numCyclists = settings.number_of_cyclists;

  // Generate weighted random - lower cyclists (lower odds) have higher win chance
  // This makes house edge more effective
  const weights: number[] = [];
  let totalWeight = 0;

  for (let i = 0; i < numCyclists; i++) {
    // Exponential decay: first cyclist has highest weight
    // Lower RTP = more weight towards lower-odds cyclists
    const weight = Math.pow(1 - (rtpFactor * 0.3), i) * (numCyclists - i);
    weights.push(weight);
    totalWeight += weight;
  }

  // Normalize and select
  const random = Math.random() * totalWeight;
  let cumulative = 0;
  let winnerCyclist = 1;

  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random <= cumulative) {
      winnerCyclist = i + 1;
      break;
    }
  }

  return winnerCyclist;
}

// Top the 'upcoming' queue back up to QUEUE_SIZE for this tenant. Winners
// are rolled here in JS (single source of truth for the RTP/manual-override
// algorithm), but "how many do we actually need" is decided atomically in
// Postgres via ensure_cycling_race_queue - a plain count-then-insert here
// would race against a concurrent caller doing the same thing. Rolling
// QUEUE_SIZE candidates every call is cheap (simple arithmetic, no I/O);
// the DB function only keeps as many as the queue is actually short by and
// discards the rest.
async function ensureQueueFilled(supabase: any, settings: RaceSettings, tenantId: string) {
  const candidateWinners = Array.from({ length: QUEUE_SIZE }, () => determineWinner(settings));

  const { data: insertedCount, error } = await supabase.rpc('ensure_cycling_race_queue', {
    p_tenant_id: tenantId,
    p_queue_size: QUEUE_SIZE,
    p_race_duration: settings.race_duration_seconds,
    p_winners: candidateWinners
  });

  if (error) {
    console.error('Failed to top up cycling race queue:', error);
  } else if (insertedCount > 0) {
    console.log(`Topped up cycling race queue with ${insertedCount} race(s) for tenant ${tenantId}`);
  }
}

async function processRaceBets(supabase: any, raceId: string, winnerCyclist: number) {
  const { data: bets } = await supabase
    .from('cycling_race_bets')
    .select('*')
    .eq('race_id', raceId)
    .eq('status', 'pending');

  if (!bets || bets.length === 0) {
    console.log('No bets to process');
    return;
  }

  for (const bet of bets) {
    const isWinner = bet.cyclist_number === winnerCyclist;
    const profit = isWinner ? bet.potential_payout - bet.amount : -bet.amount;
    
    await supabase
      .from('cycling_race_bets')
      .update({
        status: isWinner ? 'won' : 'lost',
        profit: profit
      })
      .eq('id', bet.id);

    if (isWinner) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', bet.user_id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            wallet_cash: wallet.wallet_cash + bet.potential_payout
          })
          .eq('user_id', bet.user_id);
      }
    }
  }

  console.log(`Processed ${bets.length} bets for race ${raceId}`);
}
