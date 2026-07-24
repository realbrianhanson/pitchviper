// Authenticated, rate-limited promo code validator.
// Never contains a hard-coded fallback code: if PROMO_CODES is unset/invalid
// the endpoint returns 503 { valid:false, error:"access_not_configured" } and
// makes no writes. Comparisons use a constant-time SHA-256 helper. The
// service-role profile UPDATE must affect exactly one row.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { timingSafeEqualStrings } from "../_shared/timingSafe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Parse PROMO_CODES from the environment. Returns [] when unset/invalid so the
// caller can respond 503 "access_not_configured" without a public fallback.
export function loadConfiguredPromoCodes(raw: string | undefined): string[] {
  if (!raw || !raw.trim()) return [];
  const norm = (s: unknown) => String(s ?? "").trim().toLowerCase();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(norm).filter((c) => c.length >= 3 && c.length <= 40);
    }
  } catch {
    // fall through to CSV
  }
  return raw
    .split(",")
    .map(norm)
    .filter((c) => c.length >= 3 && c.length <= 40);
}

async function matchesAny(candidate: string, codes: string[]): Promise<boolean> {
  let matched = false;
  for (const c of codes) {
    if (await timingSafeEqualStrings(candidate, c)) matched = true;
  }
  return matched;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json(405, { valid: false, error: "method_not_allowed" });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { valid: false, error: "unauthorized" });
    }
    const token = authHeader.slice("Bearer ".length);

    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData.user) {
      return json(401, { valid: false, error: "unauthorized" });
    }
    const userId = authData.user.id;

    const rl = await enforceRateLimit(userId, "validate-promo-code", {
      perMinute: 5,
      perDay: 30,
    });
    if (!rl.allowed && rl.response) return rl.response;

    const codes = loadConfiguredPromoCodes(Deno.env.get("PROMO_CODES"));
    if (codes.length === 0) {
      return json(503, { valid: false, error: "access_not_configured" });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return json(400, { valid: false, error: "invalid_body" });
    }
    const promoCode = (body as { promoCode?: unknown })?.promoCode;
    if (!promoCode || typeof promoCode !== "string") {
      return json(400, { valid: false, error: "invalid_code" });
    }
    const candidate = promoCode.trim().toLowerCase();
    if (candidate.length < 3 || candidate.length > 40) {
      return json(200, { valid: false, error: "invalid_code" });
    }

    const isValid = await matchesAny(candidate, codes);
    if (!isValid) {
      return json(200, { valid: false, error: "invalid_code" });
    }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: updated, error: updateError } = await service
      .from("profiles")
      .update({ promo_validated: true })
      .eq("user_id", userId)
      .select("user_id");
    if (updateError || !updated || updated.length !== 1) {
      console.error("[validate-promo-code] profile update failed");
      return json(500, { valid: false, error: "validation_failed" });
    }

    return json(200, { valid: true, error: null });
  } catch {
    console.error("[validate-promo-code] unexpected exception");
    return json(500, { valid: false, error: "validation_failed" });
  }
});
