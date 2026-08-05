import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-game-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const gameSecret = Deno.env.get('EXTERNAL_GAME_SECRET');

    // Verify game secret for security
    const requestGameSecret = req.headers.get('x-game-secret');
    if (gameSecret && requestGameSecret !== gameSecret) {
      console.error('Invalid game secret');
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, amount, gameType = 'chicken_road' } = await req.json();

    console.log(`External game wallet action: ${action}, userId: ${userId}, amount: ${amount}, gameType: ${gameType}`);

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: userId, action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      console.error('Wallet not found:', walletError);
      return new Response(
        JSON.stringify({ success: false, error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let newBalance = wallet.wallet_cash;
    let newBonusBalance = wallet.wallet_bonus;

    switch (action) {
      case 'get_balance':
        // Just return current balance
        return new Response(
          JSON.stringify({ 
            success: true, 
            balance: wallet.wallet_cash,
            bonus_balance: wallet.wallet_bonus,
            total_balance: wallet.wallet_cash + wallet.wallet_bonus
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'deduct':
        // Deduct bet amount (use bonus first, then cash)
        const deductAmount = parseFloat(amount);
        if (isNaN(deductAmount) || deductAmount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const totalAvailable = wallet.wallet_cash + wallet.wallet_bonus;
        if (totalAvailable < deductAmount) {
          return new Response(
            JSON.stringify({ success: false, error: 'Insufficient balance' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Deduct from bonus first, then cash
        if (wallet.wallet_bonus >= deductAmount) {
          newBonusBalance = wallet.wallet_bonus - deductAmount;
        } else {
          const remainingDeduct = deductAmount - wallet.wallet_bonus;
          newBonusBalance = 0;
          newBalance = wallet.wallet_cash - remainingDeduct;
        }
        break;

      case 'credit':
        // Credit winnings to cash balance
        const creditAmount = parseFloat(amount);
        if (isNaN(creditAmount) || creditAmount <= 0) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid amount' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        newBalance = wallet.wallet_cash + creditAmount;
        break;

      default:
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid action. Use: get_balance, deduct, credit' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Update wallet
    const { error: updateError } = await supabase
      .from('wallets')
      .update({
        wallet_cash: newBalance,
        wallet_bonus: newBonusBalance,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error('Failed to update wallet:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update wallet' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Wallet updated successfully for user ${userId}. New balance: ${newBalance}, Bonus: ${newBonusBalance}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        balance: newBalance,
        bonus_balance: newBonusBalance,
        total_balance: newBalance + newBonusBalance,
        action,
        amount: parseFloat(amount)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('External game wallet error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
