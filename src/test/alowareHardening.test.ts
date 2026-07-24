import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const F = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const ALOWARE_ACTION_FUNCTIONS = [
  "supabase/functions/initiate-aloware-call/index.ts",
  "supabase/functions/send-aloware-sms/index.ts",
  "supabase/functions/create-aloware-lead/index.ts",
  "supabase/functions/lookup-aloware-contact/index.ts",
  "supabase/functions/add-to-aloware-powerdialer/index.ts",
  "supabase/functions/verify-aloware-connection/index.ts",
];

const ALL_ALOWARE_FUNCTIONS = [
  ...ALOWARE_ACTION_FUNCTIONS,
  "supabase/functions/aloware-webhook-receiver/index.ts",
  "supabase/functions/process-aloware-transcription/index.ts",
  "supabase/functions/sync-aloware-data/index.ts",
];

const FORBIDDEN_LOG_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "raw JSON.stringify of payload/body/error object", re: /console\.(log|error|warn)\([^)]*JSON\.stringify\([^)]*(payload|body|responseText|alowareData|alowareResult|leadPayload|result)/i },
  { label: "phone/email/name interpolated into log", re: /console\.(log|error|warn)\([^)]*\$\{[^}]*(phone|email|contactName|firstName|lastName|fullName|transcription|transcript|message)/i },
  { label: "provider response text logged", re: /console\.(log|error|warn)\([^)]*(responseText|alowareData|alowareResult|leadPayload)\b/ },
];

const FORBIDDEN_PERSIST_PATTERNS: Array<{ label: string; re: RegExp }> = [
  { label: "sync_log persists phoneNumber", re: /aloware_sync_log[\s\S]{0,400}?phoneNumber/ },
  { label: "sync_log persists contactPhoneNumber", re: /aloware_sync_log[\s\S]{0,400}?contactPhoneNumber/ },
  { label: "sync_log persists raw payload", re: /aloware_sync_log[\s\S]{0,400}?payload:\s*payload\b/ },
  { label: "sync_log persists provider error body", re: /aloware_sync_log[\s\S]{0,400}?JSON\.stringify\(alowareResult\)/ },
];

describe("Aloware hardening — no PII in logs", () => {
  for (const f of ALL_ALOWARE_FUNCTIONS) {
    it(`${f} does not log PII or raw provider bodies`, () => {
      const src = F(f);
      for (const { label, re } of FORBIDDEN_LOG_PATTERNS) {
        expect(re.test(src), `${f} still contains: ${label}`).toBe(false);
      }
    });
  }
});

describe("Aloware hardening — no PII persisted to aloware_sync_log", () => {
  for (const f of ALL_ALOWARE_FUNCTIONS) {
    it(`${f} does not persist PII to aloware_sync_log`, () => {
      const src = F(f);
      for (const { label, re } of FORBIDDEN_PERSIST_PATTERNS) {
        expect(re.test(src), `${f} still contains: ${label}`).toBe(false);
      }
    });
  }
});

describe("Aloware action endpoints — auth + rate limit + POST-only", () => {
  for (const f of ALLOWED_ACTION_ENDPOINTS()) {
    it(`${f} authenticates with authenticatePost`, () => {
      const src = F(f);
      expect(src).toMatch(/authenticatePost\(req\)/);
      expect(src).toMatch(/enforceRateLimit\(/);
      expect(src).toMatch(/readBoundedJson\(/);
    });
  }
});

function ALLOWED_ACTION_ENDPOINTS() {
  return ALOWARE_ACTION_FUNCTIONS;
}

describe("Aloware webhook — signature + POST + body cap", () => {
  const src = F("supabase/functions/aloware-webhook-receiver/index.ts");
  it("requires ALOWARE_WEBHOOK_SECRET", () => {
    expect(src).toMatch(/ALOWARE_WEBHOOK_SECRET/);
  });
  it("uses timingSafeEqualStrings against the header", () => {
    expect(src).toMatch(/timingSafeEqualStrings\(provided,\s*expectedSecret\)/);
  });
  it("rejects non-POST", () => {
    expect(src).toMatch(/method_not_allowed/);
  });
  it("bounds JSON body via readBoundedJson", () => {
    expect(src).toMatch(/readBoundedJson\(req/);
  });
  it("never persists raw payload", () => {
    expect(/aloware_sync_log[\s\S]{0,400}?payload:\s*payload\b/.test(src)).toBe(false);
  });
});

describe("process-aloware-transcription — service-only, timing-safe, bounded", () => {
  const src = F("supabase/functions/process-aloware-transcription/index.ts");
  it("compares the bearer token with timingSafeEqualStrings", () => {
    expect(src).toMatch(/timingSafeEqualStrings\(provided,\s*serviceKey\)/);
  });
  it("bounds the transcription length", () => {
    expect(src).toMatch(/MAX_TRANSCRIPT_CHARS/);
    expect(src).toMatch(/boundedText\(body\.transcription/);
  });
  it("validates callId as UUID", () => {
    expect(src).toMatch(/isUuid\(body\.callId\)/);
  });
  it("does not log the transcript", () => {
    expect(/console\.(log|error|warn)\([^)]*transcription/.test(src)).toBe(false);
  });
});

describe("sync-aloware-data — server-side team + management", () => {
  const src = F("supabase/functions/sync-aloware-data/index.ts");
  it("resolves team from the authenticated user, not the request body", () => {
    expect(src).toMatch(/from\('profiles'\)\.select\('team_id'\)\.eq\('user_id', authedUserId\)/);
  });
  it("enforces has_management_role", () => {
    expect(src).toMatch(/has_management_role/);
  });
  it("does not persist teamId/userId/results object into aloware_sync_log", () => {
    expect(/payload:\s*\{\s*teamId,\s*userId,\s*results\s*\}/.test(src)).toBe(false);
  });
});
