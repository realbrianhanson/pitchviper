// Per-tenant Aloware credential resolver. Never reads the legacy global
// ALOWARE_API_TOKEN / ALOWARE_WEBHOOK_SECRET; always goes through the
// service-only Vault-backed RPCs so one company can never spend another
// company's credit or receive their webhooks.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export type ProviderKind = "api_token" | "webhook_secret";

/**
 * Return the decrypted Aloware API token for the given team, or null if the
 * company has not connected Aloware yet. Callers should return the stable
 * `integration_not_configured` error code to the client on null.
 */
export async function getTeamAlowareToken(
  service: SupabaseClient,
  teamId: string | null | undefined,
): Promise<string | null> {
  if (!teamId) return null;
  const { data, error } = await service.rpc("svc_provider_integration_get_secret", {
    _team_id: teamId,
    _provider: "aloware",
    _kind: "api_token" satisfies ProviderKind,
  });
  if (error) return null;
  return typeof data === "string" && data.length > 0 ? data : null;
}

/** Same as above but for the team's webhook secret. */
export async function getTeamAlowareWebhookSecret(
  service: SupabaseClient,
  teamId: string | null | undefined,
): Promise<string | null> {
  if (!teamId) return null;
  const { data, error } = await service.rpc("svc_provider_integration_get_secret", {
    _team_id: teamId,
    _provider: "aloware",
    _kind: "webhook_secret" satisfies ProviderKind,
  });
  if (error) return null;
  return typeof data === "string" && data.length > 0 ? data : null;
}

export interface WebhookLookup {
  teamId: string;
  provider: "aloware";
  hasWebhookSecret: boolean;
}

/** Resolve the opaque webhook_key query param → owning team + status. */
export async function resolveWebhookKey(
  service: SupabaseClient,
  webhookKey: string | null,
): Promise<WebhookLookup | null> {
  if (!webhookKey) return null;
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(webhookKey)) return null;
  const { data, error } = await service.rpc("svc_provider_integration_by_webhook_key", {
    _webhook_key: webhookKey,
  });
  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  const teamId = typeof row.team_id === "string" ? row.team_id : null;
  const provider = row.provider === "aloware" ? "aloware" : null;
  if (!teamId || !provider) return null;
  return {
    teamId,
    provider,
    hasWebhookSecret: row.has_webhook_secret === true,
  };
}

/**
 * Constant-time comparison of the caller-provided webhook secret against the
 * team's stored secret. Accepts Bearer <secret> in Authorization or
 * X-Aloware-Signature. Never falls back to any global secret.
 */
export async function verifyWebhookAuth(
  service: SupabaseClient,
  teamId: string,
  headers: Headers,
): Promise<boolean> {
  const expected = await getTeamAlowareWebhookSecret(service, teamId);
  if (!expected) return false;
  const bearer =
    (headers.get("Authorization") ?? headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const signature = (headers.get("X-Aloware-Signature") ?? headers.get("x-aloware-signature") ?? "").trim();
  const candidate = bearer || signature;
  if (!candidate) return false;
  return timingSafeEqual(candidate, expected);
}

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(a)),
    crypto.subtle.digest("SHA-256", enc.encode(b)),
  ]);
  const va = new Uint8Array(ha);
  const vb = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i];
  return diff === 0;
}
