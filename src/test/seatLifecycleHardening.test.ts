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

  it("validates the subscription price against known configured plans", () => {
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

  it("rejects subs that are not active/trialing/past_due at Stripe", () => {
    expect(src).toMatch(/\["active", "trialing", "past_due"\]\.includes\(sub\.status\)/);
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
