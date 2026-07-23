import { describe, it, expect } from "vitest";
import { isNavItemActive } from "@/components/layout/AppSidebar";

describe("isNavItemActive", () => {
  it("matches /app exactly and does not activate on other routes", () => {
    expect(isNavItemActive("/app", "/app", true)).toBe(true);
    expect(isNavItemActive("/app/anything", "/app", true)).toBe(false);
    expect(isNavItemActive("/war-room", "/app", true)).toBe(false);
  });

  it("matches /manager exactly so /manager/competitions does not double-highlight it", () => {
    expect(isNavItemActive("/manager", "/manager", true)).toBe(true);
    expect(isNavItemActive("/manager/competitions", "/manager", true)).toBe(false);
    expect(isNavItemActive("/manager/competitions", "/manager/competitions", false)).toBe(true);
  });

  it("prefix-matches nested routes for non-exact items", () => {
    expect(isNavItemActive("/roleplay/scenario-1", "/roleplay", false)).toBe(true);
    expect(isNavItemActive("/roleplay", "/roleplay", false)).toBe(true);
    expect(isNavItemActive("/roleplay-other", "/roleplay", false)).toBe(false);
  });
});
