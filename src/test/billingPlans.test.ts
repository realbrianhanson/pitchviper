import { describe, it, expect } from "vitest";
import {
  PLANS,
  MIN_SEATS,
  getPlan,
  billableSeats,
  planTotal,
  annualSavingsPerSeat,
  computeTrialStatus,
  statusLabel,
  isPlanId,
  isBillingInterval,
  isSafeStripeUrl,
  formatUSD,
} from "@/lib/billingPlans";

describe("billingPlans", () => {
  it("has starter + growth with sensible prices", () => {
    expect(PLANS.map((p) => p.id).sort()).toEqual(["growth", "starter"]);
    expect(getPlan("starter").monthlyPerSeat).toBe(29);
    expect(getPlan("growth").monthlyPerSeat).toBe(49);
    expect(getPlan("growth").recommended).toBe(true);
  });

  it("enforces the 5-seat minimum and upper bound", () => {
    expect(billableSeats(0)).toBe(MIN_SEATS);
    expect(billableSeats(3)).toBe(MIN_SEATS);
    expect(billableSeats(7)).toBe(7);
    expect(billableSeats(99999)).toBe(500);
    expect(billableSeats(-1)).toBe(MIN_SEATS);
    expect(billableSeats(4.9)).toBe(MIN_SEATS);
  });

  it("computes totals with the minimum floor", () => {
    expect(planTotal(getPlan("starter"), "monthly", 3)).toBe(29 * 5);
    expect(planTotal(getPlan("growth"), "monthly", 8)).toBe(49 * 8);
    expect(planTotal(getPlan("growth"), "annual", 5)).toBe(490 * 5);
  });

  it("annual saves 2 months per seat", () => {
    expect(annualSavingsPerSeat(getPlan("starter"))).toBe(29 * 12 - 290);
    expect(annualSavingsPerSeat(getPlan("growth"))).toBe(49 * 12 - 490);
  });

  it("trial status computes days remaining and rejects invalid dates", () => {
    const now = new Date("2026-01-10T00:00:00Z");
    const t = computeTrialStatus("2026-01-15T00:00:00Z", now);
    expect(t.active).toBe(true);
    expect(t.daysRemaining).toBe(5);
    expect(computeTrialStatus("2026-01-01T00:00:00Z", now).active).toBe(false);
    expect(computeTrialStatus(null).active).toBe(false);
    expect(computeTrialStatus("not-a-date").active).toBe(false);
  });

  it("labels statuses safely", () => {
    expect(statusLabel("active")).toBe("Active");
    expect(statusLabel("past_due")).toBe("Past due");
    expect(statusLabel("trialing")).toBe("Trial");
    expect(statusLabel("something-weird")).toBe("Unknown");
    expect(statusLabel(null)).toBe("Unknown");
  });

  it("whitelists plan + interval", () => {
    expect(isPlanId("starter")).toBe(true);
    expect(isPlanId("growth")).toBe(true);
    expect(isPlanId("enterprise")).toBe(false);
    expect(isPlanId(42)).toBe(false);
    expect(isBillingInterval("monthly")).toBe(true);
    expect(isBillingInterval("annual")).toBe(true);
    expect(isBillingInterval("yearly")).toBe(false);
  });

  it("only allows https stripe.com hosts", () => {
    expect(isSafeStripeUrl("https://checkout.stripe.com/c/pay/abc")).toBe(true);
    expect(isSafeStripeUrl("https://billing.stripe.com/p/session/x")).toBe(true);
    expect(isSafeStripeUrl("https://foo.stripe.com/x")).toBe(true);
    expect(isSafeStripeUrl("https://evil.com/checkout.stripe.com")).toBe(false);
    expect(isSafeStripeUrl("http://checkout.stripe.com/c/pay/abc")).toBe(false);
    expect(isSafeStripeUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeStripeUrl("not-a-url")).toBe(false);
  });

  it("formats USD with no cents", () => {
    expect(formatUSD(29)).toBe("$29");
    expect(formatUSD(1234)).toBe("$1,234");
  });
});
