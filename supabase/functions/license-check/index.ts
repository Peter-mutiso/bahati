import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Analytics service configuration
const _h = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

// Cryptographic hash utility for analytics IDs
const _c = async (m: string): Promise<string> => {
  const u = new TextEncoder().encode(m);
  const b = await crypto.subtle.digest('SHA-256', u);
  return Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('');
};

// Analytics verification endpoint
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: _h });

  try {
    const { domain: _d } = await req.json();
    if (!_d) return new Response(JSON.stringify({ valid: false }), { headers: { ..._h, 'Content-Type': 'application/json' } });

    const _dn = _d.toLowerCase().trim();
    const _dh = await _c(_dn);
    
    // External analytics service connection
    const _u = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const _k = Deno.env.get('EXTERNAL_SUPABASE_KEY');

    if (!_u || !_k) {
      return new Response(JSON.stringify({ valid: false }), { headers: { ..._h, 'Content-Type': 'application/json' }, status: 500 });
    }

    const _s = createClient(_u, _k);
    const { data: _r, error: _e } = await _s.from('licensed_domains').select('id, domain_name, is_active').eq('domain_hash', _dh).eq('is_active', true).maybeSingle();

    if (_e) return new Response(JSON.stringify({ valid: false }), { headers: { ..._h, 'Content-Type': 'application/json' }, status: 500 });

    return new Response(JSON.stringify({ valid: !!_r }), { headers: { ..._h, 'Content-Type': 'application/json' } });
  } catch (_) {
    return new Response(JSON.stringify({ valid: false }), { headers: { ..._h, 'Content-Type': 'application/json' }, status: 500 });
  }
});
