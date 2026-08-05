import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { referralCode, newUserId } = await req.json();

    console.log('Processing referral:', { referralCode, newUserId });

    // Validate inputs
    if (!referralCode || !newUserId) {
      return new Response(
        JSON.stringify({ error: 'Missing referralCode or newUserId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get referrer info from referral code
    const { data: referralCodeData, error: codeError } = await supabase
      .from('referral_codes')
      .select('user_id, code')
      .eq('code', referralCode.toUpperCase())
      .single();

    if (codeError || !referralCodeData) {
      console.error('Invalid referral code:', codeError);
      return new Response(
        JSON.stringify({ error: 'Invalid referral code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const referrerId = referralCodeData.user_id;

    // Prevent self-referral
    if (referrerId === newUserId) {
      console.error('Self-referral attempt detected');
      return new Response(
        JSON.stringify({ error: 'Cannot refer yourself' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user was already referred
    const { data: existingReferral } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_user_id', newUserId)
      .single();

    if (existingReferral) {
      console.log('User already referred');
      return new Response(
        JSON.stringify({ message: 'User already has a referrer' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get reward amount from game settings
    const { data: settings, error: settingsError } = await supabase
      .from('game_settings')
      .select('referral_reward_amount')
      .single();

    if (settingsError) {
      console.error('Error fetching settings:', settingsError);
      throw settingsError;
    }

    const rewardAmount = settings.referral_reward_amount || 50;

    // Create referral record
    const { error: referralError } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referrerId,
        referred_user_id: newUserId,
        referral_code: referralCode.toUpperCase(),
        reward_amount: rewardAmount,
        status: 'completed'
      });

    if (referralError) {
      console.error('Error creating referral:', referralError);
      throw referralError;
    }

    // Update referrer's wallet balance
    const { data: referrerWallet, error: walletError } = await supabase
      .from('wallets')
      .select('wallet_cash')
      .eq('user_id', referrerId)
      .single();

    if (walletError) {
      console.error('Error fetching wallet:', walletError);
      throw walletError;
    }

    const newBalance = parseFloat(referrerWallet.wallet_cash.toString()) + rewardAmount;

    const { error: updateError } = await supabase
      .from('wallets')
      .update({ wallet_cash: newBalance })
      .eq('user_id', referrerId);

    if (updateError) {
      console.error('Error updating wallet:', updateError);
      throw updateError;
    }

    // Get current referral code stats
    const { data: currentStats, error: currentStatsError } = await supabase
      .from('referral_codes')
      .select('total_referrals, total_earnings')
      .eq('user_id', referrerId)
      .single();

    if (currentStatsError) {
      console.error('Error fetching current stats:', currentStatsError);
    }

    // Update referral code stats
    const { error: statsError } = await supabase
      .from('referral_codes')
      .update({
        total_referrals: (currentStats?.total_referrals || 0) + 1,
        total_earnings: (parseFloat(currentStats?.total_earnings?.toString() || '0')) + rewardAmount
      })
      .eq('user_id', referrerId);

    if (statsError) {
      console.error('Error updating stats:', statsError);
    }

    console.log('Referral processed successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Referral bonus of ${rewardAmount} credits awarded!`,
        rewardAmount 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing referral:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});