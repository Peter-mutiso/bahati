// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId, amount, phone, tenantId } = await req.json();

    if (!userId || !amount || !phone) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Normalize Phone
    let normalizedPhone = phone.toString().trim().replace(/[^0-9]/g, "");
    if (normalizedPhone.startsWith("0")) normalizedPhone = "254" + normalizedPhone.slice(1);
    if (!normalizedPhone.startsWith("254")) normalizedPhone = "254" + normalizedPhone;

    // 1. Check balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("wallet_cash")
      .eq("user_id", userId)
      .single();

    const withdrawalAmount = Number(amount);
    const currentBalance = Number(wallet?.wallet_cash) || 0;

    if (!wallet || currentBalance < withdrawalAmount) {
      return new Response(JSON.stringify({ success: false, error: "Insufficient balance" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Resolve tenant_id
    let resolvedTenantId = tenantId || null;
    if (!resolvedTenantId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      resolvedTenantId = profile?.tenant_id || null;
    }

    // 3. Create withdrawal transaction
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "withdrawal",
        amount: withdrawalAmount,
        status: "pending",
        payment_method: "mpesa",
        phone_number: normalizedPhone,
        tenant_id: resolvedTenantId,
      })
      .select()
      .single();

    if (txError) throw txError;

    // 3. Deduct from wallet
    await supabase
      .from("wallets")
      .update({ wallet_cash: currentBalance - withdrawalAmount })
      .eq("user_id", userId);

    try {
      // --- Use names exactly from user's .env file ---
      const consumerKey = Deno.env.get("MPESA_WITHDRAW_CONSUMER_KEY") || Deno.env.get("MPESA_CONSUMER_KEY")!;
      const consumerSecret = Deno.env.get("MPESA_WITHDRAW_CONSUMER_SECRET") || Deno.env.get("MPESA_CONSUMER_SECRET")!;
      const initiatorName = Deno.env.get("MPESA_INITIATOR_NAME") || Deno.env.get("MPESA_B2C_INITIATOR") || "RocketRise";
      const securityCredential = Deno.env.get("MPESA_INITIATOR_PASSWORD") || Deno.env.get("MPESA_B2C_SECURITY_CREDENTIAL")!;
      const shortcode = Deno.env.get("MPESA_B2C_SHORTCODE") || Deno.env.get("MPESA_SHORTCODE")!; 
      
      const environment = Deno.env.get("MPESA_ENVIRONMENT") || "production";
      const callbackUrl = "https://rzmpkdvowfpvhyujpejs.supabase.co/functions/v1/mpesa-b2c-callback";

      const baseUrl = environment === "sandbox" 
        ? "https://sandbox.safaricom.co.ke" 
        : "https://api.safaricom.co.ke";

      console.log(`Using Initiator: ${initiatorName} on ${environment} environment`);

      // --- OAuth ---
      const auth = btoa(`${consumerKey}:${consumerSecret}`);
      const tokenRes = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) throw new Error(`M-Pesa Auth failed. Status: ${tokenRes.status}`);

      // --- B2C Request ---
      const b2cRes = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          InitiatorName: initiatorName,
          SecurityCredential: securityCredential,
          CommandID: "BusinessPayment",
          Amount: Math.floor(withdrawalAmount),
          PartyA: shortcode,
          PartyB: normalizedPhone,
          Remarks: "Withdrawal",
          QueueTimeOutURL: callbackUrl,
          ResultURL: callbackUrl,
          Occasion: "Withdrawal",
        }),
      });

      const b2cData = await b2cRes.json();

      if (b2cData.ResponseCode !== "0") {
        // Refund
        await supabase.from("wallets").update({ wallet_cash: currentBalance }).eq("user_id", userId);
        await supabase.from("transactions").update({ 
          status: "failed", 
          admin_notes: `B2C Error: ${b2cData.errorMessage || b2cData.ResponseDescription}` 
        }).eq("id", transaction.id);

        return new Response(
          JSON.stringify({ success: false, error: b2cData.errorMessage || b2cData.ResponseDescription || "Payout rejected" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase.from("transactions").update({ mpesa_checkout_request_id: b2cData.ConversationID }).eq("id", transaction.id);

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (err: any) {
      // Refund
      await supabase.from("wallets").update({ wallet_cash: currentBalance }).eq("user_id", userId);
      await supabase.from("transactions").update({ status: "failed", admin_notes: `System Error: ${err.message}` }).eq("id", transaction.id);
      return new Response(JSON.stringify({ success: false, error: err.message }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { 
      status: 200, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
