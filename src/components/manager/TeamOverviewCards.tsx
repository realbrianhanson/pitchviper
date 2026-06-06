import { TeamOverview } from "@/hooks/useManagerDashboard";
import { motion } from "framer-motion";

interface TeamOverviewCardsProps {
  overview: TeamOverview | null;
  isLoading: boolean;
}

export function TeamOverviewCards({ overview, isLoading }: TeamOverviewCardsProps) {
  if (isLoading || !overview) {
    return (
      <div className="space-y-px">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-background p-5 animate-pulse">
              <div className="h-3 w-16 bg-muted mb-3" />
              <div className="h-9 w-20 bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const todayMetrics = [
    { label: "Team Size", value: overview.team_size },
    { label: "Active Now", value: overview.currently_active, accent: "success" as const, pulse: true },
    { label: "On Calls", value: overview.on_calls_now, accent: "warning" as const, pulse: overview.on_calls_now > 0 },
    { label: "Calls Today", value: overview.today_calls, target: overview.today_calls_target },
    { label: "Appts Today", value: overview.today_appointments, target: overview.today_appointments_target, accent: "magenta" as const },
    { label: "Revenue Today", value: `$${overview.today_revenue.toLocaleString()}`, accent: "success" as const },
  ];

  const periodMetrics = [
    { label: "Calls 30d", value: overview.period_calls },
    { label: "Pipeline Moves", value: overview.period_pipeline_moves, accent: "magenta" as const },
    { label: "Deals Won", value: overview.period_deals_won, accent: "success" as const },
    { label: "Win Rate", value: `${overview.period_win_rate}%`, accent: overview.period_win_rate >= 30 ? "success" as const : "warning" as const },
    { label: "Revenue 30d", value: `$${overview.period_revenue.toLocaleString()}`, accent: "success" as const },
  ];

  const accentClass = (a?: "success" | "warning" | "magenta") =>
    a === "success" ? "text-success" : a === "warning" ? "text-warning" : a === "magenta" ? "text-magenta" : "text-foreground";

  return (
    <div className="space-y-6">
      {/* Today row */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">
          Today · Live
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-px bg-border border border-border">
          {todayMetrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="bg-background p-5 group hover:bg-card transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  {m.label}
                </p>
                {m.pulse && (
                  <span className="flex h-1.5 w-1.5 relative">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${m.accent === "success" ? "bg-success" : "bg-warning"}`} />
                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${m.accent === "success" ? "bg-success" : "bg-warning"}`} />
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className={`font-display text-3xl leading-none tabular-nums ${accentClass(m.accent)}`}>
                  {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
                </span>
                {m.target !== undefined && (
                  <span className="font-mono text-[11px] text-muted-foreground/60">
                    / {m.target}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 30-day row */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70 mb-2">
          Last 30 days · Team aggregate
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px bg-border border border-border">
          {periodMetrics.map((m, i) => (
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
              <span className={`font-display text-3xl leading-none tabular-nums ${accentClass(m.accent)}`}>
                {typeof m.value === "number" ? m.value.toLocaleString() : m.value}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
