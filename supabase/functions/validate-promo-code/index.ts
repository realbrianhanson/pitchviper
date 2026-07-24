import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_PROMO_CODES = ["viper"];
function loadPromoCodes(): string[] {
  const raw = Deno.env.get("PROMO_CODES") ?? "";
  if (!raw.trim()) return DEFAULT_PROMO_CODES;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const list = parsed.map((c) => String(c).trim().toLowerCase()).filter(Boolean);
      return list.length ? list : DEFAULT_PROMO_CODES;
    }
  } catch {
    // fallthrough
  }
  const list = raw.split(",").map((c) => c.trim().toLowerCase()).filter(Boolean);
  return list.length ? list : DEFAULT_PROMO_CODES;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { valid: false, error: "Unauthorized" });
    }
    const token = authHeader.slice("Bearer ".length);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData.user) {
      return json(401, { valid: false, error: "Unauthorized" });
    }
    const userId = authData.user.id;

    const rl = await enforceRateLimit(userId, "validate-promo-code", {
      perMinute: 5,
      perDay: 30,
    });
    if (!rl.allowed && rl.response) return rl.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { valid: false, error: "Invalid JSON body" });
    }
    const promoCode = (body as { promoCode?: unknown })?.promoCode;
    if (!promoCode || typeof promoCode !== "string") {
      return json(400, { valid: false, error: "Promo code is required" });
    }

    const trimmed = promoCode.trim().toLowerCase();
    if (trimmed.length < 3 || trimmed.length > 40) {
      return json(400, { valid: false, error: "Invalid promo code" });
    }

    const codes = loadPromoCodes();
    const isValid = codes.includes(trimmed);
    if (!isValid) {
      return json(200, { valid: false, error: "Invalid promo code" });
    }

    // Server-owned profile write via service role.
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { error: updateError } = await service
      .from("profiles")
      .update({ promo_validated: true })
      .eq("user_id", userId);
    if (updateError) {
      console.error("[validate-promo-code] profile update failed:", updateError.message);
      return json(500, { valid: false, error: "Could not validate access" });
    }

    return json(200, { valid: true, error: null });
  } catch (err) {
    console.error("[validate-promo-code] unexpected:", err);
    return json(500, { valid: false, error: "Server error validating promo code" });
  }
});
