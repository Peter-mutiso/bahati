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

      // Get last race number
      const { data: lastRace } = await supabase
        .from('cycling_race_races')
        .select('race_number')
        .order('race_number', { ascending: false })
        .limit(1)
        .single();

      const nextRaceNumber = (lastRace?.race_number || 0) + 1;

      // Determine winner with improved RTP logic
      let winnerCyclist: number;
      
      if (settings.manual_winner_enabled && settings.manual_winner_cyclist) {
        winnerCyclist = settings.manual_winner_cyclist;
      } else {
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
        winnerCyclist = 1;
        
        for (let i = 0; i < weights.length; i++) {
          cumulative += weights[i];
          if (random <= cumulative) {
            winnerCyclist = i + 1;
            break;
          }
        }
      }

      // Create race
      const { data: race, error } = await supabase
        .from('cycling_race_races')
        .insert({
          race_number: nextRaceNumber,
          winner_cyclist: winnerCyclist,
          race_duration: settings.race_duration_seconds,
          status: 'preparing',
          started_at: new Date().toISOString(),
          tenant_id: tenantId
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`Race created: ${race.id}, Number: ${nextRaceNumber}, Winner: ${winnerCyclist} (RTP: ${settings.rtp_percentage}%)`);

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
