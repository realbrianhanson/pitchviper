// Manager-only Aloware integration management edge function.
// Handles: status, save-token (with live verify), verify, rotate-webhook-secret,
// disconnect. Every action is authenticated + starter-entitlement + management
// role gated + rate limited. Tokens/secrets are never returned in status, never
// logged, and only flow through the service-only Vault RPCs.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  authenticatePost,
  boundedString,
  corsHeaders,
  errorResponse,
  jsonResponse,
  readBoundedJson,
} from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const ACTIONS = [
  "status",
  "save-token",
  "verify",
  "rotate-webhook-secret",
  "disconnect",
] as const;
type Action = typeof ACTIONS[number];

const DISCONNECT_CONFIRM = "DISCONNECT";

async function ensureManagement(service: ReturnType<typeof authenticatePost> extends Promise<infer T>
  ? T extends { ok: true; ctx: { serviceClient: infer S } } ? S : never
  : never, userId: string): Promise<boolean> {
  // deno-lint-ignore no-explicit-any
  const svc = service as any;
  const { data } = await svc.rpc("has_management_role", { _user_id: userId });
  return data === true;
}

function safeToken(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  if (t.length < 4 || t.length > 256) return null;
  // Reject any control characters or whitespace inside the token.
  if (/[\s\x00-\x1f\x7f]/.test(t)) return null;
  return t;
}

async function verifyAlowareToken(token: string): Promise<boolean> {
  try {
    const url = new URL("https://app.aloware.com/api/v1/webhook/users");
    url.searchParams.append("api_token", token);
    const resp = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return false;
    const text = await resp.text();
    if (text.startsWith("<")) return false;
    try {
      const parsed = JSON.parse(text);
      // Accept either an array or { data: [...] } shape.
      if (Array.isArray(parsed)) return true;
      if (parsed && Array.isArray((parsed as Record<string, unknown>).data)) return true;
      return false;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

function webhookUrlFor(webhookKey: string): string {
  const base = Deno.env.get("SUPABASE_URL") ?? "";
  return `${base}/functions/v1/aloware-webhook-receiver?key=${webhookKey}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authenticatePost(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient } = auth.ctx;

  const ent = await requireTeamEntitlement(serviceClient, userId, "starter");
  if (!ent.ok) return ent.response;
  const teamId = ent.teamId;

  if (!(await ensureManagement(serviceClient, userId))) {
    return errorResponse("forbidden", 403);
  }

  const limit = await enforceRateLimit(userId, "manage-aloware-integration", {
    perMinute: 20,
    perDay: 200,
    serviceClient,
  });
  if (!limit.allowed) return limit.response;

  const body = (await readBoundedJson(req, 8192)) as Record<string, unknown> | null;
  if (!body) return errorResponse("invalid_body", 400);
  const action = boundedString(body.action, 40) as Action | null;
  if (!action || !ACTIONS.includes(action)) return errorResponse("invalid_action", 400);

  try {
    if (action === "status") {
      const { data, error } = await serviceClient.rpc("svc_provider_integration_status", {
        _team_id: teamId,
        _provider: "aloware",
      });
      if (error) return errorResponse("internal_error", 500);
      const status = (data ?? {}) as Record<string, unknown>;
      return jsonResponse({
        ok: true,
        status,
        webhook_url: typeof status.webhook_key === "string"
          ? webhookUrlFor(status.webhook_key)
          : null,
      });
    }

    if (action === "save-token") {
      const apiToken = safeToken(body.token);
      if (!apiToken) return errorResponse("invalid_token", 400);
      const verified = await verifyAlowareToken(apiToken);
      if (!verified) return errorResponse("invalid_token", 400);

      const { error: saveErr } = await serviceClient.rpc("svc_provider_integration_save_token", {
        _team_id: teamId,
        _provider: "aloware",
        _token: apiToken,
        _actor: userId,
      });
      if (saveErr) return errorResponse("internal_error", 500);

      await serviceClient.rpc("svc_provider_integration_mark_verified", {
        _team_id: teamId,
        _provider: "aloware",
        _status: "connected",
      });
      return jsonResponse({ ok: true });
    }

    if (action === "verify") {
      const { data: token, error: tErr } = await serviceClient.rpc(
        "svc_provider_integration_get_secret",
        { _team_id: teamId, _provider: "aloware", _kind: "api_token" },
      );
      if (tErr || typeof token !== "string" || token.length === 0) {
        return errorResponse("integration_not_configured", 400);
      }
      const ok = await verifyAlowareToken(token);
      await serviceClient.rpc("svc_provider_integration_mark_verified", {
        _team_id: teamId,
        _provider: "aloware",
        _status: ok ? "connected" : "error",
      });
      if (!ok) return errorResponse("invalid_token", 400);
      return jsonResponse({ ok: true });
    }

    if (action === "rotate-webhook-secret") {
      const { data, error } = await serviceClient.rpc(
        "svc_provider_integration_rotate_webhook_secret",
        { _team_id: teamId, _provider: "aloware", _actor: userId },
      );
      if (error || !data) return errorResponse("internal_error", 500);
      const payload = data as Record<string, unknown>;
      const secret = typeof payload.webhook_secret === "string" ? payload.webhook_secret : null;
      const key = typeof payload.webhook_key === "string" ? payload.webhook_key : null;
      if (!secret || !key) return errorResponse("internal_error", 500);
      return jsonResponse({
        ok: true,
        webhook_secret: secret,
        webhook_url: webhookUrlFor(key),
      });
    }

    if (action === "disconnect") {
      const confirm = boundedString(body.confirm, 32);
      if (confirm !== DISCONNECT_CONFIRM) return errorResponse("confirmation_required", 400);
      const { error } = await serviceClient.rpc("svc_provider_integration_disconnect", {
        _team_id: teamId,
        _provider: "aloware",
      });
      if (error) return errorResponse("internal_error", 500);
      return jsonResponse({ ok: true });
    }

    return errorResponse("invalid_action", 400);
  } catch {
    // Never log exception substrings — could contain token material.
    console.error(JSON.stringify({ fn: "manage-aloware-integration", code: "internal_error" }));
    return errorResponse("internal_error", 500);
  }
});
