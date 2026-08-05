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
    const { userId, amount, phone, siteName, tenantId } = await req.json();

    if (!userId || !amount || !phone) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Normalize Phone
    let normalizedPhone = phone.trim().replace(/\s+/g, "");
    if (normalizedPhone.startsWith("0")) normalizedPhone = "254" + normalizedPhone.slice(1);
    if (normalizedPhone.startsWith("+")) normalizedPhone = normalizedPhone.slice(1);

    // --- 0. GET TENANT ID (from request or profile fallback) ---
    let resolvedTenantId = tenantId || null;
    if (!resolvedTenantId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", userId)
        .maybeSingle();
      resolvedTenantId = profile?.tenant_id || null;
    }

    // --- 1. PRE-REGISTER TRANSACTION (so it exists even if STK Push fails) ---
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "deposit",
        amount: parseFloat(amount),
        status: "pending",
        payment_method: "mpesa",
        phone_number: normalizedPhone,
        tenant_id: resolvedTenantId,
      })
      .select()
      .single();

    if (txError) throw txError;

    try {
      const consumerKey = Deno.env.get("MPESA_CONSUMER_KEY")!;
      const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET")!;
      const shortcode = Deno.env.get("MPESA_SHORTCODE")!;
      const passkey = Deno.env.get("MPESA_PASSKEY")!;

      // --- OAuth Token ---
      const auth = btoa(`${consumerKey}:${consumerSecret}`);
      const tokenRes = await fetch(
        "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
        { headers: { Authorization: `Basic ${auth}` } }
      );
      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      if (!accessToken) throw new Error("Failed to get M-Pesa access token");

      // --- Timestamp & Password ---
      const now = new Date();
      const timestamp =
        now.getFullYear().toString() +
        String(now.getMonth() + 1).padStart(2, "0") +
        String(now.getDate()).padStart(2, "0") +
        String(now.getHours()).padStart(2, "0") +
        String(now.getMinutes()).padStart(2, "0") +
        String(now.getSeconds()).padStart(2, "0");
      const password = btoa(`${shortcode}${passkey}${timestamp}`);

      const callbackUrl = "https://rzmpkdvowfpvhyujpejs.supabase.co/functions/v1/mpesa-callback";

      // --- STK Push ---
      const stkRes = await fetch("https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.floor(Number(amount)),
          PartyA: normalizedPhone,
          PartyB: shortcode,
          PhoneNumber: normalizedPhone,
          CallBackURL: callbackUrl,
          AccountReference: (siteName || "Game").slice(0, 12),
          TransactionDesc: `${(siteName || "Game").slice(0, 13)} Deposit`,
        }),
      });

      const stkData = await stkRes.json();

      if (stkData.ResponseCode !== "0") {
        // Update transaction as failed
        await supabase
          .from("transactions")
          .update({ 
            status: "failed", 
            admin_notes: `STK Push initiation failed: ${stkData.errorMessage || stkData.ResponseDescription}` 
          })
          .eq("id", transaction.id);

        return new Response(
          JSON.stringify({ error: stkData.errorMessage || stkData.ResponseDescription || "STK Push failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // --- Update with CheckoutRequestID ---
      await supabase
        .from("transactions")
        .update({ mpesa_checkout_request_id: stkData.CheckoutRequestID })
        .eq("id", transaction.id);

      return new Response(
        JSON.stringify({
          success: true,
          checkoutRequestId: stkData.CheckoutRequestID,
          transactionId: transaction.id,
          message: "STK Push sent. Check your phone.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (stkErr: any) {
      // Initiation failed - mark as failed in DB
      await supabase
        .from("transactions")
        .update({ status: "failed", admin_notes: `Initiation error: ${stkErr.message}` })
        .eq("id", transaction.id);
      
      throw stkErr;
    }

  } catch (error: any) {
    console.error("mpesa-stk-push error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
