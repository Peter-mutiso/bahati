// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const body = await req.json();
    console.log("M-Pesa Callback Received:", JSON.stringify(body));
    
    const callback = body?.Body?.stkCallback;

    // Always respond 200 to Safaricom immediately
    const accepted = new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });

    if (!callback) return accepted;

    const checkoutRequestId: string = callback.CheckoutRequestID;
    const resultCode: number = callback.ResultCode;
    const resultDesc: string = callback.ResultDesc;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pending transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id, user_id, amount")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (!transaction) {
      console.warn("Transaction not found for checkout:", checkoutRequestId);
      return accepted;
    }

    if (resultCode === 0) {
      // --- SUCCESS ---
      console.log(`Transaction ${transaction.id} Success`);
      const items: any[] = callback.CallbackMetadata?.Item || [];
      const receipt = items.find((i: any) => i.Name === "MpesaReceiptNumber")?.Value || null;

      // Mark completed
      await supabase
        .from("transactions")
        .update({ status: "completed", mpesa_receipt: receipt, admin_notes: "STK Push successful" })
        .eq("id", transaction.id);

      // Credit wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("wallet_cash")
        .eq("user_id", transaction.user_id)
        .single();

      if (wallet) {
        await supabase
          .from("wallets")
          .update({ wallet_cash: (Number(wallet.wallet_cash) || 0) + transaction.amount })
          .eq("user_id", transaction.user_id);
      }

      // Update profile total_deposited
      const { data: profile } = await supabase
        .from("profiles")
        .select("total_deposited")
        .eq("id", transaction.user_id)
        .single();

      if (profile) {
        await supabase
          .from("profiles")
          .update({ total_deposited: (Number(profile.total_deposited) || 0) + transaction.amount })
          .eq("id", transaction.user_id);
      }
    } else {
      // --- FAILED / CANCELLED ---
      console.log(`Transaction ${transaction.id} Failed: ${resultDesc} (Code: ${resultCode})`);
      await supabase
        .from("transactions")
        .update({
          status: "rejected",
          admin_notes: `M-Pesa STK ${resultCode === 1032 ? "Cancelled" : "Failed"}: ${resultDesc} (Code: ${resultCode})`,
        })
        .eq("id", transaction.id);
    }

    return accepted;
  } catch (error: any) {
    console.error("mpesa-callback error:", error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
