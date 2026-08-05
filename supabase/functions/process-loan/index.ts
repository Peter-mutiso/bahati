import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get wallet details
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check eligibility
    if (!wallet.loan_eligible) {
      return new Response(
        JSON.stringify({ error: 'Not eligible for loan. Make a deposit first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (wallet.loan_amount > 0) {
      return new Response(
        JSON.stringify({ error: 'You already have an active loan' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const loanAmount = wallet.last_deposit_amount;

    if (!loanAmount || loanAmount <= 0) {
      return new Response(
        JSON.stringify({ error: 'No previous deposit found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update wallet with loan
    const newBalance = parseFloat(wallet.wallet_cash) + loanAmount;
    await supabase
      .from('wallets')
      .update({ 
        wallet_cash: newBalance,
        loan_amount: loanAmount,
        loan_taken_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    // Create loan transaction record
    await supabase
      .from('loan_transactions')
      .insert({
        user_id: userId,
        loan_amount: loanAmount,
        status: 'active'
      });

    // Create wallet transaction for tracking
    await supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        transaction_type: 'credit',
        wallet_type: 'cash',
        amount: loanAmount,
        balance_before_cash: wallet.wallet_cash,
        balance_after_cash: newBalance,
        balance_before_bonus: wallet.wallet_bonus,
        balance_after_bonus: wallet.wallet_bonus,
        description: 'Loan credit'
      });

    console.log(`Loan of ${loanAmount} granted to user ${userId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        loanAmount,
        message: `Loan of ${loanAmount} granted successfully`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing loan:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
