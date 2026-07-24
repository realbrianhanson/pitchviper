import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Regression: profiles has no `email` column; querying it fails at runtime.
// We can't import the Deno function directly (Deno-only URL specifiers), so
// assert against the source text and a whitelist of real columns.
const src = readFileSync(
  new URL("../../supabase/functions/create-stripe-checkout/index.ts", import.meta.url),
  "utf8",
);

const ALLOWED = new Set([
  "user_id",
  "team_id",
  "full_name",
  "avatar_url",
  "role",
  "ghl_user_id",
  "aloware_user_id",
  "onboarding_completed",
  "is_demo",
  "last_coached_at",
]);

describe("create-stripe-checkout profile columns", () => {
  it("exports a PROFILE_CHECKOUT_COLUMNS constant with only real profile columns", () => {
    const m = src.match(/PROFILE_CHECKOUT_COLUMNS\s*=\s*"([^"]+)"/);
    expect(m, "PROFILE_CHECKOUT_COLUMNS constant must exist").not.toBeNull();
    const cols = m![1].split(",").map((s) => s.trim()).filter(Boolean);
    expect(cols).not.toContain("email");
    for (const c of cols) expect(ALLOWED.has(c)).toBe(true);
  });

  it("does not select profiles.email anywhere in the checkout function", () => {
    expect(src).not.toMatch(/\.select\([^)]*\bemail\b[^)]*\)[\s\S]{0,200}from\(["']profiles["']\)/);
    expect(src).not.toMatch(/from\(["']profiles["']\)[\s\S]{0,200}\.select\([^)]*\bemail\b/);
  });

  it("uses userData.user.email (not profile.email) for the Stripe customer", () => {
    expect(src).toMatch(/email:\s*userData\.user\.email/);
    expect(src).not.toMatch(/profile\??\.email/);
  });
});
