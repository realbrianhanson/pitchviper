import { describe, it, expect } from "vitest";

// Mirrors the validation the join-team-by-code / team-membership function uses.
const CODE_RE = /^[A-Z0-9]{6,10}$/;

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

describe("team code validation", () => {
  it("accepts legacy 6-char codes", () => {
    expect(CODE_RE.test("ABC123")).toBe(true);
  });
  it("accepts 10-char codes", () => {
    expect(CODE_RE.test("ABCDEF1234")).toBe(true);
  });
  it("rejects too short / too long", () => {
    expect(CODE_RE.test("ABC12")).toBe(false);
    expect(CODE_RE.test("ABCDEFGHIJK")).toBe(false);
  });
  it("rejects non-alphanumerics", () => {
    expect(CODE_RE.test("ABCD-12")).toBe(false);
  });
  it("normalizes user input", () => {
    expect(normalizeCode("  ab cd-ef 12 ")).toBe("ABCDEF12");
  });
});

describe("promo code normalization", () => {
  const codes = ["viper"];
  const check = (raw: string) => {
    if (typeof raw !== "string") return false;
    const t = raw.trim().toLowerCase();
    if (t.length < 3 || t.length > 40) return false;
    return codes.includes(t);
  };
  it("accepts the default code case-insensitively", () => {
    expect(check("Viper")).toBe(true);
    expect(check("  VIPER ")).toBe(true);
  });
  it("rejects empty and out-of-bounds inputs", () => {
    expect(check("")).toBe(false);
    expect(check("ab")).toBe(false);
    expect(check("x".repeat(41))).toBe(false);
  });
  it("rejects unknown codes", () => {
    expect(check("nope")).toBe(false);
  });
});
