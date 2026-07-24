/**
 * Static, fictional sample workspace data for the read-only demo experience.
 *
 * PURITY CONTRACT:
 *  - No Supabase client, no fetch, no persistence — pure data only.
 *  - All rep IDs are prefixed `sample-rep-` and all values are clearly fictional.
 *  - Exported structures are deeply frozen; consumers must not mutate.
 */

export type SampleRepStatus = "on_call" | "available" | "coaching" | "offline";

export interface SampleRep {
  id: `sample-rep-${string}`;
  name: string;
  title: string;
  avatar_initials: string;
  status: SampleRepStatus;
  calls_today: number;
  appointments_today: number;
  revenue_today: number;
  revenue_30d: number;
  win_rate: number; // 0-1
  roleplay_score: number; // 0-100
  streak_days: number;
  needs_attention: null | {
    reason: string;
    severity: "low" | "medium" | "high";
  };
}

export interface SampleKpi {
  key: "revenue" | "calls" | "appointments" | "connect_rate";
  label: string;
  value: number;
  target: number;
  unit: "currency" | "count" | "percent";
  delta_vs_prior_period: number; // signed fraction, e.g. 0.12 = +12%
}

export interface SampleTrendPoint {
  date: string; // ISO date
  calls: number;
  appointments: number;
  revenue: number;
}

export interface SampleInsight {
  id: string;
  category: "coaching" | "pipeline" | "activity";
  headline: string;
  detail: string;
  suggested_action: string;
}

export interface SampleWorkspace {
  meta: {
    company_name: string;
    generated_label: string;
    period_label: string;
  };
  kpis: readonly SampleKpi[];
  trend_30d: readonly SampleTrendPoint[];
  reps: readonly SampleRep[];
  insights: readonly SampleInsight[];
}

const REPS: SampleRep[] = [
  {
    id: "sample-rep-amara-okoye",
    name: "Amara Okoye",
    title: "Senior AE",
    avatar_initials: "AO",
    status: "on_call",
    calls_today: 47,
    appointments_today: 5,
    revenue_today: 12400,
    revenue_30d: 214800,
    win_rate: 0.34,
    roleplay_score: 88,
    streak_days: 12,
    needs_attention: null,
  },
  {
    id: "sample-rep-jonas-becker",
    name: "Jonas Becker",
    title: "AE",
    avatar_initials: "JB",
    status: "available",
    calls_today: 38,
    appointments_today: 3,
    revenue_today: 6800,
    revenue_30d: 148200,
    win_rate: 0.27,
    roleplay_score: 74,
    streak_days: 6,
    needs_attention: null,
  },
  {
    id: "sample-rep-priya-shah",
    name: "Priya Shah",
    title: "AE",
    avatar_initials: "PS",
    status: "coaching",
    calls_today: 12,
    appointments_today: 1,
    revenue_today: 0,
    revenue_30d: 62400,
    win_rate: 0.14,
    roleplay_score: 52,
    streak_days: 0,
    needs_attention: {
      reason: "Connect rate down 41% week-over-week; last 4 calls under 90s.",
      severity: "high",
    },
  },
  {
    id: "sample-rep-diego-martinez",
    name: "Diego Martinez",
    title: "SDR",
    avatar_initials: "DM",
    status: "on_call",
    calls_today: 61,
    appointments_today: 4,
    revenue_today: 3200,
    revenue_30d: 41800,
    win_rate: 0.19,
    roleplay_score: 69,
    streak_days: 9,
    needs_attention: {
      reason: "High volume, low booking conversion — pitch review recommended.",
      severity: "medium",
    },
  },
  {
    id: "sample-rep-lena-fjord",
    name: "Lena Fjord",
    title: "AE",
    avatar_initials: "LF",
    status: "available",
    calls_today: 29,
    appointments_today: 6,
    revenue_today: 18900,
    revenue_30d: 262300,
    win_rate: 0.41,
    roleplay_score: 91,
    streak_days: 21,
    needs_attention: null,
  },
  {
    id: "sample-rep-marcus-hale",
    name: "Marcus Hale",
    title: "AE",
    avatar_initials: "MH",
    status: "offline",
    calls_today: 0,
    appointments_today: 0,
    revenue_today: 0,
    revenue_30d: 89100,
    win_rate: 0.22,
    roleplay_score: 61,
    streak_days: 0,
    needs_attention: {
      reason: "No activity logged in 2 business days.",
      severity: "high",
    },
  },
  {
    id: "sample-rep-sana-iqbal",
    name: "Sana Iqbal",
    title: "SDR",
    avatar_initials: "SI",
    status: "available",
    calls_today: 42,
    appointments_today: 2,
    revenue_today: 1400,
    revenue_30d: 34600,
    win_rate: 0.16,
    roleplay_score: 78,
    streak_days: 4,
    needs_attention: null,
  },
];

