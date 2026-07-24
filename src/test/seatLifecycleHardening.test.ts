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

  it("uses a single checked finalize helper on both success paths", () => {
    // Both fresh and re-invite success paths must go through finalizeReservation
    // so consumed=true is only set when the RPC returned data===true and no error.
    const calls = createMemberSrc.match(/finalizeReservation\(\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // The helper checks the RPC result explicitly.
    expect(createMemberSrc).toMatch(/data === true/);
    expect(createMemberSrc).toMatch(/consumed = true/);
    // Never blindly assume success from svc_consume_reservation.
    expect(createMemberSrc).not.toMatch(
      /svc_consume_reservation[\s\S]{0,200}?\.catch\(\(\) => \{\}\);\s*consumed = true/,
    );
  });

  it("cleans up and returns invite_failed if consuming the reservation fails", () => {
    expect(createMemberSrc).toMatch(/reservation_finalize_failed/);
    // Failure path releases and returns invite_failed instead of silently
    // marking the seat consumed.
    expect(createMemberSrc).toMatch(
      /svc_release_reservation[\s\S]{0,400}?reservation_finalize_failed[\s\S]{0,200}?code: "invite_failed"/,
    );
  });

  it("releases the reservation in a finally block on any failure path", () => {
    expect(createMemberSrc).toMatch(/svc_release_reservation/);
    expect(createMemberSrc).toMatch(/} finally {\s*await release\(\);/);
  });

  it("outer catch logs only a stable code and never leaks an exception message", () => {
    expect(createMemberSrc).toMatch(/} catch {\s*\n\s*console\.log[\s\S]*?status: "exception"/);
    expect(createMemberSrc).not.toMatch(/err\.message/);
    expect(createMemberSrc).not.toMatch(/msg\.slice/);
  });

  it("supports resend-invite for existing invited users", () => {
    expect(createMemberSrc).toMatch(/action: z\.literal\("resend-invite"\)/);
  });
});

const licensedSeatsSrc = readFileSync(
  resolve(__dirname, "../../src/components/billing/LicensedSeats.tsx"),
  "utf-8",
);

describe("LicensedSeats validation", () => {
  it("does not silently clamp user input before submitting", () => {
    // The old implementation submitted a `clamped` value; the new one sends
    // exact `seats` and refuses to submit when out of range.
    expect(licensedSeatsSrc).not.toMatch(/body:\s*\{\s*seats:\s*clamped\s*\}/);
    expect(licensedSeatsSrc).toMatch(/body:\s*\{\s*seats\s*\}/);
  });

  it("computes a valid flag as integer && seats>=max(5,used) && seats<=500", () => {
    expect(licensedSeatsSrc).toMatch(/Number\.isInteger\(seats\)/);
    expect(licensedSeatsSrc).toMatch(/seats >= minAllowed/);
    expect(licensedSeatsSrc).toMatch(/seats <= MAX_SEATS/);
    expect(licensedSeatsSrc).toMatch(/Math\.max\(MIN_SEATS, used\)/);
  });

  it("disables submit and surfaces inline validation when invalid", () => {
    expect(licensedSeatsSrc).toMatch(/disabled = [^;]*!valid/);
    expect(licensedSeatsSrc).toMatch(/validationMessage/);
    expect(licensedSeatsSrc).toMatch(/aria-invalid=\{!valid\}/);
  });

  it("preserves the useEffect that syncs the input with the authoritative limit", () => {
    expect(licensedSeatsSrc).toMatch(/useEffect\(\(\) => \{\s*setSeats\(initial\);/);
  });

  it("keeps the estimate and per-seat proration copy", () => {
    expect(licensedSeatsSrc).toMatch(/Estimated:/);
    expect(licensedSeatsSrc).toMatch(/perSeatPrice/);
    expect(licensedSeatsSrc).toMatch(/formatUSD\(perSeat\)/);
  });
});
