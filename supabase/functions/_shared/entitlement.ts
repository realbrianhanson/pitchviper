// Shared server-side entitlement gate for paid AI / provider endpoints.
// Callers pass a service-role client + the authenticated userId. On failure
// the caller returns the Response we hand back verbatim — no logs, no leak.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { errorResponse } from "./edgeAuth.ts";

export type MinTier = "starter" | "growth";

export interface EntitlementResult {
  ok: true;
  teamId: string;
  ent: Record<string, unknown>;
}

/**
 * Enforce that the caller's team has an active subscription (or trial) and,
 * optionally, a minimum feature tier. Returns a ready-to-send Response on
 * failure. Never trusts client-provided team/plan values.
 */
export async function requireTeamEntitlement(
  service: SupabaseClient,
  userId: string,
  minTier: MinTier = "starter",
): Promise<{ ok: true; teamId: string; ent: Record<string, unknown> } | { ok: false; response: Response }> {
  if (!userId) {
    return { ok: false, response: errorResponse("unauthorized", 401) };
  }
  const { data, error } = await service.rpc("check_team_entitlement", {
    p_user_id: userId,
    p_min_tier: minTier,
  });
  if (error) {
    return { ok: false, response: errorResponse("entitlement_check_failed", 500) };
  }
  const payload = (data ?? {}) as Record<string, unknown>;
  if (payload.ok === true) {
    return {
      ok: true,
      teamId: String(payload.team_id ?? ""),
      ent: (payload.ent as Record<string, unknown>) ?? {},
    };
  }
  const code = String(payload.code ?? "subscription_required");
  const status = code === "upgrade_required" ? 403 : 402;
  return { ok: false, response: errorResponse(code, status) };
}

/**
 * Team-scoped variant used by signed webhooks (Aloware/GHL) after the caller
 * has mapped the payload to an owning team_id. Returns `{ ok: false }` with
 * the entitlement code so webhook handlers can decide between "accept and
 * drop" (subscription_required) versus proceeding.
 */
export async function checkTeamEntitlementByTeamId(
  service: SupabaseClient,
  teamId: string | null | undefined,
  minTier: MinTier = "starter",
): Promise<{ ok: true } | { ok: false; code: string }> {
  if (!teamId) return { ok: false, code: "no_team" };
  const { data: billing } = await service
    .from("team_billing").select("*").eq("team_id", teamId).maybeSingle();
  if (!billing) return { ok: false, code: "no_billing" };
  const { data: ent } = await service.rpc("compute_entitlement", { p_billing: billing });
  const payload = (ent ?? {}) as Record<string, unknown>;
  if (!payload.access) return { ok: false, code: String(payload.reason ?? "subscription_required") };
  if (minTier === "growth" && payload.tier !== "growth") return { ok: false, code: "upgrade_required" };
  return { ok: true };
}
