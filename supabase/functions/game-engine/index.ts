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

// MULTI-TENANT: Store a state for each tenant
const tenantStates = new Map<string, GameState>();

// MULTI-TENANT: Store tenantId with each client
const clients = new Map<WebSocket, { lastPing: number, tenantId: string }>();

// Heartbeat interval to keep connections alive
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds

// Clean up stale connections
setInterval(() => {
  const now = Date.now();
  clients.forEach((clientData, socket) => {
    if (now - clientData.lastPing > CLIENT_TIMEOUT) {
      console.log('Removing stale client connection');
      try {
        socket.close();
      } catch (e) {
        console.error('Error closing stale socket:', e);
      }
      clients.delete(socket);
    }
  });
}, 30000);

// Send heartbeat to all clients to keep connections alive
setInterval(() => {
  clients.forEach((_, socket) => {
    if (socket.readyState === 1) { // OPEN
      try {
        socket.send(JSON.stringify({ type: 'heartbeat', data: { timestamp: Date.now() } }));
      } catch (e) {
        console.error('Error sending heartbeat:', e);
        clients.delete(socket);
      }
    }
  });
}, HEARTBEAT_INTERVAL);

// Generate a random 64-character hex string for server seed
function generateServerSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Hash server seed using SHA-256
async function hashServerSeed(serverSeed: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(serverSeed);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Provably Fair crash point calculation
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

// Calculate current multiplier
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

// Apply RTP adjustment
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

// MULTI-TENANT: Broadcast only to clients in the same tenant
function broadcast(tenantId: string, message: any) {
  const data = JSON.stringify(message);
  clients.forEach((clientData, socket) => {
    if (socket.readyState === 1 && clientData.tenantId === tenantId) {
      try {
        socket.send(data);
      } catch (e) {
        console.error(`Error broadcasting to client in tenant ${tenantId}:`, e);
        clients.delete(socket);
      }
    }
  });
}

// MULTI-TENANT: Game loop instance per tenant
async function gameLoop(tenantId: string) {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Get reference to this tenant's state
  const gameState = tenantStates.get(tenantId)!;
  console.log(`[Tenant: ${tenantId}] Starting Game Loop`);

  while (true) {
    const now = Date.now();

    if (gameState.status === 'preparing') {
      if (now >= gameState.prepareEndTime) {
        // Fetch current stats and settings for RTP calculation (TENANT SCOPED)
        const { data: todayStats } = await supabase
          .from('game_stats')
          .select('*')
          .eq('date', new Date().toISOString().split('T')[0])
          .eq('tenant_id', tenantId)
          .maybeSingle();
        
        const { data: settings } = await supabase
          .from('game_settings')
          .select('*')
          .eq('tenant_id', tenantId)
          .limit(1)
          .maybeSingle();
        
        // Start new round
        gameState.status = 'flying';
        gameState.multiplier = 1.0;
        
        // Calculate base crash point
        const baseCrashPoint = await calculateProvablyFairCrashPoint(
          gameState.serverSeed,
          gameState.clientSeed,
          gameState.roundNumber + 1
        );
        
        // Check manual crash point
        if (settings?.use_manual_crash_point && settings?.manual_crash_points && settings.manual_crash_points.length > 0) {
          gameState.crashPoint = settings.manual_crash_points[0];
          console.log(`[Tenant: ${tenantId}] 🎯 Using manual crash point: ${gameState.crashPoint}x`);
          const remainingPoints = settings.manual_crash_points.slice(1);
          await supabase
            .from('game_settings')
            .update({
              manual_crash_points: remainingPoints,
              use_manual_crash_point: remainingPoints.length > 0
            })
            .eq('id', settings.id);
        } else {
          gameState.crashPoint = applyRTPAdjustment(baseCrashPoint, todayStats, settings);
        }
        
        gameState.startTime = now;
        gameState.roundNumber++;

        // Update existing round to running (it was created in preparing phase)
        if (gameState.roundId) {
          await supabase
            .from('game_rounds')
            .update({
              status: 'running'
            })
            .eq('id', gameState.roundId);
        } else {
          // Fallback if round was not created during preparing
          const { data: roundData } = await supabase
            .from('game_rounds')
            .insert({
              round_number: gameState.roundNumber,
              crash_point: gameState.crashPoint,
              status: 'running',
              tenant_id: tenantId,
            })
            .select()
            .single();
          if (roundData) gameState.roundId = roundData.id;
        }

        if (roundError) {
          console.error(`[Tenant: ${tenantId}] Error creating round:`, roundError);
        } else if (roundData) {
          gameState.roundId = roundData.id;
        }

        // Broadcast round start
        broadcast(tenantId, {
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
        broadcast(tenantId, {
          type: 'preparing',
          data: {
            timeLeft,
            serverSeedHash: gameState.serverSeedHash,
            roundNumber: gameState.roundNumber + 1,
            clientSeed: gameState.clientSeed,
          },
        });
      }
    } else if (gameState.status === 'flying') {
      const elapsedSeconds = (now - gameState.startTime) / 1000;
      const currentMultiplier = calculateMultiplier(elapsedSeconds);
      
      if (Math.abs(currentMultiplier - gameState.multiplier) >= 0.01) {
        gameState.multiplier = currentMultiplier;
        broadcast(tenantId, {
          type: 'multiplier_update',
          data: { multiplier: currentMultiplier, timestamp: now },
        });
      }

      // Check if crashed
      if (currentMultiplier >= gameState.crashPoint) {
        gameState.status = 'crashed';
        gameState.multiplier = gameState.crashPoint;

        if (gameState.roundId) {
          await supabase
            .from('game_rounds')
            .update({ status: 'crashed', crashed_at: new Date().toISOString() })
            .eq('id', gameState.roundId);
        }

        // Process all active bets for this round
        if (gameState.roundId) {
          const { data: activeBets } = await supabase
            .from('bets')
            .select('*')
            .eq('round_id', gameState.roundId)
            .eq('status', 'active');

          if (activeBets && activeBets.length > 0) {
            for (const bet of activeBets) {
              const betAmount = parseFloat(bet.amount.toString());
              const profit = bet.cashed_out_at
                ? betAmount * (parseFloat(bet.cashed_out_at.toString()) - 1)
                : -betAmount;

              await supabase.from('bets').update({ status: profit > 0 ? 'won' : 'lost', profit }).eq('id', bet.id);

              const { data: wallet } = await supabase
                .from('wallets')
                .select('wallet_cash, loan_amount')
                .eq('user_id', bet.user_id)
                .eq('tenant_id', tenantId) // TENANT SCOPED
                .single();

              if (wallet) {
                let loanRecovery = 0;
                let finalProfit = profit;
                
                if (profit > 0 && wallet.loan_amount && parseFloat(wallet.loan_amount.toString()) > 0) {
                  const currentLoan = parseFloat(wallet.loan_amount.toString());
                  loanRecovery = Math.min(profit, currentLoan);
                  finalProfit = profit - loanRecovery;
                  
                  const newLoanAmount = currentLoan - loanRecovery;
                  await supabase.from('wallets').update({ loan_amount: newLoanAmount }).eq('user_id', bet.user_id).eq('tenant_id', tenantId);
                  
                  if (loanRecovery > 0) {
                    await supabase
                      .from('loan_transactions')
                      .update({ 
                        recovery_amount: supabase.rpc('increment', { x: loanRecovery }),
                        status: newLoanAmount === 0 ? 'recovered' : 'active',
                        recovered_at: newLoanAmount === 0 ? new Date().toISOString() : null
                      })
                      .eq('user_id', bet.user_id)
                      .eq('status', 'active');
                  }
                }
                
                const newBalance = parseFloat(wallet.wallet_cash.toString()) + (profit > 0 ? betAmount + finalProfit : 0);
                await supabase.from('wallets').update({ wallet_cash: newBalance }).eq('user_id', bet.user_id).eq('tenant_id', tenantId);
              }
            }
          }
        }

        broadcast(tenantId, {
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

        // Generate new round
        setTimeout(async () => {
          gameState.status = 'preparing';
          gameState.multiplier = 1.0;
          gameState.crashPoint = 0;
          gameState.prepareEndTime = Date.now() + 8000;
          gameState.serverSeed = generateServerSeed();
          gameState.serverSeedHash = await hashServerSeed(gameState.serverSeed);
          
          // Pre-calculate next crash point for marketer visibility
          const nextBaseCrashPoint = await calculateProvablyFairCrashPoint(
            gameState.serverSeed,
            gameState.clientSeed,
            gameState.roundNumber + 1
          );
          
          const { data: nextTodayStats } = await supabase
            .from('game_stats')
            .select('*')
            .eq('date', new Date().toISOString().split('T')[0])
            .eq('tenant_id', tenantId)
            .maybeSingle();
            
          const { data: nextSettings } = await supabase
            .from('game_settings')
            .select('*')
            .eq('tenant_id', tenantId)
            .limit(1)
            .maybeSingle();

          let nextCrashPoint = 1.00;
          if (nextSettings?.use_manual_crash_point && nextSettings?.manual_crash_points && nextSettings.manual_crash_points.length > 0) {
            nextCrashPoint = nextSettings.manual_crash_points[0];
          } else {
            nextCrashPoint = applyRTPAdjustment(nextBaseCrashPoint, nextTodayStats, nextSettings);
          }

          // Insert preparing round so marketer can see it
          const { data: prepRound } = await supabase
            .from('game_rounds')
            .insert({
              round_number: gameState.roundNumber + 1,
              crash_point: nextCrashPoint,
              status: 'preparing',
              tenant_id: tenantId,
              game_type: 'aviator'
            })
            .select()
            .single();

          if (prepRound) {
            gameState.roundId = prepRound.id;
          }
          
          broadcast(tenantId, {
            type: 'round_prepare',
            data: {
              serverSeedHash: gameState.serverSeedHash,
              roundNumber: gameState.roundNumber + 1,
              clientSeed: gameState.clientSeed,
              roundId: gameState.roundId
            },
          });
        }, 2000);
      } else {
        broadcast(tenantId, {
          type: 'multiplier_update',
          data: { multiplier: gameState.multiplier, status: 'flying' },
        });
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// MULTI-TENANT: Helper to initialize a tenant's game loop
async function getOrCreateTenantState(tenantId: string): Promise<GameState> {
  if (!tenantStates.has(tenantId)) {
    const newState: GameState = {
      status: 'preparing',
      multiplier: 1.0,
      crashPoint: 0,
      roundNumber: 0,
      roundId: null,
      startTime: Date.now(),
      prepareEndTime: Date.now() + 8000,
      serverSeed: generateServerSeed(),
      serverSeedHash: '', // Will be calculated
      clientSeed: 'public-client-seed-v1',
    };
    newState.serverSeedHash = await hashServerSeed(newState.serverSeed);
    tenantStates.set(tenantId, newState);
    
    // Spawn the game loop for this tenant
    gameLoop(tenantId).catch(err => {
      console.error(`[Tenant: ${tenantId}] Game loop error:`, err);
    });
  }
  return tenantStates.get(tenantId)!;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400, headers: corsHeaders });
  }

  // MULTI-TENANT: Extract tenant ID from URL
  const url = new URL(req.url);
  const tenantId = url.searchParams.get('tenant');
  
  if (!tenantId) {
    return new Response("Missing tenant parameter", { status: 400, headers: corsHeaders });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);

  socket.onopen = async () => {
    console.log(`[Tenant: ${tenantId}] Client connected`);
    clients.set(socket, { lastPing: Date.now(), tenantId });
    
    // Initialize loop if it doesn't exist
    const state = await getOrCreateTenantState(tenantId);
    
    socket.send(JSON.stringify({ type: 'state', data: state }));
  };

  socket.onmessage = async (event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data);
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Verify the tenant state exists for this request
      const gameState = tenantStates.get(tenantId);
      if (!gameState) return;

      if (message.type === 'place_bet') {
        const { userId, amount, autoCashout, roundId, requestId } = message.data;

        // TENANT SCOPED wallet check
        const { data: wallet } = await supabase
          .from('wallets')
          .select('wallet_cash, wager_required, wager_completed')
          .eq('user_id', userId)
          .eq('tenant_id', tenantId)
          .single();

        if (wallet && parseFloat(wallet.wallet_cash) >= amount) {
          await supabase
            .from('wallets')
            .update({ wallet_cash: parseFloat(wallet.wallet_cash) - amount })
            .eq('user_id', userId)
            .eq('tenant_id', tenantId);

          const { data: betData, error: betError } = await supabase
            .from('bets')
            .insert({
              user_id: userId,
              round_id: roundId,
              amount,
              auto_cashout: autoCashout,
              status: 'active',
              tenant_id: tenantId, // TENANT SCOPED
            })
            .select()
            .single();

          if (betError) {
            socket.send(JSON.stringify({ type: 'error', data: { message: 'Failed to create bet' } }));
            return;
          }

          if (wallet.wager_required > 0) {
            const newWagerCompleted = Math.min(wallet.wager_completed + amount, wallet.wager_required);
            await supabase
              .from('wallets')
              .update({ wager_completed: newWagerCompleted })
              .eq('user_id', userId)
              .eq('tenant_id', tenantId);
          }

          const { data: referralData } = await supabase.from('referrals').select('referrer_id').eq('referred_user_id', userId).eq('status', 'completed').single();

          if (referralData) {
            const { data: settings } = await supabase.from('game_settings').select('referral_bet_commission_percent').eq('tenant_id', tenantId).single();

            if (settings && settings.referral_bet_commission_percent > 0) {
              const commissionAmount = amount * (settings.referral_bet_commission_percent / 100);
              const { data: referrerWallet } = await supabase.from('wallets').select('wallet_cash').eq('user_id', referralData.referrer_id).eq('tenant_id', tenantId).single();

              if (referrerWallet) {
                const newReferrerBalance = parseFloat(referrerWallet.wallet_cash.toString()) + commissionAmount;
                await supabase.from('wallets').update({ wallet_cash: newReferrerBalance }).eq('user_id', referralData.referrer_id).eq('tenant_id', tenantId);
                await supabase.from('commission_transactions').insert({
                  referrer_id: referralData.referrer_id,
                  referred_user_id: userId,
                  commission_type: 'bet_commission',
                  amount: commissionAmount,
                  reference_id: betData.id
                });
              }
            }
          }

          socket.send(JSON.stringify({ type: 'bet_placed', data: { success: true, betId: betData.id, requestId } }));
        } else {
          socket.send(JSON.stringify({ type: 'error', data: { message: 'Insufficient balance' } }));
        }
      } else if (message.type === 'cashout') {
        const { betId, userId } = message.data;

        const { data: bet, error: betError } = await supabase.from('bets').select('*').eq('id', betId).eq('user_id', userId).single();

        if (betError || !bet) {
          socket.send(JSON.stringify({ type: 'cashout_result', data: { success: false, error: 'Bet not found' } }));
          return;
        }

        if (bet.status !== 'active') {
          socket.send(JSON.stringify({ type: 'cashout_result', data: { success: false, error: `Bet is ${bet.status}` } }));
          return;
        }

        if (gameState.status !== 'flying') {
          socket.send(JSON.stringify({ type: 'cashout_result', data: { success: false, error: 'Game is not flying' } }));
          return;
        }

        const betAmount = parseFloat(bet.amount.toString());
        const profit = betAmount * (gameState.multiplier - 1);

        const { error: updateError } = await supabase.from('bets').update({ cashed_out_at: gameState.multiplier, status: 'won', profit: profit }).eq('id', betId);

        if (updateError) {
          socket.send(JSON.stringify({ type: 'cashout_result', data: { success: false, error: 'Failed to update bet' } }));
          return;
        }

        const { data: wallet, error: walletError } = await supabase.from('wallets').select('wallet_cash, loan_amount').eq('user_id', userId).eq('tenant_id', tenantId).single();

        if (walletError || !wallet) {
          socket.send(JSON.stringify({ type: 'cashout_result', data: { success: false, error: 'Wallet not found' } }));
          return;
        }

        let loanRecovery = 0;
        let finalProfit = profit;
        if (wallet.loan_amount && parseFloat(wallet.loan_amount.toString()) > 0) {
          const currentLoan = parseFloat(wallet.loan_amount.toString());
          loanRecovery = Math.min(profit, currentLoan);
          finalProfit = profit - loanRecovery;
          
          const newLoanAmount = currentLoan - loanRecovery;
          await supabase.from('wallets').update({ loan_amount: newLoanAmount }).eq('user_id', userId).eq('tenant_id', tenantId);
          
          if (loanRecovery > 0) {
            await supabase.from('loan_transactions').update({ 
                recovery_amount: supabase.rpc('increment', { x: loanRecovery }),
                status: newLoanAmount === 0 ? 'recovered' : 'active',
                recovered_at: newLoanAmount === 0 ? new Date().toISOString() : null
              }).eq('user_id', userId).eq('status', 'active');
          }
        }

        const newBalance = parseFloat(wallet.wallet_cash.toString()) + betAmount + finalProfit;
        await supabase.from('wallets').update({ wallet_cash: newBalance }).eq('user_id', userId).eq('tenant_id', tenantId);

        socket.send(JSON.stringify({ type: 'cashout_result', data: { success: true, multiplier: gameState.multiplier, profit: profit } }));
      } else if (message.type === 'ping') {
        const clientData = clients.get(socket);
        if (clientData) clientData.lastPing = Date.now();
        socket.send(JSON.stringify({ type: 'pong', data: {} }));
      }
    } catch (error) {
      console.error("Error handling message:", error);
    }
  };

  socket.onclose = () => clients.delete(socket);
  socket.onerror = (error: Event | ErrorEvent) => { console.error('WebSocket error:', error); clients.delete(socket); };

  return response;
});