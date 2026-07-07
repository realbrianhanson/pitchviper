// Pure helpers for calculate-leaderboard. Extracted so they can be unit-tested
// under vitest without pulling in Deno runtime imports. The edge function
// re-exports these directly — runtime behavior is unchanged.

export interface LeaderboardActivity {
  event_type: string;
  value?: number | string | null;
  matched_user_id?: string | null;
}

export function getStartOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function calculateDateRanges(
  timePeriod: string,
  now: Date = new Date(),
): { start: Date; prevStart: Date; prevEnd: Date } {
  const today = getStartOfDay(now);

  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (timePeriod) {
    case "today":
      start = new Date(today);
      prevStart = new Date(today);
      prevStart.setDate(prevStart.getDate() - 1);
      prevEnd = new Date(today);
      break;
    case "week": {
      const dayIdx = (now.getDay() + 6) % 7; // Monday = 0
      start = new Date(today);
      start.setDate(today.getDate() - dayIdx);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      prevEnd = new Date(start);
      break;
    }
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      prevEnd = new Date(start);
      break;
    case "all_time":
    default:
      start = new Date(0);
      prevStart = new Date(0);
      prevEnd = new Date(0);
      break;
  }

  return { start, prevStart, prevEnd };
}

export function aggregateMetrics(
  activities: LeaderboardActivity[] | null | undefined,
  metricType: string,
): number {
  if (!activities || activities.length === 0) return 0;

  switch (metricType) {
    case "calls":
      return activities.filter((a) => a.event_type === "call").length;
    case "deals_won":
      return activities.filter((a) => a.event_type === "opportunity_won").length;
    case "revenue":
      return activities
        .filter((a) => a.event_type === "opportunity_won")
        .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
    case "contacts":
      return activities.filter((a) => a.event_type === "contact_created").length;
    case "pipeline":
      return activities.filter((a) => a.event_type === "opportunity_stage_changed").length;
    case "overall":
    default: {
      const calls = activities.filter((a) => a.event_type === "call").length;
      const dealsWon = activities.filter((a) => a.event_type === "opportunity_won").length;
      const revenue = activities
        .filter((a) => a.event_type === "opportunity_won")
        .reduce((sum, a) => sum + (Number(a.value) || 0), 0);
      const contacts = activities.filter((a) => a.event_type === "contact_created").length;
      const pipeline = activities.filter(
        (a) => a.event_type === "opportunity_stage_changed",
      ).length;
      return Math.round(calls + dealsWon * 10 + revenue / 1000 + contacts + pipeline * 5);
    }
  }
}
