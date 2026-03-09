import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const VALID_PROMO_CODES = ["viper"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { promoCode } = await req.json();

    if (!promoCode || typeof promoCode !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: "Promo code is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const trimmed = promoCode.trim().toLowerCase();
    const isValid = VALID_PROMO_CODES.includes(trimmed);

    return new Response(
      JSON.stringify({ valid: isValid, error: isValid ? null : "Invalid promo code" }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ valid: false, error: "Server error validating promo code" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
