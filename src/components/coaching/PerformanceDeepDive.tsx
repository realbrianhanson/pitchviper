import { RepStats } from "@/hooks/useCoaching";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { EDITORIAL_COLORS, editorialAxis, editorialGrid, EditorialTooltip, EditorialLegend } from "@/lib/chart-theme";
import { CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

interface PerformanceDeepDiveProps {
  stats: RepStats | null;
  isLoading: boolean;
}

export function PerformanceDeepDive({ stats, isLoading }: PerformanceDeepDiveProps) {
  if (isLoading) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Deep Dive
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <Skeleton className="h-48 w-full" />
        </ViperCardContent>
      </ViperCard>
    );
  }

  if (!stats || !stats.daily_stats?.length) {
    return (
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Performance Deep Dive
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="text-center py-8 text-muted-foreground">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No performance data available yet</p>
          </div>
        </ViperCardContent>
      </ViperCard>
    );
  }

  // Process data for charts
  const chartData = stats.daily_stats
    .slice()
    .reverse()
    .map(day => ({
      date: format(parseISO(day.date), 'MMM d'),
      calls: day.calls_made + day.calls_received,
      appointments: day.appointments_set,
      deals: day.deals_closed,
      revenue: day.revenue_closed,
      teamAvgCalls: Math.round(stats.team_avg_calls / 7), // Approximate daily avg
    }));

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" strokeWidth={1.5} />
          Performance Deep Dive
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
            Call Volume vs Team Average
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={EDITORIAL_COLORS.gold} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={EDITORIAL_COLORS.gold} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...editorialGrid} />
                <XAxis dataKey="date" {...editorialAxis} />
                <YAxis {...editorialAxis} width={28} />
                <Tooltip content={<EditorialTooltip />} />
                <Legend content={<EditorialLegend />} />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="Calls"
                  stroke={EDITORIAL_COLORS.gold}
                  fill="url(#callsGradient)"
                  strokeWidth={1.5}
                />
                <Line
                  type="monotone"
                  dataKey="teamAvgCalls"
                  name="Team Avg"
                  stroke={EDITORIAL_COLORS.muted}
                  strokeDasharray="3 4"
                  strokeWidth={1}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
            Appointments & Deals
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid {...editorialGrid} />
                <XAxis dataKey="date" {...editorialAxis} />
                <YAxis {...editorialAxis} width={28} />
                <Tooltip content={<EditorialTooltip />} />
                <Legend content={<EditorialLegend />} />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  name="Appointments"
                  stroke={EDITORIAL_COLORS.gold}
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="Deals"
                  stroke={EDITORIAL_COLORS.acidGreen}
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Stats Comparison */}
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          <div className="p-2 md:p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-lg md:text-2xl font-bold text-primary">{stats.connect_rate}%</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Connect Rate</p>
            <p className="text-[10px] md:text-xs text-muted-foreground hidden sm:block">
              (Team: {stats.team_avg_connect_rate}%)
            </p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-lg md:text-2xl font-bold text-success">{stats.deals_closed}</p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Deals Closed</p>
          </div>
          <div className="p-2 md:p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-lg md:text-2xl font-bold text-warning">
              {stats.avg_roleplay_score || 'N/A'}
            </p>
            <p className="text-[10px] md:text-xs text-muted-foreground">Avg Roleplay</p>
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
