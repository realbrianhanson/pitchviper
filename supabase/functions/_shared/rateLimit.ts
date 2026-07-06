// Shared per-user rate limiter for paid edge functions.
// Uses the SECURITY DEFINER RPC public.check_and_increment_rate_limit.
//
// Default limits are intentionally conservative starting points; adjust in one
// place by passing perMinute/perDay to enforceRateLimit.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_RATE_LIMIT = { perMinute: 10, perDay: 100 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface RateLimitOptions {
  perMinute?: number;
  perDay?: number;
  /** Optional pre-built service-role client to reuse. */
  serviceClient?: SupabaseClient;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Ready-to-return 429 Response when !allowed. */
  response?: Response;
  info?: Record<string, unknown>;
}

/**
 * Atomically increments the per-user, per-function counter and returns a
 * ready-made 429 Response when the caller has exceeded either window.
 * Safe to call once per request, immediately after auth validation and before
 * any paid external work.
 */
export async function enforceRateLimit(
  userId: string,
  functionName: string,
  opts: RateLimitOptions = {},
): Promise<RateLimitResult> {
  const perMinute = opts.perMinute ?? DEFAULT_RATE_LIMIT.perMinute;
  const perDay = opts.perDay ?? DEFAULT_RATE_LIMIT.perDay;

  const client =
    opts.serviceClient ??
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

  const { data, error } = await client.rpc("check_and_increment_rate_limit", {
    _user_id: userId,
    _function_name: functionName,
    _per_minute: perMinute,
    _per_day: perDay,
  });

  // Fail-open on infrastructure errors (do not block legitimate traffic when
  // the limiter itself is broken) but log loudly.
  if (error) {
    console.error(`[rateLimit] ${functionName} check failed:`, error.message);
    return { allowed: true, info: { error: error.message } };
  }

  const result = (data ?? {}) as Record<string, unknown>;
  if (result.allowed === false) {
    const retryAfter = Number(result.retry_after_seconds ?? 60);
    return {
      allowed: false,
      info: result,
      response: new Response(
        JSON.stringify({
          error: "rate_limited",
          message:
            result.limit_type === "per_day"
              ? "Daily limit reached for this feature. Try again tomorrow."
              : "You're moving too fast. Try again in a minute.",
          limit_type: result.limit_type,
          retry_after_seconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(retryAfter),
          },
        },
      ),
    };
  }

  return { allowed: true, info: result };
}
