import { TeamOverview } from "@/hooks/useManagerDashboard";
import { motion } from "framer-motion";

interface TeamOverviewCardsProps {
  overview: TeamOverview | null;
  isLoading: boolean;
}

type Accent = "success" | "warning" | "magenta" | "primary";

const accentClass = (a?: Accent) =>
  a === "success"
    ? "text-success"
    : a === "warning"
    ? "text-warning"
    : a === "magenta"
    ? "text-magenta"
    : a === "primary"
    ? "text-primary"
    : "text-foreground";

export function TeamOverviewCards({ overview, isLoading }: TeamOverviewCardsProps) {
  if (isLoading || !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-background p-5 animate-pulse">
              <div className="h-3 w-16 bg-muted mb-3" />
              <div className="h-9 w-20 bg-muted" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-background p-5 animate-pulse">
              <div className="h-3 w-16 bg-muted mb-3" />
              <div className="h-7 w-16 bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const primaryMetrics: Array<{
    label: string;
    value: string | number;
    denom?: string | number;
    accent?: Accent;
  }> = [
    {
      label: "Calls Today",
      value: overview.today_calls,
      denom: overview.today_calls_target ? `/ ${overview.today_calls_target}` : undefined,
    },
    {
      label: "Appts Today",
      value: overview.today_appointments,
      denom: overview.today_appointments_target
        ? `/ ${overview.today_appointments_target}`
        : undefined,
    },
    {
      label: "Revenue Today",
      value: `$${overview.today_revenue.toLocaleString()}`,
      accent: "primary",
    },
    {
      label: "Active Now",
      value: overview.currently_active,
      denom: `/ ${overview.team_size}`,
      accent: "success",
    },
  ];

  const contextMetrics: Array<{ label: string; value: string | number; accent?: Accent }> = [
    { label: "Calls 30d", value: overview.period_calls },
    { label: "Pipeline Moves", value: overview.period_pipeline_moves, accent: "magenta" },
    { label: "Deals Won", value: overview.period_deals_won, accent: "success" },
    {
      label: "Win Rate",
      value: `${overview.period_win_rate}%`,
      accent: overview.period_win_rate >= 30 ? "success" : "warning",
    },
    {
      label: "Revenue 30d",
      value: `$${overview.period_revenue.toLocaleString()}`,
      accent: "primary",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Executive KPI row */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">
          Today · Live
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {primaryMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="bg-background p-6 group hover:bg-card transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
                {m.label}
              </p>
              <div className="flex items-baseline gap-1.5">
                <span className={`font-display text-4xl leading-none tabular-nums ${accentClass(m.accent)}`}>
                  {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                </span>
                {m.denom && (
                  <span className="font-mono text-xs text-muted-foreground/60">{m.denom}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 30-day context row */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">
          Last 30 days · Team aggregate
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border">
          {contextMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="bg-background p-5 group hover:bg-card transition-colors"
            >
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
                {m.label}
              </p>
              <span className={`font-display text-2xl leading-none tabular-nums ${accentClass(m.accent)}`}>
                {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
