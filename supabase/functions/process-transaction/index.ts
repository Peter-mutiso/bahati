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

    const { transactionId, status, adminNotes } = await req.json();

    if (!transactionId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get transaction details
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update transaction status
    await supabase
      .from('transactions')
      .update({ 
        status, 
        admin_notes: adminNotes 
      })
      .eq('id', transactionId);

    if (status === 'completed' && transaction.type === 'deposit') {
      const userId = transaction.user_id;
      const depositAmount = parseFloat(transaction.amount);

      // Check if this is first deposit
      const { data: wallet } = await supabase
        .from('wallets')
        .select('first_deposit_received, wallet_cash, loan_amount, loan_eligible, last_deposit_amount')
        .eq('user_id', userId)
        .single();

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const isFirstDeposit = !wallet.first_deposit_received;
      let bonusAmount = 0;
      let wagerRequired = 0;

      // Get settings
      const { data: settings } = await supabase
        .from('game_settings')
        .select('first_deposit_bonus_percent, first_deposit_bonus_fixed_amount, wager_requirement_multiplier, referral_first_deposit_commission_percent')
        .single();

      if (!settings) {
        throw new Error('Settings not found');
      }

      // Calculate bonus for first deposit
      if (isFirstDeposit) {
        if (settings.first_deposit_bonus_fixed_amount) {
          bonusAmount = parseFloat(settings.first_deposit_bonus_fixed_amount);
        } else {
          bonusAmount = depositAmount * (settings.first_deposit_bonus_percent / 100);
        }
        wagerRequired = bonusAmount * settings.wager_requirement_multiplier;
      }

      // Handle loan recovery
      let loanRecoveryAmount = 0;
      let remainingDeposit = depositAmount;
      if (wallet.loan_amount > 0) {
        loanRecoveryAmount = Math.min(wallet.loan_amount, depositAmount);
        remainingDeposit = depositAmount - loanRecoveryAmount;
        
        // Update loan transaction
        await supabase
          .from('loan_transactions')
          .update({ 
            recovery_amount: loanRecoveryAmount,
            status: loanRecoveryAmount >= wallet.loan_amount ? 'recovered' : 'active',
            recovered_at: loanRecoveryAmount >= wallet.loan_amount ? new Date().toISOString() : null
          })
          .eq('user_id', userId)
          .eq('status', 'active');
      }

      // Update wallet with deposit + bonus - loan recovery
      const newBalance = parseFloat(wallet.wallet_cash) + remainingDeposit + bonusAmount;
      const newLoanAmount = Math.max(0, wallet.loan_amount - loanRecoveryAmount);
      
      await supabase
        .from('wallets')
        .update({ 
          wallet_cash: newBalance,
          first_deposit_received: true,
          wager_required: isFirstDeposit ? wagerRequired : 0,
          wager_completed: 0,
          loan_amount: newLoanAmount,
          loan_eligible: true,
          last_deposit_amount: depositAmount
        })
        .eq('user_id', userId);

      // Update profile total deposited for VIP tier
      await supabase.rpc('update_profile_total_deposited', {
        p_user_id: userId,
        p_amount: depositAmount
      });

      // Handle referral first deposit commission
      if (isFirstDeposit) {
        console.log(`Checking for referral commission for user: ${userId}`);
        
        const { data: referralData, error: referralError } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('referred_user_id', userId)
          .eq('status', 'completed')
          .single();

        if (referralError) {
          console.log(`No referral found for user ${userId}: ${referralError.message}`);
        } else if (referralData) {
          const commissionAmount = depositAmount * (settings.referral_first_deposit_commission_percent / 100);
          
          console.log(`Processing first deposit commission: ${commissionAmount} for referrer ${referralData.referrer_id}`);
          
          // Credit commission to referrer
          const { data: referrerWallet } = await supabase
            .from('wallets')
            .select('wallet_cash')
            .eq('user_id', referralData.referrer_id)
            .single();

          if (referrerWallet) {
            await supabase
              .from('wallets')
              .update({ 
                wallet_cash: parseFloat(referrerWallet.wallet_cash) + commissionAmount 
              })
              .eq('user_id', referralData.referrer_id);

            // Log commission
            await supabase
              .from('commission_transactions')
              .insert({
                referrer_id: referralData.referrer_id,
                referred_user_id: userId,
                commission_type: 'first_deposit_commission',
                amount: commissionAmount,
                reference_id: transactionId
              });

            console.log(`First deposit commission awarded: ${commissionAmount} to ${referralData.referrer_id}`);
          } else {
            console.log(`Referrer wallet not found for ${referralData.referrer_id}`);
          }
        }
      }

      console.log(`Deposit processed: ${depositAmount}, Bonus: ${bonusAmount}, Wager: ${wagerRequired}`);
    }

    if (status === 'completed' && transaction.type === 'withdrawal') {
      const userId = transaction.user_id;
      const withdrawAmount = parseFloat(transaction.amount);

      // Deduct from wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('wallet_cash')
        .eq('user_id', userId)
        .single();

      if (wallet) {
        const newBalance = parseFloat(wallet.wallet_cash) - withdrawAmount;
        await supabase
          .from('wallets')
          .update({ wallet_cash: Math.max(0, newBalance) })
          .eq('user_id', userId);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Transaction processing error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
