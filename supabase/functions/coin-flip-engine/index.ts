import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Provably fair hash generation
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

async function generateResult(serverSeed: string, clientSeed: string, nonce: number): Promise<"heads" | "tails"> {
  const combined = `${serverSeed}:${clientSeed}:${nonce}`;
  const hash = await hashSeed(combined);
  // Use first 8 chars of hash as hex number, mod 2 for result
  const value = parseInt(hash.substring(0, 8), 16);
  return value % 2 === 0 ? "heads" : "tails";
}

// RTP-based result manipulation
async function generateRTPBasedResult(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  bets: any[],
  settings: any
): Promise<"heads" | "tails"> {
  const headsTotal = bets.filter(b => b.side === 'heads').reduce((sum, b) => sum + b.amount, 0);
  const tailsTotal = bets.filter(b => b.side === 'tails').reduce((sum, b) => sum + b.amount, 0);

  // If manual result is enabled, use it
  if (settings.manual_result_enabled && settings.manual_result) {
    console.log(`Using manual result: ${settings.manual_result}`);
    return settings.manual_result as "heads" | "tails";
  }

  // If no bets, use provably fair
  if (headsTotal === 0 && tailsTotal === 0) {
    return generateResult(serverSeed, clientSeed, nonce);
  }

  // RTP-based decision
  const rtpPercentage = settings.rtp_percentage || 95;
  const targetHouseEdge = (100 - rtpPercentage) / 100;

  // Calculate which result benefits the house more
  const headsPayoutMultiplier = 1.95;
  const tailsPayoutMultiplier = 1.95;

  const headsLoss = headsTotal * headsPayoutMultiplier - tailsTotal;
  const tailsLoss = tailsTotal * tailsPayoutMultiplier - headsTotal;

  // Determine house-favorable result
  const houseFavorableResult: "heads" | "tails" = headsLoss < tailsLoss ? "heads" : "tails";

  // Use RTP to decide if we should favor the house
  const random = Math.random() * 100;

  if (random > rtpPercentage) {
    // Favor house
    console.log(`RTP decision: Favoring house with ${houseFavorableResult}`);
    return houseFavorableResult;
  }

  // Otherwise use provably fair
  return generateResult(serverSeed, clientSeed, nonce);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { action, ...params } = await req.json();
    console.log(`Coin Flip Engine - Action: ${action}`, params);

    switch (action) {
      case 'get_state': {
        // Get current round or create new one
        const { data: currentRound } = await supabase
          .from('coin_flip_rounds')
          .select('*')
          .in('status', ['betting', 'flipping'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (currentRound) {
          const { data: bets } = await supabase
            .from('coin_flip_bets')
            .select('*')
            .eq('round_id', currentRound.id);

          // Fetch profiles for bets
          const betsWithProfiles = await Promise.all((bets || []).map(async (bet: any) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', bet.user_id)
              .single();
            return { ...bet, profiles: profile };
          }));

          return new Response(JSON.stringify({
            success: true,
            round: currentRound,
            bets: betsWithProfiles
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        return new Response(JSON.stringify({
          success: true,
          round: null,
          bets: []
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'start_round': {
        const { data: settings } = await supabase
          .from('coin_flip_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Get latest round number
        const { data: lastRound } = await supabase
          .from('coin_flip_rounds')
          .select('round_number')
          .order('round_number', { ascending: false })
          .limit(1)
          .single();

        const roundNumber = (lastRound?.round_number || 0) + 1;
        const serverSeed = await generateServerSeed();
        const serverSeedHash = await hashSeed(serverSeed);
        const clientSeed = `client_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const { data: round, error } = await supabase
          .from('coin_flip_rounds')
          .insert({
            round_number: roundNumber,
            status: 'betting',
            server_seed: serverSeed,
            server_seed_hash: serverSeedHash,
            client_seed: clientSeed,
            nonce: roundNumber
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating round:', error);
          throw error;
        }

        console.log(`Started round ${roundNumber}`);

        return new Response(JSON.stringify({
          success: true,
          round: {
            ...round,
            server_seed: undefined // Don't expose server seed until after flip
          },
          settings
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'place_bet': {
        const { userId, roundId, side, amount } = params;

        // Validate bet
        const { data: settings } = await supabase
          .from('coin_flip_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (amount < settings.min_bet || amount > settings.max_bet) {
          throw new Error(`Bet amount must be between ${settings.min_bet} and ${settings.max_bet}`);
        }

        // Check round is still in betting phase
        const { data: round } = await supabase
          .from('coin_flip_rounds')
          .select('*')
          .eq('id', roundId)
          .single();

        if (!round || round.status !== 'betting') {
          throw new Error('Betting is closed for this round');
        }

        // Check user balance
        const { data: wallet } = await supabase
          .from('wallets')
          .select('wallet_cash, wallet_bonus, wager_completed')
          .eq('user_id', userId)
          .single();

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        const totalBalance = wallet.wallet_cash + wallet.wallet_bonus;
        if (totalBalance < amount) {
          throw new Error('Insufficient balance');
        }

        // Deduct from wallet (bonus first, then cash)
        let remainingAmount = amount;
        let bonusDeducted = 0;
        let cashDeducted = 0;

        if (wallet.wallet_bonus > 0) {
          bonusDeducted = Math.min(wallet.wallet_bonus, remainingAmount);
          remainingAmount -= bonusDeducted;
        }
        if (remainingAmount > 0) {
          cashDeducted = remainingAmount;
        }

        await supabase
          .from('wallets')
          .update({
            wallet_cash: wallet.wallet_cash - cashDeducted,
            wallet_bonus: wallet.wallet_bonus - bonusDeducted,
            wager_completed: (wallet.wager_completed || 0) + amount
          })
          .eq('user_id', userId);

        // Create bet
        const potentialPayout = amount * 1.95;
        const { data: bet, error } = await supabase
          .from('coin_flip_bets')
          .insert({
            user_id: userId,
            round_id: roundId,
            side,
            amount,
            potential_payout: potentialPayout,
            status: 'pending'
          })
          .select('*')
          .single();

        if (error) {
          console.error('Error placing bet:', error);
          throw error;
        }

        // Fetch profile separately
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', userId)
          .single();

        console.log(`Bet placed: ${amount} on ${side} by user ${userId}`);

        return new Response(JSON.stringify({
          success: true,
          bet: { ...bet, profiles: profile }
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'start_flip': {
        const { roundId } = params;

        // Update round status to flipping
        const { error } = await supabase
          .from('coin_flip_rounds')
          .update({ status: 'flipping' })
          .eq('id', roundId);

        if (error) throw error;

        console.log(`Round ${roundId} started flipping`);

        return new Response(JSON.stringify({
          success: true
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'complete_round': {
        const { roundId } = params;

        // Get round and bets
        const { data: round } = await supabase
          .from('coin_flip_rounds')
          .select('*')
          .eq('id', roundId)
          .single();

        if (!round) throw new Error('Round not found');

        const { data: bets } = await supabase
          .from('coin_flip_bets')
          .select('*')
          .eq('round_id', roundId);

        const { data: settings } = await supabase
          .from('coin_flip_settings')
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        // Generate result
        const result = await generateRTPBasedResult(
          round.server_seed,
          round.client_seed,
          round.nonce,
          bets || [],
          settings
        );

        console.log(`Round ${roundId} result: ${result}`);

        // Update round with result
        await supabase
          .from('coin_flip_rounds')
          .update({
            status: 'completed',
            result,
            finished_at: new Date().toISOString()
          })
          .eq('id', roundId);

        // Process bets
        for (const bet of (bets || [])) {
          const won = bet.side === result;
          const profit = won ? bet.potential_payout - bet.amount : -bet.amount;

          // Update bet
          await supabase
            .from('coin_flip_bets')
            .update({
              status: won ? 'won' : 'lost',
              profit
            })
            .eq('id', bet.id);

          // If won, credit winnings
          if (won) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('wallet_cash')
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

        return new Response(JSON.stringify({
          success: true,
          result,
          serverSeed: round.server_seed, // Reveal server seed after completion
          clientSeed: round.client_seed,
          nonce: round.nonce
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      case 'get_history': {
        const { data: history } = await supabase
          .from('coin_flip_rounds')
          .select('round_number, result, created_at, server_seed_hash')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);

        return new Response(JSON.stringify({
          success: true,
          history: history || []
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Coin Flip Engine Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), { 
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
