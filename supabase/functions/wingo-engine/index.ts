import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function generateServerSeed(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hashSeed(seed: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(seed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateResult(serverSeed: string, clientSeed: string, nonce: number) {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await hashSeed(combined);
  const value = parseInt(hash.substring(0, 8), 16);
  const resultNumber = value % 10;
  
  let result: string;
  if (resultNumber === 0 || resultNumber === 5) {
    result = 'violet';
  } else if ([1, 3, 7, 9].includes(resultNumber)) {
    result = 'green';
  } else {
    result = 'red';
  }
  
  return { result, resultNumber };
}

async function processRound(supabase: any, roundId: string, settings: any) {
  console.log(`[Wingo] Processing round: ${roundId}`);
  
  // Atomically update status only if still in betting status
  const { data: round } = await supabase
    .from('wingo_rounds')
    .update({ status: 'finished' })
    .eq('id', roundId)
    .eq('status', 'betting')
    .select()
    .maybeSingle();

  // If update didn't happen, round was already processed by another call
  if (!round) {
    console.log(`[Wingo] Round already processed by another request`);
    return;
  }

  console.log(`[Wingo] Betting closed for round ${round.round_number}`);

  console.log('[Wingo] Processing round with settings:', settings);

  // Generate result
  const serverSeed = await generateServerSeed();
  let resultNumber: number;
  let result: string;

  if (settings?.manual_result_enabled && settings.manual_result !== null && settings.manual_result !== '') {
    resultNumber = parseInt(settings.manual_result);
    if (resultNumber === 0 || resultNumber === 5) {
      result = 'violet';
    } else if ([1, 3, 7, 9].includes(resultNumber)) {
      result = 'green';
    } else {
      result = 'red';
    }
    console.log(`[Wingo] Manual result: ${resultNumber} (${result})`);
  } else {
    const generated = await generateResult(serverSeed, round.client_seed, round.nonce);
    result = generated.result;
    resultNumber = generated.resultNumber;
    console.log(`[Wingo] Generated result: ${resultNumber} (${result})`);
  }

  // Update round with result
  await supabase
    .from('wingo_rounds')
    .update({
      result: result,
      result_number: resultNumber,
      server_seed: serverSeed,
      finished_at: new Date().toISOString(),
      status: 'completed'
    })
    .eq('id', roundId);

  // Process bets
  const { data: bets } = await supabase
    .from('wingo_bets')
    .select('*')
    .eq('round_id', roundId)
    .eq('status', 'pending');

  console.log(`[Wingo] Processing ${bets?.length || 0} bets`);

  if (bets && bets.length > 0) {
    for (const bet of bets) {
      let won = false;
      
      // Check win conditions
      if (bet.color === result) {
        won = true;
      } else if (bet.color === 'big' && resultNumber >= 5) {
        won = true;
      } else if (bet.color === 'small' && resultNumber < 5) {
        won = true;
      } else if (bet.color === `number-${resultNumber}`) {
        won = true;
      }

      const profit = won ? (bet.potential_payout - bet.amount) : -bet.amount;

      // Update bet status
      await supabase
        .from('wingo_bets')
        .update({
          status: won ? 'won' : 'lost',
          profit: profit
        })
        .eq('id', bet.id);

      // Pay winner
      if (won) {
        const { data: wallet } = await supabase
          .from('wallets')
          .select('wallet_cash')
          .eq('user_id', bet.user_id)
          .maybeSingle();

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
  }

  // Update stats
  const totalWagered = bets?.reduce((sum: number, bet: any) => sum + Number(bet.amount), 0) || 0;
  const totalPaidout = bets?.filter((b: any) => b.status === 'won').reduce((sum: number, bet: any) => sum + Number(bet.potential_payout), 0) || 0;

  const today = new Date().toISOString().split('T')[0];
  const { data: existingStats } = await supabase
    .from('wingo_stats')
    .select('*')
    .eq('date', today)
    .maybeSingle();

  if (existingStats) {
    await supabase
      .from('wingo_stats')
      .update({
        total_bets: existingStats.total_bets + (bets?.length || 0),
        total_wagered: Number(existingStats.total_wagered) + totalWagered,
        total_paidout: Number(existingStats.total_paidout) + totalPaidout,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingStats.id);
  } else {
    await supabase
      .from('wingo_stats')
      .insert({
        date: today,
        total_bets: bets?.length || 0,
        total_wagered: totalWagered,
        total_paidout: totalPaidout
      });
  }

  console.log(`[Wingo] Round ${round.round_number} completed - ${resultNumber} (${result})`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const action = body.action;
    console.log(`[Wingo Engine] Action: ${action}`);

    switch (action) {
      case 'get_state': {
        // Get settings with error handling and defaults
        const { data: settings, error: settingsError } = await supabase
          .from('wingo_settings')
          .select('*')
          .maybeSingle();

        if (settingsError) {
          console.error('[Wingo] Error fetching settings:', settingsError);
        }

        // Use settings or defaults
        const bettingDuration = settings?.betting_duration_seconds || 25;
        const resultDuration = settings?.result_duration_seconds || 5;

        // Check for existing betting round
        const { data: currentRound } = await supabase
          .from('wingo_rounds')
          .select('*')
          .eq('status', 'betting')
          .order('round_number', { ascending: false })
          .limit(1)
          .maybeSingle();

        console.log('[Wingo] Current round status:', currentRound ? currentRound.status : 'none');

        // Check if betting round has expired and needs processing
        if (currentRound) {
          const elapsed = Date.now() - new Date(currentRound.started_at).getTime();
          
          if (elapsed >= (bettingDuration * 1000)) {
            console.log('[Wingo] Round expired, processing and creating new round...');
            
            // Process the round
            await processRound(supabase, currentRound.id, settings);
            
            // Immediately create the next round
            const serverSeed = await generateServerSeed();
            const serverSeedHash = await hashSeed(serverSeed);
            const clientSeed = await generateServerSeed();

            const { data: newRound } = await supabase
              .from('wingo_rounds')
              .insert({
                status: 'betting',
                server_seed_hash: serverSeedHash,
                client_seed: clientSeed,
                nonce: Math.floor(Math.random() * 1000000),
                started_at: new Date().toISOString()
              })
              .select()
              .single();

            console.log(`[Wingo] New round ${newRound.round_number} created after processing`);
            
            return new Response(
              JSON.stringify({ round: newRound }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          // Return current active round
          return new Response(
            JSON.stringify({ round: currentRound }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // If no betting round exists, create one immediately
        if (!currentRound) {
          console.log('[Wingo] No betting round, creating new one...');

          const serverSeed = await generateServerSeed();
          const serverSeedHash = await hashSeed(serverSeed);
          const clientSeed = await generateServerSeed();

          const { data: newRound } = await supabase
            .from('wingo_rounds')
            .insert({
              status: 'betting',
              server_seed_hash: serverSeedHash,
              client_seed: clientSeed,
              nonce: Math.floor(Math.random() * 1000000),
              started_at: new Date().toISOString()
            })
            .select()
            .single();

          console.log(`[Wingo] Created round ${newRound.round_number}`);

          return new Response(
            JSON.stringify({ round: newRound }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Should never reach here
        throw new Error('Unable to get or create round');
      }

      case 'process_round': {
        const roundId = body.roundId;
        const { data: settings } = await supabase
          .from('wingo_settings')
          .select('*')
          .maybeSingle();

        await processRound(supabase, roundId, settings);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('[Wingo Engine Error]:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
