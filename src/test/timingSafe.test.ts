import { describe, it, expect } from "vitest";
import { timingSafeEqualStrings } from "../../supabase/functions/_shared/timingSafe";

describe("timingSafeEqualStrings", () => {
  it("returns true for identical strings", async () => {
    expect(await timingSafeEqualStrings("hunter2", "hunter2")).toBe(true);
  });

  it("returns false for different strings of the same length", async () => {
    expect(await timingSafeEqualStrings("abcdef", "abcxef")).toBe(false);
  });

  it("returns false for strings of different length", async () => {
    expect(await timingSafeEqualStrings("short", "shortly")).toBe(false);
  });

  it("returns true for two empty strings", async () => {
    expect(await timingSafeEqualStrings("", "")).toBe(true);
  });

  it("returns false when only one side is empty", async () => {
    expect(await timingSafeEqualStrings("", "x")).toBe(false);
    expect(await timingSafeEqualStrings("x", "")).toBe(false);
  });
});
