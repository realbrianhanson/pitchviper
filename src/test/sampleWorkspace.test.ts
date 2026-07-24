import { describe, expect, it } from "vitest";
import { SAMPLE_WORKSPACE, sampleTotals } from "@/lib/sampleWorkspace";

describe("sampleWorkspace fixtures", () => {
  it("has at least 6 fictional reps, all with sample-rep- IDs", () => {
    expect(SAMPLE_WORKSPACE.reps.length).toBeGreaterThanOrEqual(6);
    for (const rep of SAMPLE_WORKSPACE.reps) {
      expect(rep.id.startsWith("sample-rep-")).toBe(true);
    }
  });

  it("freezes the workspace and nested collections against mutation", () => {
    expect(Object.isFrozen(SAMPLE_WORKSPACE)).toBe(true);
    expect(Object.isFrozen(SAMPLE_WORKSPACE.reps)).toBe(true);
    expect(Object.isFrozen(SAMPLE_WORKSPACE.reps[0])).toBe(true);
    expect(Object.isFrozen(SAMPLE_WORKSPACE.kpis[0])).toBe(true);
    expect(() => {
      // @ts-expect-error runtime immutability check
      SAMPLE_WORKSPACE.reps[0].name = "mutated";
    }).toThrow();
  });

  it("computes deterministic rollups from the frozen fixtures", () => {
    const totals = sampleTotals();
    expect(totals.reps).toBe(SAMPLE_WORKSPACE.reps.length);
    expect(totals.revenue_30d).toBe(
      SAMPLE_WORKSPACE.reps.reduce((s, r) => s + r.revenue_30d, 0),
    );
    // Determinism: two calls in a row must match.
    expect(sampleTotals()).toEqual(totals);
  });

  it("produces exactly 30 trend points, chronologically ordered", () => {
    expect(SAMPLE_WORKSPACE.trend_30d).toHaveLength(30);
    const dates = SAMPLE_WORKSPACE.trend_30d.map((p) => p.date);
    const sorted = [...dates].sort();
    expect(dates).toEqual(sorted);
  });

  it("labels the workspace clearly as sample/fictional data", () => {
    expect(SAMPLE_WORKSPACE.meta.generated_label.toLowerCase()).toContain("sample");
    expect(SAMPLE_WORKSPACE.meta.generated_label.toLowerCase()).toContain("fictional");
  });
});
