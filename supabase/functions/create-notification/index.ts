import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  authenticatePostOrService, corsHeaders, errorResponse, jsonResponse,
  readBoundedJson, enumOf, boundedString, isUuid,
} from "../_shared/edgeAuth.ts";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const NOTIFICATION_TYPES = [
  "badge_earned","level_up","streak_milestone","deal_closed","sos_alert","mentioned",
  "coaching_notes","training_assigned","roleplay_feedback","followup_due","challenge_reminder",
  "deal_cold","competition_starting","competition_ending","leaderboard_overtaken","leaderboard_leading",
] as const;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const auth = await authenticatePostOrService(req);
  if (!auth.ok) return auth.response;
  const { userId, serviceClient, isService } = auth.ctx;

  if (!isService) { const _ent = await requireTeamEntitlement(serviceClient, userId, "starter"); if (!_ent.ok) return _ent.response; }
  // Rate-limit only user callers; scheduled service calls are trusted.
  if (!isService) {
    const rl = await enforceRateLimit(userId, "create-notification", { serviceClient, perMinute: 20, perDay: 500 });
    if (!rl.allowed) return rl.response!;
  }

  const body = await readBoundedJson(req, 8 * 1024);
  if (!body || typeof body !== "object") return errorResponse("invalid_body", 400);
  const b = body as Record<string, unknown>;

  const target_user_id = isUuid(b.user_id) ? b.user_id : null;
  const type = enumOf(b.type, NOTIFICATION_TYPES);
  const title = boundedString(b.title, 160);
  const bodyText = boundedString(b.body, 1000);
  const action_url_raw = b.action_url;
  let action_url: string | null = null;
  if (action_url_raw != null) {
    if (typeof action_url_raw !== "string" || action_url_raw.length > 512) return errorResponse("invalid_body", 400);
    if (!/^\/[a-zA-Z0-9/_\-?=&%.:#]*$/.test(action_url_raw)) return errorResponse("invalid_body", 400);
    action_url = action_url_raw;
  }
  if (!target_user_id || !type || !title || !bodyText) return errorResponse("invalid_body", 400);

  if (!isService && target_user_id !== userId) return errorResponse("forbidden", 403);

  const { data: prefs } = await serviceClient
    .from("user_notification_preferences").select("in_app_enabled")
    .eq("user_id", target_user_id).eq("notification_type", type).maybeSingle();
  const inAppEnabled = prefs?.in_app_enabled ?? true;
  if (!inAppEnabled) return jsonResponse({ success: true, skipped: true });

  const { data: notification, error } = await serviceClient
    .from("notifications")
    .insert({ user_id: target_user_id, type, title, body: bodyText, action_url })
    .select().maybeSingle();
  if (error || !notification) {
    console.error("[create-notification] insert_failed");
    return errorResponse("internal_error", 500);
  }
  return jsonResponse({ success: true, notification });
});
