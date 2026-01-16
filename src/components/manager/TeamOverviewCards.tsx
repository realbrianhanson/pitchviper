import { Users, Phone, Calendar, DollarSign, Activity, Zap } from "lucide-react";
import { TeamOverview } from "@/hooks/useManagerDashboard";
import { cn } from "@/lib/utils";

interface TeamOverviewCardsProps {
  overview: TeamOverview | null;
  isLoading: boolean;
}

export function TeamOverviewCards({ overview, isLoading }: TeamOverviewCardsProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card/50 border border-border rounded-xl p-4 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Team Size',
      value: overview.team_size,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: 'Active Now',
      value: overview.currently_active,
      icon: Activity,
      color: 'text-success',
      bgColor: 'bg-success/10',
      indicator: true,
    },
    {
      label: 'On Calls',
      value: overview.on_calls_now,
      icon: Phone,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      pulse: overview.on_calls_now > 0,
    },
    {
      label: "Today's Calls",
      value: overview.today_calls,
      target: overview.today_calls_target,
      icon: Phone,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      label: "Today's Appts",
      value: overview.today_appointments,
      target: overview.today_appointments_target,
      icon: Calendar,
      color: 'text-magenta',
      bgColor: 'bg-magenta/10',
    },
    {
      label: "Today's Revenue",
      value: `$${overview.today_revenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((metric, i) => (
        <div
          key={i}
          className="bg-card/50 border border-border rounded-xl p-4 hover:bg-card/80 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", metric.bgColor)}>
              <metric.icon className={cn("h-4 w-4", metric.color)} />
            </div>
            {metric.indicator && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            )}
            {metric.pulse && (
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-display font-bold">
              {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
            </span>
            {metric.target && (
              <span className="text-sm text-muted-foreground">
                /{metric.target}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}