import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get IP from request headers
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwardedFor?.split(',')[0] || realIp || '0.0.0.0';

    console.log('Fetching country for IP:', ip);

    // Use ip-api.com for IP geolocation (free tier: 45 requests/minute, no API key needed)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,message,countryCode,country`);
    
    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      throw new Error('Failed to fetch geolocation data');
    }

    const data = await response.json();
    
    if (data.status === 'fail') {
      console.error('IP API returned error:', data.message);
      throw new Error(data.message || 'Failed to fetch geolocation data');
    }
    
    console.log('Country data:', { country: data.countryCode, ip });

    return new Response(
      JSON.stringify({ 
        country_code: data.countryCode || 'UNKNOWN',
        country_name: data.country || 'Unknown',
        ip: ip
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error fetching country:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        country_code: 'UNKNOWN' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
