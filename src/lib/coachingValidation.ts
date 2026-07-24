// Pure validation helpers for coaching flows.
// Kept free of Supabase/network calls so they are trivially testable.

export const COACHING_ACTION_STATUSES = ["assigned", "in_progress", "completed"] as const;
export type CoachingActionStatus = (typeof COACHING_ACTION_STATUSES)[number];

export const MAX_ACTIONS = 10;
export const MAX_FOCUS_AREAS = 8;
export const MAX_NOTES_LEN = 4000;
export const MAX_TITLE_LEN = 160;
export const MAX_DESC_LEN = 1000;
export const MAX_FOCUS_LEN = 80;

export interface CoachingActionDraft {
  title: string;
  description?: string | null;
  due_date?: string | null; // yyyy-mm-dd
}

export interface CoachingSessionDraft {
  rep_id: string;
  notes: string;
  focus_areas: string[];
  actions: CoachingActionDraft[];
  due_date?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !DATE_RE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function isCoachingActionStatus(v: unknown): v is CoachingActionStatus {
  return typeof v === "string" && (COACHING_ACTION_STATUSES as readonly string[]).includes(v);
}

export function sanitizeSessionDraft(draft: CoachingSessionDraft): {
  ok: true;
  value: {
    rep_id: string;
    notes: string;
    focus_areas: string[];
    actions: Array<{ title: string; description: string | null; due_date: string | null }>;
    due_date: string | null;
  };
} | { ok: false; error: string } {
  if (!isUuid(draft.rep_id)) return { ok: false, error: "Select a team member." };

  const notes = (draft.notes ?? "").trim();
  if (!notes) return { ok: false, error: "Session notes are required." };
  if (notes.length > MAX_NOTES_LEN) return { ok: false, error: "Session notes are too long." };

  const focus_areas = (draft.focus_areas ?? [])
    .map((f) => (typeof f === "string" ? f.trim() : ""))
    .filter(Boolean)
    .slice(0, MAX_FOCUS_AREAS)
    .map((f) => f.slice(0, MAX_FOCUS_LEN));

  const rawActions = (draft.actions ?? []).filter(
    (a) => a && typeof a.title === "string" && a.title.trim().length > 0
  );
  if (rawActions.length === 0) return { ok: false, error: "Add at least one action item." };
  if (rawActions.length > MAX_ACTIONS) return { ok: false, error: `Limit ${MAX_ACTIONS} action items per session.` };

  const actions: Array<{ title: string; description: string | null; due_date: string | null }> = [];
  for (const a of rawActions) {
    const title = a.title.trim().slice(0, MAX_TITLE_LEN);
    const description = a.description
      ? String(a.description).trim().slice(0, MAX_DESC_LEN) || null
      : null;
    let due_date: string | null = null;
    if (a.due_date) {
      if (!isIsoDate(a.due_date)) return { ok: false, error: "Action due date must be a valid date." };
      due_date = a.due_date;
    }
    actions.push({ title, description, due_date });
  }

  let session_due: string | null = null;
  if (draft.due_date) {
    if (!isIsoDate(draft.due_date)) return { ok: false, error: "Session due date must be a valid date." };
    session_due = draft.due_date;
  }

  return {
    ok: true,
    value: { rep_id: draft.rep_id, notes, focus_areas, actions, due_date: session_due },
  };
}

// Given a raw `rep` query param and the current manager's team member list, resolve
// a safe selection (or null). Never trust the URL — the id must belong to the team.
export function resolveRepParam(
  raw: string | null | undefined,
  teamMemberIds: readonly string[]
): string | null {
  if (!raw || !isUuid(raw)) return null;
  return teamMemberIds.includes(raw) ? raw : null;
}

export function nextActionStatus(current: CoachingActionStatus): CoachingActionStatus | null {
  if (current === "assigned") return "in_progress";
  if (current === "in_progress") return "completed";
  return null;
}

export function isOverdue(due_date: string | null | undefined, status: CoachingActionStatus, now = new Date()): boolean {
  if (!due_date || status === "completed") return false;
  const d = new Date(`${due_date}T23:59:59Z`);
  return d.getTime() < now.getTime();
}

export function defaultActionDueDate(baseDaysAhead = 7, now = new Date()): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() + baseDaysAhead);
  return d.toISOString().slice(0, 10);
}
