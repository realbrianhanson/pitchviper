import { describe, it, expect } from "vitest";
import {
  sanitizeSessionDraft,
  resolveRepParam,
  nextActionStatus,
  isOverdue,
  defaultActionDueDate,
  isUuid,
  isCoachingActionStatus,
  canRepAdvanceStatus,
  normalizeDisplayName,
  resolveTeamMemberByName,
  MAX_ACTIONS,
} from "@/lib/coachingValidation";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";
const UUID_C = "33333333-3333-4333-8333-333333333333";

describe("isUuid / isCoachingActionStatus", () => {
  it("accepts valid UUIDs and rejects garbage", () => {
    expect(isUuid(UUID_A)).toBe(true);
    expect(isUuid("nope")).toBe(false);
    expect(isUuid(null)).toBe(false);
  });
  it("whitelists coaching statuses", () => {
    expect(isCoachingActionStatus("assigned")).toBe(true);
    expect(isCoachingActionStatus("in_progress")).toBe(true);
    expect(isCoachingActionStatus("completed")).toBe(true);
    expect(isCoachingActionStatus("wat")).toBe(false);
    expect(isCoachingActionStatus(undefined)).toBe(false);
  });
});

describe("sanitizeSessionDraft", () => {
  it("requires rep_id, notes, and at least one action", () => {
    const bad = sanitizeSessionDraft({ rep_id: "nope", notes: "", focus_areas: [], actions: [] });
    expect(bad.ok).toBe(false);
  });

  it("trims fields, dedupes focus areas, drops empty actions", () => {
    const res = sanitizeSessionDraft({
      rep_id: UUID_A,
      notes: "  Great call  ",
      focus_areas: [" tone ", "tone", "", "objection handling"],
      actions: [
        { title: "  Fix opener  ", description: " calmer tone ", due_date: "2099-01-15" },
        { title: "   ", description: "empty" },
      ],
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value.notes).toBe("Great call");
    expect(res.value.focus_areas).toEqual(["tone", "objection handling"]);
    expect(res.value.actions).toHaveLength(1);
    expect(res.value.actions[0].title).toBe("Fix opener");
  });

  it("enforces MAX_ACTIONS", () => {
    const many = Array.from({ length: MAX_ACTIONS + 1 }, (_, i) => ({ title: `A${i}` }));
    const res = sanitizeSessionDraft({
      rep_id: UUID_A,
      notes: "n",
      focus_areas: [],
      actions: many,
    });
    expect(res.ok).toBe(false);
  });
});

describe("resolveRepParam", () => {
  it("returns id when it belongs to the team", () => {
    expect(resolveRepParam(UUID_A, [UUID_A, UUID_B])).toBe(UUID_A);
  });
  it("rejects cross-team ids", () => {
    expect(resolveRepParam(UUID_C, [UUID_A, UUID_B])).toBeNull();
  });
  it("rejects malformed ids and null", () => {
    expect(resolveRepParam("nope", [UUID_A])).toBeNull();
    expect(resolveRepParam(null, [UUID_A])).toBeNull();
    expect(resolveRepParam(undefined, [UUID_A])).toBeNull();
  });
});

describe("nextActionStatus", () => {
  it("advances assigned -> in_progress -> completed -> null", () => {
    expect(nextActionStatus("assigned")).toBe("in_progress");
    expect(nextActionStatus("in_progress")).toBe("completed");
    expect(nextActionStatus("completed")).toBeNull();
  });
});

describe("isOverdue", () => {
  const now = new Date("2026-07-24T12:00:00Z");
  it("is false when no due date or already completed", () => {
    expect(isOverdue(null, "assigned", now)).toBe(false);
    expect(isOverdue("2020-01-01", "completed", now)).toBe(false);
  });
  it("flags past due dates for open actions", () => {
    expect(isOverdue("2026-07-23", "assigned", now)).toBe(true);
    expect(isOverdue("2026-07-25", "in_progress", now)).toBe(false);
  });
});

describe("defaultActionDueDate", () => {
  it("returns an ISO date N days ahead", () => {
    const d = defaultActionDueDate(7, new Date("2026-07-24T00:00:00Z"));
    expect(d).toBe("2026-07-31");
  });
});
