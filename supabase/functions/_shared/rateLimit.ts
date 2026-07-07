// Shared per-user rate limiter for paid edge functions.
// Delegates the pure decision logic to rateLimit.core.ts (unit-tested) and
// only supplies the live Supabase service-role client here.
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  DEFAULT_RATE_LIMIT,
  enforceRateLimitCore,
  type RateLimitCoreOptions,
  type RateLimitResult,
} from "./rateLimit.core.ts";

export { DEFAULT_RATE_LIMIT };
export type { RateLimitResult };

export interface RateLimitOptions extends RateLimitCoreOptions {
  /** Optional pre-built service-role client to reuse. */
  serviceClient?: SupabaseClient;
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
  const client =
    opts.serviceClient ??
    createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

  return enforceRateLimitCore(userId, functionName, opts, (name, args) =>
    client.rpc(name, args) as ReturnType<Parameters<typeof enforceRateLimitCore>[3]>,
  );
}
