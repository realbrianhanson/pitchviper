import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const teamMembership = readFileSync(
  resolve("supabase/functions/team-membership/index.ts"),
  "utf-8",
);
const validatePromo = readFileSync(
  resolve("supabase/functions/validate-promo-code/index.ts"),
  "utf-8",
);
const useCallLogging = readFileSync(
  resolve("src/hooks/useCallLogging.ts"),
  "utf-8",
);
const useGauntlet = readFileSync(resolve("src/hooks/useGauntlet.ts"), "utf-8");
const stepAccess = readFileSync(
  resolve("src/components/onboarding/StepAccess.tsx"),
  "utf-8",
);
const onboardingPage = readFileSync(resolve("src/pages/Onboarding.tsx"), "utf-8");

describe("team-membership edge function", () => {
  it("delegates join and create to the service-only RPCs (never inserts teams directly)", () => {
    expect(teamMembership).toContain('service.rpc("svc_join_team_by_code"');
    expect(teamMembership).toContain('service.rpc("svc_create_team"');
    expect(teamMembership).not.toMatch(/service\.from\(["']teams["']\)\.insert/);
  });
  it("is POST-only and returns 405 otherwise", () => {
    expect(teamMembership).toContain('req.method !== "POST"');
    expect(teamMembership).toMatch(/method_not_allowed/);
  });
  it("validates codes with the shared 6-10 alphanumeric regex", () => {
    expect(teamMembership).toContain("/^[A-Z0-9]{6,10}$/");
  });
  it("validates the rpc result shape before returning", () => {
    expect(teamMembership).toMatch(/structuredResult\(data\)/);
  });
  it("maps only allow-listed error codes and never leaks exception text", () => {
    expect(teamMembership).toContain("KNOWN_ERRORS");
    // No raw error object interpolation into the JSON response
    expect(teamMembership).not.toMatch(/error:\s*error\.message/);
    expect(teamMembership).not.toMatch(/JSON\.stringify\(error\)/);
  });
});

describe("validate-promo-code edge function", () => {
  it("has no hard-coded fallback promo codes", () => {
    // No literal 'viper' anywhere in the source path.
    expect(validatePromo.toLowerCase()).not.toContain('"viper"');
    expect(validatePromo.toLowerCase()).not.toContain("'viper'");
    expect(validatePromo).not.toMatch(/DEFAULT_PROMO_CODES/);
  });
  it("returns 503 access_not_configured when no codes are configured", () => {
    expect(validatePromo).toContain("access_not_configured");
    expect(validatePromo).toMatch(/json\(503/);
  });
  it("uses the constant-time comparison helper", () => {
    expect(validatePromo).toContain("timingSafeEqualStrings");
  });
  it("requires exactly one affected profile row after the service-role update", () => {
    expect(validatePromo).toContain('.select("user_id")');
    expect(validatePromo).toContain("updated.length !== 1");
  });
  it("is POST-only", () => {
    expect(validatePromo).toContain('req.method !== "POST"');
  });
});

describe("client never writes promo_validated", () => {
  it("StepAccess does not update promo_validated on profiles", () => {
    expect(stepAccess).not.toMatch(/promo_validated/);
  });
  it("Onboarding final save writes only whitelisted profile columns", () => {
    const finalSaveIndex = onboardingPage.indexOf("handleFinalComplete");
    expect(finalSaveIndex).toBeGreaterThan(-1);
    const finalSave = onboardingPage.slice(finalSaveIndex, finalSaveIndex + 900);
    // Sensitive tenant/promo fields must never appear in the client update payload.
    expect(finalSave).not.toMatch(/team_id\s*:/);
    expect(finalSave).not.toMatch(/promo_validated/);
    expect(finalSave).not.toMatch(/xp_points/);
  });
});

describe("event-bound XP awards", () => {
  it("useCallLogging awards XP through award_event_xp with the inserted call id", () => {
    expect(useCallLogging).toContain("award_event_xp");
    expect(useCallLogging).toContain("_reason: 'call_logged'");
    expect(useCallLogging).toContain("_source_id: call.id");
    expect(useCallLogging).not.toMatch(/award_user_xp/);
  });
  it("useGauntlet awards XP with the completion id and shows amount only when newly awarded", () => {
    expect(useGauntlet).toContain("award_event_xp");
    expect(useGauntlet).toContain("_reason: 'gauntlet_passed'");
    expect(useGauntlet).toContain("_source_id: completionId");
    expect(useGauntlet).not.toMatch(/award_user_xp/);
    // Only newly-awarded results show the toast (guard on awarded flag).
    expect(useGauntlet).toMatch(/\.awarded\b/);
  });
});
