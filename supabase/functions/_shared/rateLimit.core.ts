// Pure rate-limit evaluator. Split out from rateLimit.ts so tests can exercise
// it without importing the Deno-only Supabase URL shim. rateLimit.ts wraps
// this with a live Supabase service-role client.

export const DEFAULT_RATE_LIMIT = { perMinute: 10, perDay: 100 };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

export interface RateLimitCoreOptions {
  perMinute?: number;
  perDay?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  response?: Response;
  info?: Record<string, unknown>;
}

export type RateLimitRpc = (
  name: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Run the RPC and translate its result into an allow/deny decision.
 * - allowed:true  → pass through.
 * - allowed:false → returns a ready-to-send 429 Response.
 * - infra error   → fail-open (allow) so the limiter itself never DoSes real users.
 */
export async function enforceRateLimitCore(
  userId: string,
  functionName: string,
  opts: RateLimitCoreOptions,
  rpc: RateLimitRpc,
): Promise<RateLimitResult> {
  const perMinute = opts.perMinute ?? DEFAULT_RATE_LIMIT.perMinute;
  const perDay = opts.perDay ?? DEFAULT_RATE_LIMIT.perDay;

  const { data, error } = await rpc("check_and_increment_rate_limit", {
    _user_id: userId,
    _function_name: functionName,
    _per_minute: perMinute,
    _per_day: perDay,
  });

  if (error) {
    // eslint-disable-next-line no-console
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
