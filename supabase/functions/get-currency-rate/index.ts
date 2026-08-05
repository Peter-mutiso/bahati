import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Currency alias mapping for non-ISO codes
const currencyAliases: Record<string, string> = {
  'KSH': 'KES',  // Kenyan Shilling
  'RS': 'INR',   // Indian Rupee
  'RMB': 'CNY', // Chinese Yuan
  'YUAN': 'CNY',
};

// Fetch live BTC rate
async function fetchBtcRate(): Promise<number> {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
    if (response.ok) {
      const data = await response.json();
      return data.bitcoin?.usd || 100000;
    }
  } catch (error) {
    console.error('Error fetching BTC rate:', error);
  }
  return 100000; // Fallback rate
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { currency } = await req.json();
    
    if (!currency) {
      return new Response(
        JSON.stringify({ error: 'Currency code is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const upperCurrency = currency.toUpperCase();
    // Map alias to ISO code if exists
    const isoCurrency = currencyAliases[upperCurrency] || upperCurrency;
    
    console.log(`Fetching rate for: ${upperCurrency} (ISO: ${isoCurrency})`);

    // Use a free exchange rate API (exchangerate-api.com provides 1500 free requests/month)
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/USD`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    const rate = data.rates[isoCurrency];

    if (!rate) {
      console.error(`Currency not found: ${upperCurrency} (tried ISO: ${isoCurrency})`);
      return new Response(
        JSON.stringify({ error: `Currency ${currency} not found` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Fetch BTC rate
    const btcRate = await fetchBtcRate();

    // Return the rate (1 USD = X currency)
    console.log(`Rate for ${upperCurrency}: ${rate}, BTC: ${btcRate}`);
    return new Response(
      JSON.stringify({ 
        currency: upperCurrency, // Return original code user passed
        rate: rate,
        usdtRate: rate, // Since USDT is pegged to USD, rate is the same
        btcRate: btcRate // Live BTC to USD rate
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching currency rate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
