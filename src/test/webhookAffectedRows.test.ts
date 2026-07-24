import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const src = readFileSync(
  require("node:path").resolve(__dirname, "../../supabase/functions/stripe-webhook/index.ts"),
  "utf8",
);

describe("stripe-webhook affected-row enforcement", () => {
  it("applySubscription verifies exactly one team_billing row updated", () => {
    // Requires .select("team_id") chained on the update, and a length===1 guard.
    expect(src).toMatch(/from\("team_billing"\)\s*\.update\(patch\)[\s\S]{0,200}\.select\(["']team_id["']\)/);
    expect(src).toMatch(/updated\.length\s*!==\s*1[\s\S]{0,80}apply_failed/);
  });

  it("subscription.deleted verifies exactly one team_billing row updated", () => {
    // Two update+select blocks total (deleted + applySubscription).
    const matches = src.match(/\.select\(["']team_id["']\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("catch block checks the ledger fail-update error", () => {
    expect(src).toMatch(/error:\s*failErr[\s\S]{0,200}if\s*\(failErr\)/);
  });
});
