import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { EDITORIAL_COLORS, editorialAxis, editorialGrid, EditorialTooltip, EditorialLegend } from "@/lib/chart-theme";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DailyTrend, TeamAverage } from "@/hooks/usePerformanceData";
import { format, parseISO } from "date-fns";

interface PerformanceTrendsChartProps {
  dailyTrends: DailyTrend[];
  teamAverages: TeamAverage | null;
}

export function PerformanceTrendsChart({ dailyTrends, teamAverages }: PerformanceTrendsChartProps) {
  const [showTeamAverage, setShowTeamAverage] = useState(false);

  // Calculate rolling 7-day close rate
  const trendsWithCloseRate = dailyTrends.map((day, index) => {
    // Get last 7 days including current
    const last7Days = dailyTrends.slice(Math.max(0, index - 6), index + 1);
    const totalConnected = last7Days.reduce((sum, d) => sum + d.connected, 0);
    const totalDeals = last7Days.reduce((sum, d) => sum + d.deals, 0);
    const closeRate = totalConnected > 0 ? (totalDeals / totalConnected) * 100 : 0;

    return {
      ...day,
      closeRate: parseFloat(closeRate.toFixed(1)),
      teamAvgCalls: teamAverages?.avgCalls || 0,
      teamAvgCloseRate: teamAverages?.avgCloseRate || 0,
    };
  });

  const tooltipLabelFormatter = (label: string) => format(parseISO(label), "MMM d, yyyy");
  const tooltipValueFormatter = (value: any, name?: string) =>
    name && name.includes("Rate") ? `${value}%` : value;


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Call Volume Chart */}
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>My Call Volume</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsWithCloseRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => format(parseISO(value), "M/d")}
                />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="calls" 
                  name="My Calls"
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={false}
                />
                {showTeamAverage && teamAverages && (
                  <Line 
                    type="monotone" 
                    dataKey="teamAvgCalls" 
                    name="Team Average"
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Close Rate Chart */}
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>My Close Rate (7-Day Rolling)</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendsWithCloseRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="date" 
                  stroke="hsl(var(--muted-foreground))"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => format(parseISO(value), "M/d")}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))" 
                  tick={{ fontSize: 10 }} 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="closeRate" 
                  name="My Close Rate"
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  dot={false}
                />
                {showTeamAverage && teamAverages && (
                  <Line 
                    type="monotone" 
                    dataKey="teamAvgCloseRate" 
                    name="Team Average"
                    stroke="hsl(var(--muted-foreground))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Team Comparison Toggle */}
      {teamAverages && (
        <div className="lg:col-span-2 flex items-center justify-center gap-3">
          <Switch 
            id="team-compare" 
            checked={showTeamAverage}
            onCheckedChange={setShowTeamAverage}
          />
          <Label htmlFor="team-compare" className="text-sm text-muted-foreground cursor-pointer">
            Compare vs Team Average
          </Label>
          {showTeamAverage && (
            <span className="text-xs text-muted-foreground">
              (Dashed line = team avg)
            </span>
          )}
        </div>
      )}
    </div>
  );
}
