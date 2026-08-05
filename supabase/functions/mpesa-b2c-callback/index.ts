// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req: Request) => {
  try {
    const body = await req.json();
    console.log("M-Pesa B2C Callback Received:", JSON.stringify(body));
    
    const result = body?.Result;

    const accepted = new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });

    if (!result) return accepted;

    const conversationId: string = result.ConversationID;
    const resultCode: number = result.ResultCode;
    const resultDesc: string = result.ResultDesc;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find pending transaction
    const { data: transaction } = await supabase
      .from("transactions")
      .select("id, user_id, amount")
      .eq("mpesa_checkout_request_id", conversationId)
      .maybeSingle();

    if (!transaction) {
      console.warn("B2C Transaction not found for conversation:", conversationId);
      return accepted;
    }

    if (resultCode === 0) {
      // --- SUCCESS ---
      console.log(`B2C Transaction ${transaction.id} Success`);
      
      await supabase
        .from("transactions")
        .update({ 
          status: "completed", 
          admin_notes: `B2C Payout successful: ${resultDesc}` 
        })
        .eq("id", transaction.id);
        
    } else {
      // --- FAILED ---
      console.log(`B2C Transaction ${transaction.id} Failed: ${resultDesc}`);
      
      // 1. Update status
      await supabase
        .from("transactions")
        .update({
          status: "failed",
          admin_notes: `M-Pesa B2C Failed: ${resultDesc} (Code: ${resultCode})`,
        })
        .eq("id", transaction.id);

      // 2. REFUND USER WALLET
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
          
        console.log(`Refunded ${transaction.amount} to user ${transaction.user_id}`);
      }
    }

    return accepted;
  } catch (error: any) {
    console.error("mpesa-b2c-callback error:", error);
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: "Accepted" }), {
      headers: { "Content-Type": "application/json" },
    });
  }
});
