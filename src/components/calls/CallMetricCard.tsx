import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";

interface CallMetricCardProps {
  title: string;
  value: string | number;
  prevValue?: number;
  suffix?: string;
  icon: React.ReactNode;
  format?: 'number' | 'percent' | 'duration';
}

export function CallMetricCard({ 
  title, 
  value, 
  prevValue, 
  suffix,
  icon,
  format = 'number'
}: CallMetricCardProps) {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  const change = prevValue !== undefined && prevValue > 0 
    ? ((numValue - prevValue) / prevValue) * 100 
    : 0;
  
  const isPositive = change > 0;
  const isNeutral = Math.abs(change) < 0.1;

  const formatValue = (val: number) => {
    switch (format) {
      case 'percent':
        return `${val.toFixed(1)}%`;
      case 'duration':
        return `${val.toFixed(1)}m`;
      default:
        return val.toLocaleString();
    }
  };

  return (
    <ViperCard variant="glass" className="relative overflow-hidden">
      <ViperCardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-display font-bold text-foreground">
              {formatValue(numValue)}
              {suffix && <span className="text-lg text-muted-foreground ml-1">{suffix}</span>}
            </p>
            {prevValue !== undefined && (
              <div className={cn(
                "flex items-center gap-1 text-sm",
                isNeutral ? "text-muted-foreground" : isPositive ? "text-success" : "text-destructive"
              )}>
                {isNeutral ? (
                  <Minus className="h-3 w-3" />
                ) : isPositive ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {isNeutral ? 'No change' : `${Math.abs(change).toFixed(1)}% vs prev period`}
                </span>
              </div>
            )}
          </div>
          <div className="p-3 rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
