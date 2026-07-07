import { describe, it, expect } from "vitest";
import {
  calculateDateRanges,
  aggregateMetrics,
  getStartOfDay,
} from "../../supabase/functions/_shared/leaderboard";

describe("leaderboard helpers", () => {
  describe("getStartOfDay", () => {
    it("strips the time component", () => {
      const start = getStartOfDay(new Date(2026, 5, 15, 14, 32, 11));
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getDate()).toBe(15);
    });
  });

  describe("calculateDateRanges", () => {
    // Wednesday 2026-06-10 10:00 local
    const now = new Date(2026, 5, 10, 10, 0, 0);

    it("today: start = today 00:00, previous window = yesterday", () => {
      const { start, prevStart, prevEnd } = calculateDateRanges("today", now);
      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(5);
      expect(start.getDate()).toBe(10);
      expect(start.getHours()).toBe(0);
      expect(prevStart.getDate()).toBe(9);
      expect(prevEnd.getDate()).toBe(10);
    });

    it("week: start = most-recent Monday, prev window = the Monday before that", () => {
      // 2026-06-10 is Wednesday → Monday is 2026-06-08.
      const { start, prevStart, prevEnd } = calculateDateRanges("week", now);
      expect(start.getDate()).toBe(8);
      expect(start.getDay()).toBe(1);
      expect(prevStart.getDate()).toBe(1);
      expect(prevEnd.getDate()).toBe(8);
    });

    it("month: start = first of month, prev = first of previous month", () => {
      const { start, prevStart, prevEnd } = calculateDateRanges("month", now);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(5);
      expect(prevStart.getMonth()).toBe(4);
      expect(prevStart.getDate()).toBe(1);
      expect(prevEnd.getMonth()).toBe(5);
      expect(prevEnd.getDate()).toBe(1);
    });

    it("all_time / unknown: start collapses to epoch", () => {
      const a = calculateDateRanges("all_time", now);
      const b = calculateDateRanges("nonsense", now);
      expect(a.start.getTime()).toBe(0);
      expect(b.start.getTime()).toBe(0);
    });
  });

  describe("aggregateMetrics", () => {
    const activities = [
      { event_type: "call" },
      { event_type: "call" },
      { event_type: "opportunity_won", value: 5000 },
      { event_type: "opportunity_won", value: "2500" },
      { event_type: "contact_created" },
      { event_type: "opportunity_stage_changed" },
    ];

    it("returns 0 for empty input", () => {
      expect(aggregateMetrics([], "calls")).toBe(0);
      expect(aggregateMetrics(null, "revenue")).toBe(0);
      expect(aggregateMetrics(undefined, "overall")).toBe(0);
    });

    it("counts calls", () => {
      expect(aggregateMetrics(activities, "calls")).toBe(2);
    });

    it("counts deals won", () => {
      expect(aggregateMetrics(activities, "deals_won")).toBe(2);
    });

    it("sums revenue (numeric + string values)", () => {
      expect(aggregateMetrics(activities, "revenue")).toBe(7500);
    });

    it("counts contacts and pipeline movements", () => {
      expect(aggregateMetrics(activities, "contacts")).toBe(1);
      expect(aggregateMetrics(activities, "pipeline")).toBe(1);
    });

    it("overall applies the weighted composite formula", () => {
      // 2 calls + 2*10 deals + 7500/1000 revenue + 1 contact + 1*5 pipeline
      // = 2 + 20 + 7.5 + 1 + 5 = 35.5 → round → 36
      expect(aggregateMetrics(activities, "overall")).toBe(36);
    });

    it("unknown metric falls back to overall", () => {
      expect(aggregateMetrics(activities, "banana")).toBe(36);
    });
  });
});
