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
  clientSeed: 'aviator-red-seed-v1',
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

function broadcast(message: object) {
  const msgString = JSON.stringify(message);
  clients.forEach((_, socket) => {
    if (socket.readyState === 1) {
      try {
        socket.send(msgString);
      } catch (e) {
        clients.delete(socket);
      }
    }
  });
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
          .from('aviator_stats')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
          .maybeSingle();
        
        const { data: settings } = await supabase
          .from('aviator_settings')
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
          gameState.crashPoint = settings.manual_crash_points[0];
          console.log('Aviator using manual crash point:', gameState.crashPoint);
        } else {
          gameState.crashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, settings);
        }
        
        gameState.startTime = now;

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
            clientSeed: gameState.clientSeed, 
            roundNumber: gameState.roundNumber,
            roundId: gameState.roundId,
          },
        });
      }
    }

    if (gameState.status === 'flying') {
      const elapsed = (now - gameState.startTime) / 1000;
      gameState.multiplier = calculateMultiplier(elapsed);

      if (gameState.multiplier >= gameState.crashPoint) {
        gameState.status = 'crashed';
        gameState.multiplier = gameState.crashPoint;

        if (gameState.roundId) {
          await supabase
            .from('game_rounds')
            .update({ status: 'crashed', crashed_at: new Date().toISOString() })
            .eq('id', gameState.roundId);

          await supabase
            .from('bets')
            .update({ status: 'lost' })
            .eq('round_id', gameState.roundId)
            .eq('status', 'active');
        }

        broadcast({
          type: 'crash',
          data: {
            crashPoint: gameState.crashPoint,
            serverSeed: gameState.serverSeed,
            serverSeedHash: gameState.serverSeedHash,
            clientSeed: gameState.clientSeed,
            nonce: gameState.roundNumber,
          },
        });

        setTimeout(async () => {
          gameState.roundNumber++;
          gameState.serverSeed = generateServerSeed();
          gameState.serverSeedHash = await hashServerSeed(gameState.serverSeed);
          
          const { data: settings } = await supabase
            .from('aviator_settings')
            .select('preparing_duration_seconds')
            .limit(1)
            .maybeSingle();
          
          const preparingDuration = (settings?.preparing_duration_seconds || 8) * 1000;
          
          const baseCrashPoint = await calculateProvablyFairCrashPoint(
            gameState.serverSeed,
            gameState.clientSeed,
            gameState.roundNumber
          );
          
          const { data: todayStats } = await supabase
            .from('aviator_stats')
            .select('*')
            .eq('date', new Date().toISOString().split('T')[0])
            .maybeSingle();
            
          const { data: currentSettings } = await supabase
            .from('aviator_settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          let upcomingCrashPoint = 1.00;
          if (currentSettings?.use_manual_crash_point && currentSettings?.manual_crash_points && currentSettings.manual_crash_points.length > 0) {
            upcomingCrashPoint = currentSettings.manual_crash_points[0];
          } else {
            upcomingCrashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, currentSettings);
          }

          const { data: round, error: roundError } = await supabase
            .from('game_rounds')
            .insert({
              round_number: gameState.roundNumber,
              crash_point: upcomingCrashPoint,
              status: 'preparing',
              game_type: 'aviator',
            })
            .select()
            .single();

          if (roundError) {
            console.error('Error creating aviator round:', roundError);
          }

          gameState.status = 'preparing';
          gameState.multiplier = 1.0;
          gameState.crashPoint = 0;
          gameState.prepareEndTime = Date.now() + preparingDuration;
          gameState.roundId = round?.id || null;

          broadcast({
            type: 'round_prepare',
            data: {
              roundNumber: gameState.roundNumber,
              roundId: gameState.roundId,
              serverSeedHash: gameState.serverSeedHash,
              clientSeed: gameState.clientSeed,
            },
          });
        }, 3000);
      } else {
        broadcast({
          type: 'multiplier_update',
          data: { multiplier: parseFloat(gameState.multiplier.toFixed(2)) },
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

async function initializeGame() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  gameState.roundNumber = 1;
  gameState.serverSeed = generateServerSeed();
  gameState.serverSeedHash = await hashServerSeed(gameState.serverSeed);

  const { data: settings } = await supabase
    .from('aviator_settings')
    .select('preparing_duration_seconds')
    .limit(1)
    .maybeSingle();
  
  const preparingDuration = (settings?.preparing_duration_seconds || 8) * 1000;

  const baseCrashPoint = await calculateProvablyFairCrashPoint(
    gameState.serverSeed,
    gameState.clientSeed,
    gameState.roundNumber
  );
  
  const { data: todayStats } = await supabase
    .from('aviator_stats')
    .select('*')
    .eq('date', new Date().toISOString().split('T')[0])
    .maybeSingle();

  let initialCrashPoint = 1.00;
  if (settings?.use_manual_crash_point && settings?.manual_crash_points && settings.manual_crash_points.length > 0) {
    initialCrashPoint = settings.manual_crash_points[0];
  } else {
    initialCrashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, settings);
  }

  const { data: round, error } = await supabase
    .from('game_rounds')
    .insert({
      round_number: gameState.roundNumber,
      crash_point: initialCrashPoint,
      status: 'preparing',
      game_type: 'aviator',
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating initial aviator round:', error);
  } else {
    gameState.roundId = round.id;
  }

  gameState.prepareEndTime = Date.now() + preparingDuration;

  console.log('Aviator Red game initialized, starting game loop...');
  gameLoop();
}

initializeGame();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get('upgrade') || '';
  
  if (upgrade.toLowerCase() === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    socket.onopen = () => {
      console.log('Aviator client connected');
      clients.set(socket, { lastPing: Date.now() });
      
      socket.send(JSON.stringify({
        type: 'state',
        data: {
          status: gameState.status,
          multiplier: gameState.multiplier,
          roundNumber: gameState.roundNumber,
          roundId: gameState.roundId,
          serverSeedHash: gameState.serverSeedHash,
          clientSeed: gameState.clientSeed,
          timeLeft: Math.ceil((gameState.prepareEndTime - Date.now()) / 1000),
        },
      }));
    };

    socket.onmessage = async (event) => {
      const clientData = clients.get(socket);
      if (clientData) {
        clientData.lastPing = Date.now();
      }

      try {
        const message = JSON.parse(event.data);
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        switch (message.type) {
          case 'ping':
            socket.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
            break;

          case 'place_bet': {
            const { userId, amount, autoCashout, roundId, requestId } = message.data;
            
            if (gameState.status !== 'preparing') {
              socket.send(JSON.stringify({ 
                type: 'bet_error', 
                data: { error: 'Betting closed', requestId } 
              }));
              break;
            }

            const { data: wallet } = await supabase
              .from('wallets')
              .select('wallet_cash, wallet_bonus')
              .eq('user_id', userId)
              .single();

            if (!wallet || (wallet.wallet_cash + wallet.wallet_bonus) < amount) {
              socket.send(JSON.stringify({ 
                type: 'bet_error', 
                data: { error: 'Insufficient balance', requestId } 
              }));
              break;
            }

            const useBonus = wallet.wallet_cash < amount;
            const newCash = useBonus ? wallet.wallet_cash : wallet.wallet_cash - amount;
            const newBonus = useBonus ? wallet.wallet_bonus - (amount - wallet.wallet_cash) : wallet.wallet_bonus;

            await supabase
              .from('wallets')
              .update({ 
                wallet_cash: useBonus ? 0 : newCash, 
                wallet_bonus: useBonus ? newBonus : wallet.wallet_bonus 
              })
              .eq('user_id', userId);

            const { data: bet, error: betError } = await supabase
              .from('bets')
              .insert({
                user_id: userId,
                round_id: roundId,
                amount,
                auto_cashout: autoCashout,
                status: 'active',
              })
              .select()
              .single();

            if (betError) {
              console.error('Error placing aviator bet:', betError);
              socket.send(JSON.stringify({ 
                type: 'bet_error', 
                data: { error: 'Failed to place bet', requestId } 
              }));
            } else {
              socket.send(JSON.stringify({ 
                type: 'bet_placed', 
                data: { betId: bet.id, requestId } 
              }));
            }
            break;
          }

          case 'cashout': {
            const { betId, userId, multiplier, requestId } = message.data;

            if (gameState.status !== 'flying') {
              socket.send(JSON.stringify({ 
                type: 'cashout_error', 
                data: { error: 'Cannot cashout now', requestId } 
              }));
              break;
            }

            const { data: bet } = await supabase
              .from('bets')
              .select('*')
              .eq('id', betId)
              .eq('user_id', userId)
              .eq('status', 'active')
              .single();

            if (!bet) {
              socket.send(JSON.stringify({ 
                type: 'cashout_error', 
                data: { error: 'Bet not found or already cashed out', requestId } 
              }));
              break;
            }

            const currentMultiplier = Math.min(multiplier, gameState.multiplier);
            const profit = bet.amount * (currentMultiplier - 1);
            const totalReturn = bet.amount + profit;

            await supabase
              .from('bets')
              .update({
                status: 'won',
                cashed_out_at: currentMultiplier,
                profit: profit,
              })
              .eq('id', betId);

            const { data: wallet } = await supabase
              .from('wallets')
              .select('wallet_cash')
              .eq('user_id', userId)
              .single();

            await supabase
              .from('wallets')
              .update({ wallet_cash: wallet!.wallet_cash + totalReturn })
              .eq('user_id', userId);

            socket.send(JSON.stringify({
              type: 'cashout_success',
              data: { profit, multiplier: currentMultiplier, requestId },
            }));
            break;
          }
        }
      } catch (e) {
        console.error('Error handling aviator message:', e);
      }
    };

    socket.onclose = () => {
      console.log('Aviator client disconnected');
      clients.delete(socket);
    };

    socket.onerror = (e) => {
      console.error('Aviator WebSocket error:', e);
      clients.delete(socket);
    };

    return response;
  }

  return new Response(JSON.stringify({ 
    status: 'Aviator Red Engine Running',
    clients: clients.size,
    gameState: {
      status: gameState.status,
      roundNumber: gameState.roundNumber,
      multiplier: gameState.multiplier,
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});