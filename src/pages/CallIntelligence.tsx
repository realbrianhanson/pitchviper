import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, Phone, Percent, Clock, Calendar as CalendarIcon2, Loader2 } from "lucide-react";
import { useCallAnalytics, TimeRange } from "@/hooks/useCallAnalytics";
import { CallMetricCard } from "@/components/calls/CallMetricCard";
import { CallsOverTimeChart } from "@/components/calls/CallsOverTimeChart";
import { CallOutcomesChart } from "@/components/calls/CallOutcomesChart";
import { DispositionChart } from "@/components/calls/DispositionChart";
import { CallingHeatmap } from "@/components/calls/CallingHeatmap";
import { ObjectionFrequencyChart } from "@/components/calls/ObjectionFrequencyChart";
import { TopPerformersCard } from "@/components/calls/TopPerformersCard";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useState } from "react";

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

export default function CallIntelligence() {
  const { 
    data, 
    isLoading, 
    timeRange, 
    setTimeRange, 
    customRange, 
    setCustomRange,
    getDateRangeLabel 
  } = useCallAnalytics();
  
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  const handleCustomRangeApply = () => {
    if (customStart && customEnd) {
      setCustomRange({ start: customStart, end: customEnd });
      setTimeRange('custom');
    }
  };

  return (
    <AppLayout title="Call Intelligence">
      <div className="space-y-6 animate-fade-in">
        {/* Header with Time Range Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold text-foreground">Call Analytics</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {getDateRangeLabel()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
              <SelectTrigger className="w-[180px] bg-background/50">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                {TIME_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {timeRange === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {customRange 
                      ? `${format(customRange.start, 'MMM d')} - ${format(customRange.end, 'MMM d')}`
                      : 'Pick dates'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="end">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-2">Start Date</p>
                        <Calendar
                          mode="single"
                          selected={customStart}
                          onSelect={setCustomStart}
                        />
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">End Date</p>
                        <Calendar
                          mode="single"
                          selected={customEnd}
                          onSelect={setCustomEnd}
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCustomRangeApply} 
                      className="w-full"
                      disabled={!customStart || !customEnd}
                    >
                      Apply Range
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[140px] rounded-xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Skeleton className="h-[380px] rounded-xl" />
              <Skeleton className="h-[380px] rounded-xl" />
            </div>
          </div>
        )}

        {/* Data Display */}
        {!isLoading && data && (
          <>
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <CallMetricCard
                title="Total Calls"
                value={data.metrics.totalCalls.value}
                prevValue={data.metrics.totalCalls.prevValue}
                icon={<Phone className="h-5 w-5" />}
              />
              <CallMetricCard
                title="Connect Rate"
                value={data.metrics.connectRate.value}
                prevValue={data.metrics.connectRate.prevValue}
                format="percent"
                icon={<Percent className="h-5 w-5" />}
              />
              <CallMetricCard
                title="Avg Call Duration"
                value={data.metrics.avgDuration.value}
                prevValue={data.metrics.avgDuration.prevValue}
                format="duration"
                icon={<Clock className="h-5 w-5" />}
              />
              <CallMetricCard
                title="Appointments/Call"
                value={(data.metrics.appointmentsPerCall.value * 100).toFixed(1)}
                prevValue={data.metrics.appointmentsPerCall.prevValue * 100}
                suffix="%"
                icon={<CalendarIcon2 className="h-5 w-5" />}
              />
            </div>

            {/* Main Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                <CallsOverTimeChart data={data.callsOverTime} />
                <CallOutcomesChart outcomes={data.outcomes} />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <DispositionChart dispositions={data.dispositions} />
                <CallingHeatmap data={data.heatmap} />
              </div>
            </div>

            {/* Bottom Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ObjectionFrequencyChart data={data.objectionFrequency} />
              {data.topPerformers && (
                <TopPerformersCard 
                  byConnectRate={data.topPerformers.byConnectRate}
                  byAppointments={data.topPerformers.byAppointments}
                />
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!isLoading && (!data || data.metrics.totalCalls.value === 0) && (
          <EditorialEmpty
            eyebrow="Call Intelligence"
            icon={<Phone className="h-10 w-10" strokeWidth={1.2} />}
            title="No calls on the wire."
            description='Log your first call via "Log Session" in the header to start the intelligence stream.'
          />
        )}
      </div>
    </AppLayout>
  );
}
