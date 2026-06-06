import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Users, User } from "lucide-react";
import { MetricType, TimePeriod, ViewMode } from "@/hooks/useLeaderboard";

interface LeaderboardFiltersProps {
  metricType: MetricType;
  onMetricChange: (value: MetricType) => void;
  timePeriod: TimePeriod;
  onTimePeriodChange: (value: TimePeriod) => void;
  viewMode: ViewMode;
  onViewModeChange: (value: ViewMode) => void;
}

export function LeaderboardFilters({
  metricType,
  onMetricChange,
  timePeriod,
  onTimePeriodChange,
  viewMode,
  onViewModeChange,
}: LeaderboardFiltersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Metric Type Tabs */}
        <Tabs value={metricType} onValueChange={(v) => onMetricChange(v as MetricType)}>
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="overall" className="text-xs sm:text-sm">Overall</TabsTrigger>
            <TabsTrigger value="calls" className="text-xs sm:text-sm">Calls</TabsTrigger>
            <TabsTrigger value="deals_won" className="text-xs sm:text-sm">Deals</TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs sm:text-sm">Revenue</TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs sm:text-sm">Contacts</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => v && onViewModeChange(v as ViewMode)}
            className="bg-muted/50 p-1 rounded-md"
          >
            <ToggleGroupItem value="individual" aria-label="Individual reps" className="text-xs sm:text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <User className="h-3.5 w-3.5 mr-1.5" />
              Reps
            </ToggleGroupItem>
            <ToggleGroupItem value="team" aria-label="Team totals" className="text-xs sm:text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm">
              <Users className="h-3.5 w-3.5 mr-1.5" />
              Teams
            </ToggleGroupItem>
          </ToggleGroup>

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
      </div>
    </div>
  );
}
