/**
 * Source-aware audit for the enterprise security pass. Parses
 * supabase/config.toml, categorises every `verify_jwt = false` function, and
 * asserts each satisfies the correct hardening contract. Complements — does
 * not replace — the earlier paidEndpointHardening / alowareHardening suites.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const FN_DIR = "supabase/functions";
const CONFIG = readFileSync("supabase/config.toml", "utf8");

function verifyJwtFalseFunctions(): string[] {
  const names: string[] = [];
  const lines = CONFIG.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^\[functions\.([a-z0-9-]+)\]/);
    if (m && lines[i + 1] && /verify_jwt\s*=\s*false/.test(lines[i + 1])) {
      names.push(m[1]);
    }
  }
  return names;
}

const NAMES = verifyJwtFalseFunctions();

// Endpoints that are secret/signature-verified webhooks or service-to-service.
const WEBHOOK_OR_SERVICE = new Set([
  "aloware-webhook-receiver",
  "stripe-webhook",
  "process-aloware-transcription",
  "calculate-deal-momentum", // may be called by user OR scheduler (uses authenticatePostOrService)
  "create-notification",     // uses authenticatePostOrService
]);

// AI/provider endpoints that must rate-limit and bound inputs.
const AI_ENDPOINTS = new Set([
  "roleplay-chat", "roleplay-analyze", "roleplay-voice-analyze",
  "score-objection-response", "transcribe-voice-response",
  "evaluate-gauntlet", "generate-daily-gauntlet",
  "generate-performance-insights", "generate-manager-insights",
  "generate-achievement-image", "generate-objection-speech",
  "perplexity-research", "research-prospect", "generate-battlecard",
  "analyze-deal", "generate-forecast",
]);

function src(name: string): string {
  const path = join(FN_DIR, name, "index.ts");
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

describe("verify_jwt=false coverage", () => {
  it("discovers every function directory that config.toml references", () => {
    expect(NAMES.length).toBeGreaterThanOrEqual(30);
    const dirs = new Set(readdirSync(FN_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("_")).map((d) => d.name));
    for (const n of NAMES) expect(dirs.has(n)).toBe(true);
  });

  it("every non-webhook endpoint self-authenticates", () => {
    for (const name of NAMES) {
      if (WEBHOOK_OR_SERVICE.has(name)) continue;
      const s = src(name);
      const hasSelfAuth =
        /authenticatePost\(/.test(s) ||
        /authenticatePostOrService\(/.test(s) ||
        /authClient\.auth\.getUser\(\)/.test(s) ||
        /supabase\.auth\.getUser\(/.test(s) ||
        /\/auth\/v1\/user/.test(s);
      expect(hasSelfAuth, `${name} must self-authenticate`).toBe(true);
    }
  });

  it("webhook/service endpoints verify secret or signature", () => {
    const stripe = src("stripe-webhook");
    expect(stripe).toMatch(/stripe-signature/i);
    const aloware = src("aloware-webhook-receiver");
    expect(aloware).toMatch(/ALOWARE_WEBHOOK_SECRET|timingSafeEqual/);
    const proc = src("process-aloware-transcription");
    expect(proc).toMatch(/timingSafeEqual|SERVICE_ROLE_KEY/);
  });
});

describe("AI/provider endpoint hardening", () => {
  it.each([...AI_ENDPOINTS])("%s rate-limits and returns generic errors", (name) => {
    const s = src(name);
    expect(s.length, `${name} source missing`).toBeGreaterThan(0);
    expect(s, `${name} needs enforceRateLimit`).toMatch(/enforceRateLimit/);
    // Never return raw error.message to the client.
    expect(s).not.toMatch(/error:\s*errorMessage(?![A-Za-z_])/);
    expect(s).not.toMatch(/error:\s*error\.message/);
    expect(s).not.toMatch(/error\s+instanceof\s+Error\s*\?\s*error\.message/);
  });

  it.each([...AI_ENDPOINTS])("%s enforces POST-only", (name) => {
    const s = src(name);
    // Either an inline method guard OR the shared authenticatePost/authenticatePostOrService helper
    // (which both reject non-POST with method_not_allowed).
    const hasPostGuard =
      /method !== ['"]POST['"]/.test(s) ||
      /method_not_allowed/.test(s) ||
      /authenticatePost\(/.test(s) ||
      /authenticatePostOrService\(/.test(s);
    expect(hasPostGuard, `${name} must enforce POST-only`).toBe(true);
  });
});

describe("SSRF and input bounding", () => {
  it("research-prospect uses SSRF-safe URL validator and bounded body", () => {
    const s = src("research-prospect");
    expect(s).toMatch(/safeExternalUrl/);
    expect(s).toMatch(/readBoundedJson/);
    // No raw URL logging.
    expect(s).not.toMatch(/console\.(log|error)\(['"][^'"]*['"],\s*\{\s*url/);
    expect(s).not.toMatch(/console\.(log|error)\([^)]*contactLinkedinUrl/);
  });

  it("ssrfSafe rejects loopback, private, credentials, and non-http schemes", async () => {
    const mod = await import("../../supabase/functions/_shared/ssrfSafe.ts");
    const bad = [
      "http://127.0.0.1/", "http://localhost/", "http://10.0.0.1/",
      "http://192.168.1.1/", "http://169.254.169.254/latest",
      "http://[::1]/", "http://user:pw@example.com/",
      "file:///etc/passwd", "ftp://example.com",
      "http://metadata.google.internal/", "http://foo.local/",
    ];
    for (const u of bad) expect(mod.safeExternalUrl(u).ok, `should reject ${u}`).toBe(false);
    const good = ["https://example.com", "https://sub.example.co.uk/path?q=1"];
    for (const u of good) expect(mod.safeExternalUrl(u).ok, `should accept ${u}`).toBe(true);
  });
});

describe("No detailed error / PII logging patterns", () => {
  const FORBIDDEN = [
    /errorText\s*=\s*await\s+[a-zA-Z]+Response?\.text\(\);\s*console\.error\([^)]*errorText/,
    /console\.error\(['"]Perplexity API error:['"],\s*[^,)]+,\s*errorText/,
    /console\.error\(['"]ElevenLabs error:['"],\s*[^,)]+,\s*errorText/,
    /console\.error\(['"]AI Gateway error:['"],\s*[^,)]+,\s*errorText/,
  ];
  it.each(NAMES)("%s contains no forbidden error-body log patterns", (name) => {
    const s = src(name);
    for (const pat of FORBIDDEN) expect(s).not.toMatch(pat);
  });

  it("create-notification uses timing-safe service-or-user auth", () => {
    const s = src("create-notification");
    expect(s).toMatch(/authenticatePostOrService|timingSafeEqual/);
    expect(s).toMatch(/enforceRateLimit/);
    expect(s).toMatch(/target_user_id !== userId/);
  });
});

describe("Migration: anon revokes", () => {
  const migDir = "supabase/migrations";
  const files = readdirSync(migDir)
    .filter((f) => f.endsWith(".sql") && f.includes("defense_in_depth_revokes"))
    .sort();
  const latest = files[files.length - 1];
  const sql = readFileSync(join(migDir, latest), "utf8");

  it("revokes anon on tenant-sensitive tables", () => {
    for (const t of [
      "user_gauntlet_completions", "roleplay_sessions", "aloware_sync_log",
      "calls", "sms_messages", "deals", "activities", "notifications",
      "coaching_sessions", "coaching_actions",
    ]) {
      expect(sql, `must revoke anon on ${t}`).toMatch(
        new RegExp(`REVOKE ALL ON public\\.${t} FROM anon`),
      );
    }
  });

  it("revokes TRUNCATE/REFERENCES/TRIGGER from anon+authenticated on sensitive tables", () => {
    expect(sql).toMatch(/REVOKE TRUNCATE, REFERENCES, TRIGGER ON public\.calls FROM anon, authenticated/);
    expect(sql).toMatch(/REVOKE TRUNCATE, REFERENCES, TRIGGER ON public\.profiles FROM anon, authenticated/);
    expect(sql).toMatch(/REVOKE TRUNCATE, REFERENCES, TRIGGER ON public\.team_billing FROM anon, authenticated/);
  });

  it("removes DELETE on calls and sms_messages from authenticated", () => {
    expect(sql).toMatch(/REVOKE DELETE ON public\.calls FROM authenticated/);
    expect(sql).toMatch(/REVOKE DELETE ON public\.sms_messages FROM authenticated/);
  });
});

describe("Billing UX correction", () => {
  const billing = readFileSync("src/pages/Billing.tsx", "utf8");

  it("shows Manage billing only when stripe_customer_id present", () => {
    expect(billing).toMatch(/snapshot\?\.billing\?\.stripe_customer_id\s*\?/);
    // The old unconditional-on-hasActiveSub gate for the button is gone.
    expect(billing).not.toMatch(/\{hasActiveSub && \(\s*<div className="mt-6">\s*<button[\s\S]{0,200}Manage billing/);
  });

  it("uses mobile-safe interval label on small screens", () => {
    expect(billing).toMatch(/Annual · save 17%/);
    expect(billing).toMatch(/Annual · 2 months free/);
    expect(billing).toMatch(/sm:hidden[\s\S]{0,60}Annual · save 17%/);
    expect(billing).toMatch(/hidden sm:inline[\s\S]{0,60}Annual · 2 months free/);
  });
});
