import { cn } from "@/lib/utils";
import { useAnimatedCounter, formatNumber, formatCurrency } from "@/hooks/useAnimatedCounter";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  format?: "number" | "currency" | "percentage";
  comparison?: {
    value: number;
    label: string;
  };
  progress?: {
    current: number;
    goal: number;
  };
  icon: LucideIcon;
  delay?: number;
}

export function MetricCard({
  label,
  value,
  format = "number",
  comparison,
  progress,
  icon: Icon,
  delay = 0,
}: MetricCardProps) {
  const animatedValue = useAnimatedCounter(value, { delay });

  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return val + "%";
      default:
        return formatNumber(val);
    }
  };

  const isPositive = comparison && comparison.value > 0;
  const isNegative = comparison && comparison.value < 0;

  return (
    <div className="group relative rounded-xl bg-card/70 backdrop-blur-xl border border-glass-border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-glow-sm hover:border-primary/30">
      {/* Background Icon */}
      <Icon className="absolute top-4 right-4 h-12 w-12 text-foreground/5 transition-colors group-hover:text-primary/10" />

      {/* Label */}
      <p className="text-sm text-muted-foreground font-medium mb-2">{label}</p>

      {/* Value */}
      <p className="text-5xl font-display font-bold text-foreground mb-1 tabular-nums">
        {formatValue(animatedValue)}
      </p>

      {/* Comparison */}
      {comparison && (
        <div className="flex items-center gap-1 mt-2">
          <span
            className={cn(
              "text-sm font-semibold",
              isPositive && "text-success",
              isNegative && "text-destructive",
              !isPositive && !isNegative && "text-muted-foreground"
            )}
          >
            {isPositive && "+"}
            {comparison.value}%
          </span>
          <span className="text-xs text-muted-foreground">{comparison.label}</span>
        </div>
      )}

      {/* Progress Bar */}
      {progress && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>
              {progress.current} / {progress.goal}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-success rounded-full transition-all duration-1000"
              style={{
                width: `${Math.min((progress.current / progress.goal) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}