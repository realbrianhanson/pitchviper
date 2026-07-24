/**
 * Source-aware coverage test: every edge function classified as
 * "starter" or "growth" must import + call requireTeamEntitlement (or
 * checkTeamEntitlementByTeamId for signed webhooks).
 *
 * Fails if the classification map drifts from the actual function tree.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Mirror of supabase/functions/_shared/endpointClassification.ts
const CLASSIFICATION: Record<string, "starter" | "growth" | "recovery" | "auth" | "webhook"> = {
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
  "manage-aloware-integration": "starter",

  // recovery / auth / webhook — no entitlement gate
  "create-stripe-checkout": "recovery",
  "create-stripe-portal": "recovery",
  "stripe-webhook": "recovery",
  "update-stripe-seats": "recovery",
  "create-team-member": "auth",
  "team-membership": "auth",
  "validate-promo-code": "auth",
  "aloware-webhook-receiver": "webhook",
  "ghl-webhook": "webhook",
  "process-aloware-transcription": "webhook",
};

const FUNCS_DIR = join(process.cwd(), "supabase/functions");

function readIndex(name: string): string | null {
  const p = join(FUNCS_DIR, name, "index.ts");
  return existsSync(p) ? readFileSync(p, "utf8") : null;
}

describe("endpoint classification coverage", () => {
  it("every function on disk is classified", () => {
    const dirs = readdirSync(FUNCS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    const unclassified = dirs.filter((n) => !(n in CLASSIFICATION));
    expect(unclassified).toEqual([]);
  });

  it("starter/growth endpoints call requireTeamEntitlement", () => {
    const missing: string[] = [];
    for (const [name, tier] of Object.entries(CLASSIFICATION)) {
      if (tier !== "starter" && tier !== "growth") continue;
      const src = readIndex(name);
      if (!src) {
        missing.push(`${name}: file missing`);
        continue;
      }
      if (!src.includes("requireTeamEntitlement(")) {
        missing.push(`${name}: no requireTeamEntitlement call`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("growth endpoints request the growth tier", () => {
    const wrong: string[] = [];
    for (const [name, tier] of Object.entries(CLASSIFICATION)) {
      if (tier !== "growth") continue;
      const src = readIndex(name);
      if (!src) continue;
      if (!/requireTeamEntitlement\([^)]*"growth"/.test(src)) {
        wrong.push(name);
      }
    }
    expect(wrong).toEqual([]);
  });

  it("signed webhooks that write on behalf of a team gate via checkTeamEntitlementByTeamId", () => {
    // ghl-webhook writes via DB triggers only; aloware-webhook-receiver and
    // process-aloware-transcription mint AI/writes and MUST gate.
    const gated = ["aloware-webhook-receiver", "process-aloware-transcription"];
    for (const name of gated) {
      const src = readIndex(name) ?? "";
      expect(src.includes("checkTeamEntitlementByTeamId")).toBe(true);
    }
  });

  it("recovery endpoints do NOT gate on entitlement", () => {
    const leaked: string[] = [];
    for (const [name, tier] of Object.entries(CLASSIFICATION)) {
      if (tier !== "recovery") continue;
      const src = readIndex(name);
      if (src && src.includes("requireTeamEntitlement(")) leaked.push(name);
    }
    expect(leaked).toEqual([]);
  });
});
