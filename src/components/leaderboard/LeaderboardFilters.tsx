import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MetricType, TimePeriod } from "@/hooks/useLeaderboard";

interface LeaderboardFiltersProps {
  metricType: MetricType;
  onMetricChange: (value: MetricType) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (value: TimePeriod) => void;
}

export function LeaderboardFilters({
  metricType,
  onMetricChange,
  timePeriod,
  onTimePeriodChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Metric Type Tabs */}
      <Tabs value={metricType} onValueChange={(v) => onMetricChange(v as MetricType)}>
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="overall" className="text-xs sm:text-sm">Overall</TabsTrigger>
          <TabsTrigger value="calls" className="text-xs sm:text-sm">Calls</TabsTrigger>
          <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appts</TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
          <TabsTrigger value="roleplay" className="text-xs sm:text-sm">Roleplay</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Time Period Select */}
      <Select value={timePeriod} onValueChange={(v) => onTimePeriodChange(v as TimePeriod)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="all_time">All Time</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
