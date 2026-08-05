import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GameState {
  status: 'preparing' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint: number;
  roundNumber: number;
  roundId: string | null;
  startTime: number;
  prepareEndTime: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
}

let gameState: GameState = {
  status: 'preparing',
  multiplier: 1.0,
  crashPoint: 0,
  roundNumber: 0,
  roundId: null,
  startTime: Date.now(),
  prepareEndTime: Date.now() + 8000,
  serverSeed: '',
  serverSeedHash: '',
  clientSeed: 'coin-train-seed-v1',
};

const clients = new Map<WebSocket, { lastPing: number }>();

const HEARTBEAT_INTERVAL = 30000;
const CLIENT_TIMEOUT = 60000;

setInterval(() => {
  const now = Date.now();
  clients.forEach((clientData, socket) => {
    if (now - clientData.lastPing > CLIENT_TIMEOUT) {
      console.log('Removing stale client connection');
      try { socket.close(); } catch (e) {}
      clients.delete(socket);
    }
  });
}, 30000);

setInterval(() => {
  clients.forEach((_, socket) => {
    if (socket.readyState === 1) {
      try {
        socket.send(JSON.stringify({ type: 'heartbeat', data: { timestamp: Date.now() } }));
      } catch (e) {
        clients.delete(socket);
      }
    }
  });
}, HEARTBEAT_INTERVAL);

function generateServerSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashServerSeed(serverSeed: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function calculateProvablyFairCrashPoint(serverSeed: string, clientSeed: string, nonce: number): Promise<number> {
  const message = `${clientSeed}-${nonce}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(serverSeed),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const hashArray = Array.from(new Uint8Array(signature));
  const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const hs = parseInt(hash.slice(0, 8), 16);
  const e = Math.pow(2, 32);
  const crashMultiplier = 99 / (1 - (hs / e));
  const baseCrashPoint = Math.floor(crashMultiplier) / 100;
  
  return Math.max(1.00, Math.min(baseCrashPoint, 10000.00));
}

function calculateMultiplier(elapsedSeconds: number): number {
  const baseMultiplier = 1.0;
  
  if (elapsedSeconds < 1.5) {
    return baseMultiplier + (elapsedSeconds * 0.04);
  } else if (elapsedSeconds < 4) {
    const t = elapsedSeconds - 1.5;
    return 1.06 + (t * t * 0.1);
  } else {
    const t = elapsedSeconds - 4;
    const growthRate = 0.13;
    const offset = 1.06 + (2.5 * 2.5 * 0.1);
    return offset * Math.pow(1 + growthRate, t * 1.8);
  }
}

function applyRTPAdjustment(baseCrashPoint: number, todayStats: any, settings: any): number {
  if (!settings?.auto_rtp_enabled) return baseCrashPoint;
  if (!todayStats || !todayStats.total_wagered || todayStats.total_wagered === 0) return baseCrashPoint;

  const actualRTP = (todayStats.total_paidout / todayStats.total_wagered) * 100;
  const targetRTP = settings.rtp_percentage || 95;
  const rtpDiff = actualRTP - targetRTP;

  let adjustmentFactor = 1.0;
  
  if (rtpDiff < -20) adjustmentFactor = 2.5;
  else if (rtpDiff < -10) adjustmentFactor = 1.8;
  else if (rtpDiff < -3) adjustmentFactor = 1.4;
  else if (rtpDiff > 10) adjustmentFactor = 0.6;
  else if (rtpDiff > 3) adjustmentFactor = 0.8;

  const adjustedCrashPoint = baseCrashPoint * adjustmentFactor;
  return Math.max(1.00, Math.min(adjustedCrashPoint, 10000.00));
}

async function gameLoop() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  while (true) {
    const now = Date.now();

    if (gameState.status === 'preparing') {
      if (now >= gameState.prepareEndTime) {
        const { data: todayStats } = await supabase
          .from('coin_train_stats')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
          .maybeSingle();
        
        const { data: settings } = await supabase
          .from('coin_train_settings')
          .select('*')
          .limit(1)
          .maybeSingle();
        
        gameState.status = 'flying';
        gameState.multiplier = 1.0;
        
        const baseCrashPoint = await calculateProvablyFairCrashPoint(
          gameState.serverSeed,
          gameState.clientSeed,
          gameState.roundNumber
        );
        
        if (settings?.use_manual_crash_point && settings?.manual_crash_points && settings.manual_crash_points.length > 0) {
          // Always use the first manual crash point until setting is changed
          gameState.crashPoint = settings.manual_crash_points[0];
          console.log('Using manual crash point:', gameState.crashPoint);
        } else {
          gameState.crashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, settings);
        }
        
        gameState.startTime = now;

        // Update round with crash point
        if (gameState.roundId) {
          await supabase
            .from('game_rounds')
            .update({ crash_point: gameState.crashPoint, status: 'running' })
            .eq('id', gameState.roundId);
        }

        broadcast({
          type: 'round_start',
          data: {
            roundNumber: gameState.roundNumber,
            roundId: gameState.roundId,
            status: 'flying',
            serverSeedHash: gameState.serverSeedHash,
            clientSeed: gameState.clientSeed,
            nonce: gameState.roundNumber,
          },
        });
      } else {
        const timeLeft = Math.ceil((gameState.prepareEndTime - now) / 1000);
        broadcast({
          type: 'preparing',
          data: { 
            timeLeft, 
            serverSeedHash: gameState.serverSeedHash, 
            roundNumber: gameState.roundNumber, 
            clientSeed: gameState.clientSeed,
            roundId: gameState.roundId,
          },
        });
      }
    } else if (gameState.status === 'flying') {
      const elapsedSeconds = (now - gameState.startTime) / 1000;
      const currentMultiplier = calculateMultiplier(elapsedSeconds);
      
      if (Math.abs(currentMultiplier - gameState.multiplier) >= 0.01) {
        gameState.multiplier = currentMultiplier;
        broadcast({ type: 'multiplier_update', data: { multiplier: currentMultiplier, timestamp: now } });
      }

      if (currentMultiplier >= gameState.crashPoint) {
        gameState.status = 'crashed';
        gameState.multiplier = gameState.crashPoint;

        if (gameState.roundId) {
          await supabase.from('game_rounds').update({ status: 'crashed', crashed_at: new Date().toISOString() }).eq('id', gameState.roundId);
        }

        if (gameState.roundId) {
          const { data: activeBets } = await supabase.from('bets').select('*').eq('round_id', gameState.roundId).eq('status', 'active');

          if (activeBets && activeBets.length > 0) {
            for (const bet of activeBets) {
              const betAmount = parseFloat(bet.amount.toString());
              const profit = bet.cashed_out_at ? betAmount * (parseFloat(bet.cashed_out_at.toString()) - 1) : -betAmount;

              await supabase.from('bets').update({ status: profit > 0 ? 'won' : 'lost', profit }).eq('id', bet.id);

              const { data: wallet } = await supabase.from('wallets').select('wallet_cash, loan_amount').eq('user_id', bet.user_id).single();

              if (wallet) {
                let loanRecovery = 0;
                let finalProfit = profit;
                
                if (profit > 0 && wallet.loan_amount && parseFloat(wallet.loan_amount.toString()) > 0) {
                  const currentLoan = parseFloat(wallet.loan_amount.toString());
                  loanRecovery = Math.min(profit, currentLoan);
                  finalProfit = profit - loanRecovery;
                  
                  const newLoanAmount = currentLoan - loanRecovery;
                  await supabase.from('wallets').update({ loan_amount: newLoanAmount }).eq('user_id', bet.user_id);
                }
                
                const newBalance = parseFloat(wallet.wallet_cash.toString()) + (profit > 0 ? betAmount + finalProfit : 0);
                await supabase.from('wallets').update({ wallet_cash: newBalance }).eq('user_id', bet.user_id);
              }
            }
          }
        }

        broadcast({
          type: 'crash',
          data: {
            crashPoint: gameState.crashPoint,
            roundNumber: gameState.roundNumber,
            serverSeed: gameState.serverSeed,
            serverSeedHash: gameState.serverSeedHash,
            clientSeed: gameState.clientSeed,
            nonce: gameState.roundNumber,
          },
        });

        setTimeout(async () => {
          // Fetch settings for preparing duration
          const { data: nextSettings } = await supabase
            .from('coin_train_settings')
            .select('preparing_duration_seconds')
            .limit(1)
            .maybeSingle();
          
          const preparingDuration = (nextSettings?.preparing_duration_seconds || 10) * 1000;
          
          gameState.status = 'preparing';
          gameState.multiplier = 1.0;
          gameState.crashPoint = 0;
          gameState.prepareEndTime = Date.now() + preparingDuration;
          gameState.roundNumber++;
          
          gameState.serverSeed = generateServerSeed();
          gameState.serverSeedHash = await hashServerSeed(gameState.serverSeed);
          
          const baseCrashPoint = await calculateProvablyFairCrashPoint(
            gameState.serverSeed,
            gameState.clientSeed,
            gameState.roundNumber
          );
          
          const { data: todayStats } = await supabase
            .from('coin_train_stats')
            .select('*')
            .eq('date', new Date().toISOString().split('T')[0])
            .maybeSingle();

          let upcomingCrashPoint = 1.00;
          if (nextSettings?.use_manual_crash_point && nextSettings?.manual_crash_points && nextSettings.manual_crash_points.length > 0) {
            upcomingCrashPoint = nextSettings.manual_crash_points[0];
          } else {
            upcomingCrashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, nextSettings);
          }

          // Create the round for betting during preparing phase
          const { data: roundData } = await supabase
            .from('game_rounds')
            .insert({ round_number: gameState.roundNumber, crash_point: upcomingCrashPoint, status: 'preparing', game_type: 'coin_train' })
            .select()
            .single();

          if (roundData) {
            gameState.roundId = roundData.id;
            console.log('Coin Train round created for betting:', roundData.id);
          }
          
          broadcast({
            type: 'round_prepare',
            data: { 
              serverSeedHash: gameState.serverSeedHash, 
              roundNumber: gameState.roundNumber, 
              clientSeed: gameState.clientSeed,
              roundId: gameState.roundId,
            },
          });
        }, 2000);
      } else {
        broadcast({ type: 'multiplier_update', data: { multiplier: gameState.multiplier, status: 'flying' } });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function broadcast(message: any) {
  const data = JSON.stringify(message);
  clients.forEach((clientData, socket) => {
    if (socket.readyState === 1) {
      try { socket.send(data); } catch (e) { clients.delete(socket); }
    }
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = () => {
    console.log("Coin Train client connected");
    clients.set(socket, { lastPing: Date.now() });
    socket.send(JSON.stringify({ type: 'state', data: gameState }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      if (message.type === 'place_bet') {
        const { userId, amount, autoCashout, roundId, requestId } = message.data;

        // Check bet limits from settings
        const { data: settings } = await supabase
          .from('coin_train_settings')
          .select('min_bet, max_bet')
          .limit(1)
          .maybeSingle();

        const minBet = settings?.min_bet || 10;
        const maxBet = settings?.max_bet || 10000;

        if (amount < minBet || amount > maxBet) {
          socket.send(JSON.stringify({ type: 'bet_error', data: { error: `Bet must be between ${minBet} and ${maxBet}`, requestId } }));
          return;
        }

        const { data: wallet } = await supabase.from('wallets').select('wallet_cash').eq('user_id', userId).single();

        if (!wallet || parseFloat(wallet.wallet_cash.toString()) < amount) {
          socket.send(JSON.stringify({ type: 'bet_error', data: { error: 'Insufficient balance', requestId } }));
          return;
        }

        const newBalance = parseFloat(wallet.wallet_cash.toString()) - amount;
        await supabase.from('wallets').update({ wallet_cash: newBalance }).eq('user_id', userId);

        const { data: bet, error: betError } = await supabase
          .from('bets')
          .insert({ user_id: userId, round_id: roundId, amount, auto_cashout: autoCashout, status: 'active' })
          .select()
          .single();

        if (betError) {
          await supabase.from('wallets').update({ wallet_cash: parseFloat(wallet.wallet_cash.toString()) }).eq('user_id', userId);
          socket.send(JSON.stringify({ type: 'bet_error', data: { error: 'Failed to place bet', requestId } }));
          return;
        }

        // Update coin train stats for wagering
        const today = new Date().toISOString().split('T')[0];
        const { data: existingStats } = await supabase
          .from('coin_train_stats')
          .select('*')
          .eq('date', today)
          .maybeSingle();

        if (existingStats) {
          await supabase
            .from('coin_train_stats')
            .update({ 
              total_wagered: (existingStats.total_wagered || 0) + amount,
              total_bets: (existingStats.total_bets || 0) + 1,
              updated_at: new Date().toISOString()
            })
            .eq('date', today);
        } else {
          await supabase
            .from('coin_train_stats')
            .insert({
              date: today,
              total_wagered: amount,
              total_bets: 1,
              total_paidout: 0,
              current_profit_percent: 0,
            });
        }

        socket.send(JSON.stringify({ type: 'bet_placed', data: { betId: bet.id, requestId } }));
        broadcast({ type: 'new_bet', data: { userId, amount, roundId } });
      }

      if (message.type === 'cashout') {
        const { betId, userId, multiplier, requestId } = message.data;

        const { data: bet } = await supabase.from('bets').select('*').eq('id', betId).single();

        if (!bet || bet.status !== 'active' || bet.cashed_out_at) {
          socket.send(JSON.stringify({ type: 'cashout_error', data: { error: 'Invalid bet or already cashed out', requestId } }));
          return;
        }

        const betAmount = parseFloat(bet.amount.toString());
        const profit = betAmount * (multiplier - 1);
        const totalReturn = betAmount + profit;

        await supabase.from('bets').update({ cashed_out_at: multiplier, profit, status: 'won' }).eq('id', betId);

        const { data: wallet } = await supabase.from('wallets').select('wallet_cash, loan_amount').eq('user_id', userId).single();

        if (wallet) {
          let loanRecovery = 0;
          let finalProfit = profit;
          
          if (wallet.loan_amount && parseFloat(wallet.loan_amount.toString()) > 0) {
            const currentLoan = parseFloat(wallet.loan_amount.toString());
            loanRecovery = Math.min(profit, currentLoan);
            finalProfit = profit - loanRecovery;
            
            const newLoanAmount = currentLoan - loanRecovery;
            await supabase.from('wallets').update({ loan_amount: newLoanAmount }).eq('user_id', userId);
          }
          
          const newBalance = parseFloat(wallet.wallet_cash.toString()) + totalReturn - loanRecovery;
          await supabase.from('wallets').update({ wallet_cash: newBalance }).eq('user_id', userId);

          // Update coin train stats for payout
          const today = new Date().toISOString().split('T')[0];
          const { data: existingStats } = await supabase
            .from('coin_train_stats')
            .select('*')
            .eq('date', today)
            .maybeSingle();

          if (existingStats) {
            const newPaidout = (existingStats.total_paidout || 0) + totalReturn;
            const newWagered = existingStats.total_wagered || 0;
            const profitPercent = newWagered > 0 ? ((newWagered - newPaidout) / newWagered) * 100 : 0;
            
            await supabase
              .from('coin_train_stats')
              .update({ 
                total_paidout: newPaidout,
                current_profit_percent: profitPercent,
                updated_at: new Date().toISOString()
              })
              .eq('date', today);
          }
        }

        socket.send(JSON.stringify({ type: 'cashout_success', data: { profit, multiplier, requestId } }));
        broadcast({ type: 'player_cashout', data: { userId, multiplier, profit } });
      }

      if (message.type === 'ping') {
        clients.set(socket, { lastPing: Date.now() });
        socket.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
      }
    } catch (e) {
      console.error('Error processing message:', e);
    }
  };

  socket.onclose = () => {
    console.log("Coin Train client disconnected");
    clients.delete(socket);
  };

  return response;
});

// Initialize game
(async () => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Ensure coin_train_settings exists with defaults
  const { data: existingSettings } = await supabase
    .from('coin_train_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from('coin_train_settings').insert({
      rtp_percentage: 95,
      house_edge: 5,
      auto_rtp_enabled: true,
      rtp_mode: 'balanced',
      min_bet: 10,
      max_bet: 10000,
      preparing_duration_seconds: 10,
      use_manual_crash_point: false,
      manual_crash_points: [],
    });
    console.log('Coin Train settings initialized with defaults');
  }

  // Fetch preparing duration from settings
  const { data: settings } = await supabase
    .from('coin_train_settings')
    .select('preparing_duration_seconds')
    .limit(1)
    .maybeSingle();

  const preparingDuration = (settings?.preparing_duration_seconds || 10) * 1000;

  gameState.serverSeed = generateServerSeed();
  gameState.serverSeedHash = await hashServerSeed(gameState.serverSeed);
  gameState.roundNumber = 1;
  gameState.prepareEndTime = Date.now() + preparingDuration;
  
  const baseCrashPoint = await calculateProvablyFairCrashPoint(
    gameState.serverSeed,
    gameState.clientSeed,
    gameState.roundNumber
  );
  
  const { data: todayStats } = await supabase
    .from('coin_train_stats')
    .select('*')
    .eq('date', new Date().toISOString().split('T')[0])
    .maybeSingle();

  let initialCrashPoint = 1.00;
  if (settings?.use_manual_crash_point && settings?.manual_crash_points && settings.manual_crash_points.length > 0) {
    initialCrashPoint = settings.manual_crash_points[0];
  } else {
    initialCrashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, settings);
  }

  // Create initial round for betting
  const { data: roundData } = await supabase
    .from('game_rounds')
    .insert({ round_number: gameState.roundNumber, crash_point: initialCrashPoint, status: 'preparing', game_type: 'coin_train' })
    .select()
    .single();

  if (roundData) {
    gameState.roundId = roundData.id;
    console.log('Coin Train initial round created:', roundData.id);
  }
  
  console.log('Coin Train engine initialized');
  gameLoop();
})();