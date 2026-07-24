import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PROFILE_CHECKOUT_COLUMNS } from "../../supabase/functions/create-stripe-checkout/index.ts";

// Regression: profiles has no `email` column; querying it fails at runtime.
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

function parseColumns(sel: string): string[] {
  return sel.split(",").map((s) => s.trim()).filter(Boolean);
}

describe("create-stripe-checkout profile columns", () => {
  it("does not select nonexistent profiles.email", () => {
    const cols = parseColumns(PROFILE_CHECKOUT_COLUMNS);
    expect(cols).not.toContain("email");
    for (const c of cols) expect(ALLOWED.has(c)).toBe(true);
  });

  it("source file uses only the shared constant for the profile SELECT", () => {
    const src = readFileSync(
      new URL("../../supabase/functions/create-stripe-checkout/index.ts", import.meta.url),
      "utf8",
    );
    // No literal SELECT list including email on profiles.
    expect(src).not.toMatch(/\.select\(["'`][^"'`]*\bemail\b[^"'`]*["'`]\)[\s\S]{0,120}from\(["']profiles["']\)/);
    expect(src).not.toMatch(/from\(["']profiles["']\)[\s\S]{0,120}\.select\(["'`][^"'`]*\bemail\b/);
  });
});
