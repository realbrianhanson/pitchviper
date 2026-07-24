import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const src = readFileSync(
  resolve(__dirname, "../../supabase/functions/update-stripe-seats/index.ts"),
  "utf-8",
);

describe("update-stripe-seats hardening", () => {
  it("uses shared authenticatePost for JWT + POST enforcement", () => {
    expect(src).toMatch(/authenticatePost/);
    expect(src).toMatch(/from ["']\.\.\/_shared\/edgeAuth\.ts["']/);
  });

  it("selects the stored plan/interval/price triple from team_billing", () => {
    expect(src).toMatch(/stripe_price_id/);
    expect(src).toMatch(/billing_interval/);
    expect(src).toMatch(/plan/);
  });

  it("requires the stored price to match a currently configured known plan price", () => {
    expect(src).toMatch(/resolvePriceId\(/);
    expect(src).toMatch(/priceToPlan\(/);
    expect(src).toMatch(/error: "invalid_plan"/);
  });

  it("clamps the seat count strictly to [max(5, used), 500]", () => {
    expect(src).toMatch(/MIN_SEATS/);
    expect(src).toMatch(/MAX_SEATS/);
    expect(src).toMatch(/Math\.max\(MIN_SEATS, used\)/);
    expect(src).toMatch(/seats_below_used/);
    expect(src).toMatch(/seats_above_max/);
  });

  it("uses effective_seat_usage (includes pending invites) for the floor", () => {
    expect(src).toMatch(/effective_seat_usage/);
  });

  it("passes a deterministic idempotency key to Stripe", () => {
    expect(src).toMatch(/idempotencyKey/);
    expect(src).toMatch(/seats:\$\{billing\.stripe_subscription_id\}:\$\{item\.id\}:\$\{desired\}/);
  });

  it("verifies the team_billing row was updated (count exact)", () => {
    expect(src).toMatch(/count: "exact"/);
    expect(src).toMatch(/apply_failed/);
  });

  it("rejects past_due at both the DB status and Stripe status checks", () => {
    // Past-due should NOT be treated as an active state anywhere.
    expect(src).not.toMatch(/\["active", "trialing", "past_due"\]/);
    // Active-status guard is centralized and past_due is excluded.
    expect(src).toMatch(/ACTIVE_STATUSES\s*=\s*\[\s*"active"\s*,\s*"trialing"\s*\]/);
    // Both DB and Stripe status paths route non-active statuses to
    // subscription_inactive so the client can direct the user to the Portal.
    expect(src).toMatch(/isActiveStatus\(billing\.status\)/);
    expect(src).toMatch(/isActiveStatus\(sub\.status\)/);
  });

  it("finds exactly one seat item whose price.id matches the stored price", () => {
    expect(src).toMatch(/seatItems\s*=\s*allItems\.filter/);
    expect(src).toMatch(/i\.price\.id === storedPriceId/);
    expect(src).toMatch(/seatItems\.length !== 1/);
    // Must not require the whole subscription to have exactly one item;
    // add-on items are permitted.
    expect(src).not.toMatch(/items\.length\s*!==\s*1/);
  });

  it("verifies the returned subscription id, status, item, price, and quantity", () => {
    expect(src).toMatch(/updated\.id !== billing\.stripe_subscription_id/);
    expect(src).toMatch(/isActiveStatus\(updated\.status\)/);
    expect(src).toMatch(/returnedSeatItems/);
    expect(src).toMatch(/i\.id === item\.id/);
    expect(src).toMatch(/i\.price\.id === storedPriceId/);
    expect(src).toMatch(/returnedQty !== desired/);
    expect(src).toMatch(/provider_mismatch/);
  });

  it("logs only a stable code on internal errors (no err.message)", () => {
    // Catch block must not reference err.message or an Error variable body.
    expect(src).toMatch(/} catch {\s*\n[\s\S]*?fn: "update-stripe-seats", code: "internal_error"/);
    expect(src).not.toMatch(/\(err as Error\)\.message/);
    expect(src).not.toMatch(/err\.message/);
  });
});

const createMemberSrc = readFileSync(
  resolve(__dirname, "../../supabase/functions/create-team-member/index.ts"),
  "utf-8",
);

describe("create-team-member seat reservation lifecycle", () => {
  it("hashes (team, email) into the reservation target", () => {
    expect(createMemberSrc).toMatch(/crypto\.subtle\.digest\([\s\S]*?"SHA-256"/);
    expect(createMemberSrc).toMatch(/\$\{teamId\}:\$\{email\}/);
  });

  it("reserves a seat via svc_reserve_seat before touching auth", () => {
    expect(createMemberSrc).toMatch(/svc_reserve_seat/);
    expect(createMemberSrc).toMatch(/p_target_hash: targetHash/);
  });

  it("maps seat_limit_reached to 409 and other refusals to 402", () => {
    expect(createMemberSrc).toMatch(/seat_limit_reached.*409.*402/s);
  });

  it("consumes the reservation on both fresh and re-invite success paths", () => {
    const consumes = createMemberSrc.match(/svc_consume_reservation/g) ?? [];
    expect(consumes.length).toBeGreaterThanOrEqual(2);
  });

  it("releases the reservation in a finally block on any failure path", () => {
    expect(createMemberSrc).toMatch(/svc_release_reservation/);
    expect(createMemberSrc).toMatch(/} finally {\s*await release\(\);/);
  });

  it("supports resend-invite for existing invited users", () => {
    expect(createMemberSrc).toMatch(/action: z\.literal\("resend-invite"\)/);
  });
});
