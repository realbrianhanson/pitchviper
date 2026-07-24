// Source-owned classification of every app edge function.
// A failing test parses this file + the supabase/functions tree and fails on
// any drift (unclassified function, or classified function missing gating).
//
// Tiers:
//   "growth"      → requireTeamEntitlement(service, uid, "growth")
//   "starter"     → requireTeamEntitlement(service, uid, "starter")
//   "recovery"    → Stripe checkout/portal/webhook, promo validate; never gated
//   "auth"        → team creation / join / onboarding paths; not gated
//   "webhook"     → provider webhooks; gate their team-mapped writes
//                   in-function after the signed-webhook mapping.

export type EndpointTier = "growth" | "starter" | "recovery" | "auth" | "webhook";

export const ENDPOINT_CLASSIFICATION: Record<string, EndpointTier> = {
  // ─── Growth-only paid AI ──────────────────────────────────────────────
  "generate-ai-coach-insights": "growth",
  "generate-coaching-insights": "growth",
  "generate-performance-insights": "growth",
  "generate-manager-insights": "growth",
  "generate-forecast": "growth",
  "calculate-deal-momentum": "growth",
  "analyze-deal": "growth",
  "research-prospect": "growth",
  "perplexity-research": "growth",
  "generate-battlecard": "growth",
  "generate-daily-gauntlet": "growth",
  "evaluate-gauntlet": "growth",

  // ─── Starter (active/trial) required ─────────────────────────────────
  "roleplay-chat": "starter",
  "roleplay-analyze": "starter",
  "roleplay-voice-analyze": "starter",
  "roleplay-append-transcript": "starter",
  "roleplay-abandon-session": "starter",
  "transcribe-voice-response": "starter",
  "score-objection-response": "starter",
  "generate-objection-speech": "starter",
  "generate-achievement-image": "starter",
  "get-dashboard-data": "starter",
  "get-call-analytics": "starter",
  "calculate-leaderboard": "starter",
  "check-badge-eligibility": "starter",
  "create-notification": "starter",
  "elevenlabs-roleplay-token": "starter",
  "add-to-aloware-powerdialer": "starter",
  "create-aloware-lead": "starter",
  "initiate-aloware-call": "starter",
  "lookup-aloware-contact": "starter",
  "send-aloware-sms": "starter",
  "verify-aloware-connection": "starter",
  "sync-aloware-data": "starter",

  // ─── Recovery / never gated ──────────────────────────────────────────
  "create-stripe-checkout": "recovery",
  "create-stripe-portal": "recovery",
  "stripe-webhook": "recovery",
  "update-stripe-seats": "recovery",
  "validate-promo-code": "recovery",

  // ─── Auth / team lifecycle (never gated) ─────────────────────────────
  "team-membership": "auth",
  "create-team-member": "auth",

  // ─── Signed provider webhooks (gate mapped-team writes) ──────────────
  "aloware-webhook-receiver": "webhook",
  "ghl-webhook": "webhook",
  "process-aloware-transcription": "webhook",
};

export function requiredMinTier(name: string): "starter" | "growth" | null {
  const c = ENDPOINT_CLASSIFICATION[name];
  if (c === "growth" || c === "starter") return c;
  return null;
}