function buildTrend(): SampleTrendPoint[] {
  const points: SampleTrendPoint[] = [];
  const today = new Date("2026-07-24T00:00:00Z");
  // Deterministic pseudo-random via sine — no Math.random for stable snapshots.
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const seed = i + 1;
    const calls = Math.round(210 + Math.sin(seed * 0.7) * 34 + (seed % 6) * 4);
    const appointments = Math.round(18 + Math.sin(seed * 0.9 + 1) * 5 + (seed % 4));
    const revenue = Math.round(38000 + Math.cos(seed * 0.5) * 9500 + (seed % 7) * 1800);
    points.push({
      date: d.toISOString().slice(0, 10),
      calls,
      appointments,
      revenue,
    });
  }
  return points;
}

const TREND: SampleTrendPoint[] = buildTrend();

const totalRevenue30d = REPS.reduce((sum, r) => sum + r.revenue_30d, 0);
const totalCallsToday = REPS.reduce((sum, r) => sum + r.calls_today, 0);
const totalAppointmentsToday = REPS.reduce((sum, r) => sum + r.appointments_today, 0);

const KPIS: SampleKpi[] = [
  {
    key: "revenue",
    label: "Revenue · month to date",
    value: totalRevenue30d,
    target: 1_200_000,
    unit: "currency",
    delta_vs_prior_period: 0.184,
  },
  {
    key: "calls",
    label: "Calls today",
    value: totalCallsToday,
    target: 50 * REPS.length,
    unit: "count",
    delta_vs_prior_period: 0.062,
  },
  {
    key: "appointments",
    label: "Appointments today",
    value: totalAppointmentsToday,
    target: 3 * REPS.length,
    unit: "count",
    delta_vs_prior_period: -0.081,
  },
  {
    key: "connect_rate",
    label: "Connect rate · 7-day",
    value: 0.318,
    target: 0.35,
    unit: "percent",
    delta_vs_prior_period: 0.027,
  },
];

const INSIGHTS: SampleInsight[] = [
  {
    id: "sample-insight-1",
    category: "coaching",
    headline: "Priya Shah's discovery calls are ending under 90 seconds",
    detail:
      "Four of Priya's last six connected calls disconnected inside 90 seconds. Historical top performers hold discovery to 6-8 minutes.",
    suggested_action: "Schedule a 15-minute coaching session focused on opening reframes.",
  },
  {
    id: "sample-insight-2",
    category: "pipeline",
    headline: "3 deals worth $84K stalled past 14 days in Proposal",
    detail:
      "Deals with Northwind, Acuity Labs, and Riverbend have not advanced. Two have unanswered pricing questions logged in notes.",
    suggested_action: "Assign to Lena Fjord for a joint close review.",
  },
  {
    id: "sample-insight-3",
    category: "activity",
    headline: "Marcus Hale has no logged activity in 2 business days",
    detail:
      "No calls, SMS, or pipeline updates since Tuesday. His last three coaching actions are still open.",
    suggested_action: "Send a direct message and confirm blockers before Friday standup.",
  },
];

export const SAMPLE_WORKSPACE: SampleWorkspace = Object.freeze({
  meta: Object.freeze({
    company_name: "Meridian Sales Group",
    generated_label: "Sample workspace · fictional data",
    period_label: "Last 30 days",
  }),
  kpis: Object.freeze(KPIS.map((k) => Object.freeze(k))) as readonly SampleKpi[],
  trend_30d: Object.freeze(TREND.map((p) => Object.freeze(p))) as readonly SampleTrendPoint[],
  reps: Object.freeze(REPS.map((r) => Object.freeze({ ...r, needs_attention: r.needs_attention ? Object.freeze(r.needs_attention) : null }))) as readonly SampleRep[],
  insights: Object.freeze(INSIGHTS.map((i) => Object.freeze(i))) as readonly SampleInsight[],
});

/** Sum helper used by tests and UI — deterministic. */
export function sampleTotals(ws: SampleWorkspace = SAMPLE_WORKSPACE) {
  return {
    reps: ws.reps.length,
    active: ws.reps.filter((r) => r.status === "on_call" || r.status === "available").length,
    needs_attention: ws.reps.filter((r) => r.needs_attention !== null).length,
    revenue_30d: ws.reps.reduce((s, r) => s + r.revenue_30d, 0),
    calls_today: ws.reps.reduce((s, r) => s + r.calls_today, 0),
    appointments_today: ws.reps.reduce((s, r) => s + r.appointments_today, 0),
  };
}
