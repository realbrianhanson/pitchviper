import { describe, it, expect } from "vitest";
import { GROWTH_ROUTES, isGrowthRoute } from "@/lib/featureGates";
import { isGrowthTier, trialDaysRemaining, type Entitlement } from "@/hooks/useEntitlement";

const base: Entitlement = {
  access: true,
  reason: "active",
  plan: "growth",
  tier: "growth",
  interval: "monthly",
  status: "active",
  trial_ends_at: null,
  current_period_end: null,
  cancel_at_period_end: false,
  seat_limit: 10,
  used_seats: 3,
  can_manage: true,
};

describe("featureGates", () => {
  it("gates AI Coach and Competitions as Growth-only", () => {
    expect(isGrowthRoute("/ai-coach")).toBe(true);
    expect(isGrowthRoute("/manager/competitions")).toBe(true);
  });
  it("does not gate always-available routes", () => {
    expect(isGrowthRoute("/dashboard")).toBe(false);
    expect(isGrowthRoute("/roleplay")).toBe(false);
    expect(isGrowthRoute("/billing")).toBe(false);
    expect(isGrowthRoute("/onboarding")).toBe(false);
    expect(isGrowthRoute("/settings")).toBe(false);
  });
  it("has a stable Growth-only surface", () => {
    expect(GROWTH_ROUTES.size).toBeGreaterThan(0);
  });
});

describe("useEntitlement helpers", () => {
  it("isGrowthTier requires access AND growth tier", () => {
    expect(isGrowthTier(base)).toBe(true);
    expect(isGrowthTier({ ...base, tier: "starter" })).toBe(false);
    expect(isGrowthTier({ ...base, access: false })).toBe(false);
    expect(isGrowthTier(null)).toBe(false);
    expect(isGrowthTier(undefined)).toBe(false);
  });

  it("trialDaysRemaining returns 0 unless reason==='trial' with future date", () => {
    expect(trialDaysRemaining({ ...base, reason: "active", trial_ends_at: null })).toBe(0);
    expect(trialDaysRemaining({ ...base, reason: "trial", trial_ends_at: null })).toBe(0);
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(trialDaysRemaining({ ...base, reason: "trial", trial_ends_at: past })).toBe(0);
    const future = new Date(Date.now() + 3 * 86400000 + 60000).toISOString();
    const d = trialDaysRemaining({ ...base, reason: "trial", trial_ends_at: future });
    expect(d).toBeGreaterThanOrEqual(3);
    expect(d).toBeLessThanOrEqual(4);
  });

  it("does not surface trial days when subscription is active", () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString();
    expect(
      trialDaysRemaining({ ...base, reason: "active", trial_ends_at: future }),
    ).toBe(0);
  });
});
