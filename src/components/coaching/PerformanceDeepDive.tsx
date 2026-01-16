import { RepStats } from "@/hooks/useCoaching";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart3 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-1">{label}</p>
          {payload.map((entry: any, i: number) => (
            <p key={i} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name === 'Revenue' ? `$${entry.value.toLocaleString()}` : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Performance Deep Dive
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-6">
        {/* Calls Over Time */}
        <div>
          <h4 className="text-sm font-medium mb-3">Call Volume (vs Team Avg)</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="calls"
                  name="Calls"
                  stroke="hsl(var(--primary))"
                  fill="url(#callsGradient)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="teamAvgCalls"
                  name="Team Avg"
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Appointments & Deals */}
        <div>
          <h4 className="text-sm font-medium mb-3">Appointments & Deals</h4>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  wrapperStyle={{ fontSize: '12px' }}
                />
                <Line
                  type="monotone"
                  dataKey="appointments"
                  name="Appointments"
                  stroke="hsl(var(--warning))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="deals"
                  name="Deals"
                  stroke="hsl(var(--success))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Stats Comparison */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-2xl font-bold text-primary">{stats.connect_rate}%</p>
            <p className="text-xs text-muted-foreground">Connect Rate</p>
            <p className="text-xs text-muted-foreground">
              (Team: {stats.team_avg_connect_rate}%)
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-2xl font-bold text-success">{stats.deals_closed}</p>
            <p className="text-xs text-muted-foreground">Deals Closed</p>
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
            <p className="text-2xl font-bold text-warning">
              {stats.avg_roleplay_score || 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Avg Roleplay</p>
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
