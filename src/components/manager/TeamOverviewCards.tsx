import { TeamOverview } from "@/hooks/useManagerDashboard";
import { motion } from "framer-motion";
import { Phone, CalendarCheck, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamOverviewCardsProps {
  overview: TeamOverview | null;
  isLoading: boolean;
}

type Accent = "success" | "warning" | "primary" | "default";

const valueAccent = (a?: Accent) =>
  a === "success"
    ? "text-success"
    : a === "warning"
    ? "text-warning"
    : a === "primary"
    ? "text-primary"
    : "text-foreground";

export function TeamOverviewCards({ overview, isLoading }: TeamOverviewCardsProps) {
  if (isLoading || !overview) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-[12px] border border-border bg-card p-5 shadow-sm animate-pulse">
              <div className="h-8 w-8 bg-muted rounded-md mb-4" />
              <div className="h-3 w-16 bg-muted mb-3" />
              <div className="h-8 w-20 bg-muted" />
            </div>
          ))}
        </div>
        <div className="rounded-[12px] border border-border bg-card p-6 shadow-sm animate-pulse">
          <div className="h-4 w-32 bg-muted mb-5" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[...Array(5)].map((_, i) => (
              <div key={i}>
                <div className="h-3 w-16 bg-muted mb-2" />
                <div className="h-6 w-14 bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const primaryMetrics = [
    {
      label: "Calls today",
      value: overview.today_calls.toLocaleString(),
      denom: overview.today_calls_target ? `of ${overview.today_calls_target}` : undefined,
      progress: overview.today_calls_target
        ? Math.min(100, (overview.today_calls / overview.today_calls_target) * 100)
        : undefined,
      icon: Phone,
    },
    {
      label: "Appts today",
      value: overview.today_appointments.toLocaleString(),
      denom: overview.today_appointments_target ? `of ${overview.today_appointments_target}` : undefined,
      progress: overview.today_appointments_target
        ? Math.min(100, (overview.today_appointments / overview.today_appointments_target) * 100)
        : undefined,
      icon: CalendarCheck,
    },
    {
      label: "Revenue today",
      value: `$${overview.today_revenue.toLocaleString()}`,
      accent: "primary" as Accent,
      icon: DollarSign,
    },
    {
      label: "Active now",
      value: overview.currently_active.toLocaleString(),
      denom: `of ${overview.team_size}`,
      accent: "success" as Accent,
      progress: overview.team_size
        ? Math.min(100, (overview.currently_active / overview.team_size) * 100)
        : undefined,
      icon: Users,
    },
  ];

  const contextMetrics: Array<{ label: string; value: string; accent?: Accent }> = [
    { label: "Calls", value: overview.period_calls.toLocaleString() },
    { label: "Pipeline moves", value: overview.period_pipeline_moves.toLocaleString() },
    { label: "Deals won", value: overview.period_deals_won.toLocaleString(), accent: "success" },
    {
      label: "Win rate",
      value: `${overview.period_win_rate}%`,
      accent: overview.period_win_rate >= 30 ? "success" : "warning",
    },
    {
      label: "Revenue",
      value: `$${overview.period_revenue.toLocaleString()}`,
      accent: "primary",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Live KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryMetrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-[12px] border border-border bg-card p-5 shadow-sm flex flex-col justify-between min-h-[132px]"
            >
              <div className="flex items-start justify-between">
                <span className="text-[13px] font-medium text-muted-foreground">{m.label}</span>
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className={cn("text-[32px] md:text-[36px] font-semibold leading-none tabular-nums", valueAccent(m.accent))}>
                    {m.value}
                  </span>
                  {m.denom && <span className="text-xs text-muted-foreground">{m.denom}</span>}
                </div>
                {m.progress !== undefined && (
                  <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.progress}%` }}
                      transition={{ duration: 0.7, delay: i * 0.05 + 0.15, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 30-day summary */}
      <div className="rounded-[12px] border border-border bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-between mb-5">
          <h3 className="text-base font-semibold text-foreground">Last 30 days</h3>
          <span className="text-xs text-muted-foreground">Team aggregate</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {contextMetrics.map((m) => (
            <div key={m.label}>
              <p className="text-xs text-muted-foreground mb-1.5">{m.label}</p>
              <p className={cn("text-2xl font-semibold leading-none tabular-nums", valueAccent(m.accent))}>
                {m.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
