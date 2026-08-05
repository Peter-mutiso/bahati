import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MULTIPLIERS = {
  low: {
    8: [5.6, 2.1, 1.1, 1, 0.5, 1, 1.1, 2.1, 5.6],
    12: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
    16: [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  },
  medium: {
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13],
    12: [18, 4, 1.7, 0.9, 0.5, 0.3, 0.2, 0.3, 0.5, 0.9, 1.7, 4, 18],
    16: [43, 7, 2, 1, 0.6, 0.4, 0.3, 0.2, 0.2, 0.2, 0.3, 0.4, 0.6, 1, 2, 7, 43],
  },
  high: {
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29],
    12: [76, 10, 3, 0.9, 0.3, 0.2, 0.2, 0.2, 0.3, 0.9, 3, 10, 76],
    16: [170, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 170],
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { user_id, amount, rows, risk } = await req.json();

    if (!user_id || !amount || !rows || !risk) {
      throw new Error("Missing required parameters");
    }

    // Get wallet
    const { data: wallet, error: walletError } = await supabaseClient
      .from("wallets")
      .select("*")
      .eq("user_id", user_id)
      .single();

    if (walletError || !wallet) {
      throw new Error("Wallet not found");
    }

    const totalBalance = wallet.wallet_cash + wallet.wallet_bonus;
    if (totalBalance < amount) {
      throw new Error("Insufficient balance");
    }

    // Get settings
    const { data: settings } = await supabaseClient
      .from("plinko_settings")
      .select("*")
      .single();

    if (!settings) {
      throw new Error("Settings not found");
    }

    if (amount < settings.min_bet || amount > settings.max_bet) {
      throw new Error(`Bet must be between ${settings.min_bet} and ${settings.max_bet}`);
    }

    // Generate provably fair result
    const serverSeed = crypto.randomUUID();
    const clientSeed = crypto.randomUUID();
    const nonce = Date.now();

    // Calculate result slot using provably fair algorithm
    const hashInput = `${serverSeed}:${clientSeed}:${nonce}`;
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(hashInput)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    
    const multipliers = MULTIPLIERS[risk as keyof typeof MULTIPLIERS][rows as keyof typeof MULTIPLIERS.low];
    const resultSlot = parseInt(hashHex.substring(0, 8), 16) % multipliers.length;
    const multiplier = multipliers[resultSlot];

    // Apply RTP adjustment if enabled
    let adjustedMultiplier = multiplier;
    if (settings.auto_rtp_enabled) {
      const { data: todayStats } = await supabaseClient
        .from("plinko_stats")
        .select("*")
        .eq("date", new Date().toISOString().split('T')[0])
        .single();

      if (todayStats && todayStats.total_wagered > 0) {
        const currentRTP = (todayStats.total_paidout / todayStats.total_wagered) * 100;
        const targetRTP = settings.rtp_percentage;

        if (currentRTP < targetRTP - 2) {
          adjustedMultiplier = Math.min(multiplier * 1.1, multipliers[multipliers.length - 1]);
        } else if (currentRTP > targetRTP + 2) {
          adjustedMultiplier = Math.max(multiplier * 0.9, multipliers[0]);
        }
      }
    }

    const profit = amount * adjustedMultiplier - amount;

    // Deduct bet amount
    let updatedCash = wallet.wallet_cash;
    let updatedBonus = wallet.wallet_bonus;

    if (wallet.wallet_cash >= amount) {
      updatedCash -= amount;
    } else {
      const remainingAmount = amount - wallet.wallet_cash;
      updatedCash = 0;
      updatedBonus -= remainingAmount;
    }

    // Add winnings to cash wallet
    if (profit > 0) {
      updatedCash += amount + profit;
    }

    // Update wallet
    const { error: updateError } = await supabaseClient
      .from("wallets")
      .update({
        wallet_cash: updatedCash,
        wallet_bonus: updatedBonus,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user_id);

    if (updateError) {
      throw new Error("Failed to update wallet");
    }

    // Record bet
    const { error: betError } = await supabaseClient
      .from("plinko_bets")
      .insert({
        user_id,
        amount,
        rows,
        risk,
        result_slot: resultSlot,
        multiplier: adjustedMultiplier,
        profit,
        server_seed: serverSeed,
        client_seed: clientSeed,
        nonce,
      });

    if (betError) {
      throw new Error("Failed to record bet");
    }

    return new Response(
      JSON.stringify({
        result_slot: resultSlot,
        multiplier: adjustedMultiplier,
        profit,
        new_balance: updatedCash + updatedBonus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
