import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { cn } from "@/lib/utils";

interface HeatmapData {
  day: string;
  hours: Array<{ hour: number; total: number; connected: number; connectRate: number }>;
}

interface CallingHeatmapProps {
  data: HeatmapData[];
}

const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8am to 8pm
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function CallingHeatmap({ data }: CallingHeatmapProps) {
  // Create a lookup map for quick access
  const lookupMap = new Map<string, number>();
  data.forEach(day => {
    day.hours.forEach(hour => {
      lookupMap.set(`${day.day}-${hour.hour}`, hour.connectRate);
    });
  });

  const getConnectRate = (day: string, hour: number): number => {
    return lookupMap.get(`${day}-${hour}`) || 0;
  };

  const getColor = (rate: number): string => {
    if (rate === 0) return 'bg-muted/30';
    if (rate < 20) return 'bg-primary/20';
    if (rate < 40) return 'bg-primary/40';
    if (rate < 60) return 'bg-primary/60';
    if (rate < 80) return 'bg-success/60';
    return 'bg-success';
  };

  const formatHour = (hour: number): string => {
    if (hour === 12) return '12pm';
    if (hour > 12) return `${hour - 12}pm`;
    return `${hour}am`;
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center justify-between">
          <span>Best Calling Times</span>
          <span className="text-xs font-normal text-muted-foreground">Connect rate by hour</span>
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[500px]">
            {/* Hours header */}
            <div className="flex mb-2">
              <div className="w-20 shrink-0" />
              {HOURS.map(hour => (
                <div 
                  key={hour} 
                  className="flex-1 text-center text-xs text-muted-foreground"
                >
                  {formatHour(hour)}
                </div>
              ))}
            </div>
            
            {/* Grid */}
            {DAYS.map(day => (
              <div key={day} className="flex items-center mb-1">
                <div className="w-20 shrink-0 text-xs text-muted-foreground pr-2 text-right">
                  {day.slice(0, 3)}
                </div>
                <div className="flex-1 flex gap-1">
                  {HOURS.map(hour => {
                    const rate = getConnectRate(day, hour);
                    return (
                      <div
                        key={`${day}-${hour}`}
                        className={cn(
                          "flex-1 h-8 rounded transition-colors cursor-pointer",
                          "hover:ring-2 hover:ring-primary/50",
                          getColor(rate)
                        )}
                        title={`${day} ${formatHour(hour)}: ${rate.toFixed(0)}% connect rate`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Legend */}
            <div className="flex items-center justify-end gap-2 mt-4 pt-4 border-t border-border">
              <span className="text-xs text-muted-foreground mr-2">Connect Rate:</span>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-muted/30" />
                <span className="text-xs text-muted-foreground">0%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-primary/40" />
                <span className="text-xs text-muted-foreground">20-40%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-success/60" />
                <span className="text-xs text-muted-foreground">60-80%</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 rounded bg-success" />
                <span className="text-xs text-muted-foreground">80%+</span>
              </div>
            </div>
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
