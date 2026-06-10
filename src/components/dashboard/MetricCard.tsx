import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useAnimatedCounter, formatNumber, formatCurrency } from "@/hooks/useAnimatedCounter";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";

interface MetricCardProps {
  label: string;
  value: number;
  format?: "number" | "currency" | "percentage";
  comparison?: { value: number; label: string };
  progress?: { current: number; goal: number };
  icon: LucideIcon;
  delay?: number;
  loading?: boolean;
  error?: string | null;
}

export function MetricCard({
  label,
  value,
  format = "number",
  comparison,
  progress,
  icon: Icon,
  delay = 0,
  loading = false,
  error = null,
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
  const isRevenue = format === "currency";

  const progressPct = progress ? Math.min(100, (progress.current / progress.goal) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className="group bento-tile relative flex flex-col justify-between min-h-[140px] transition-colors hover:bg-accent/40"
    >
      <div className="flex items-start justify-between">
        <span className="eyebrow font-bold">{label}</span>
        <Icon className="h-3.5 w-3.5 text-muted-foreground/40" strokeWidth={1.5} />
      </div>

      <div className="mt-4">
        {loading ? (
          <EditorialSkeleton className="h-12 w-24" />
        ) : error ? (
          <div className="font-display text-3xl leading-none text-destructive/80 italic">
            —
          </div>
        ) : (
          <div
            className={cn(
              "font-display text-3xl sm:text-4xl md:text-5xl leading-none tabular-nums",
              isRevenue && "text-primary"
            )}
          >
            {formatValue(animatedValue)}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        {loading ? (
          <EditorialSkeleton className="h-3 w-20" />
        ) : error ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive/70">
            {error}
          </span>
        ) : (
          <>
            {comparison && (
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.15em]",
                  isPositive && "text-success",
                  isNegative && "text-destructive",
                  !isPositive && !isNegative && "text-muted-foreground/60"
                )}
              >
                {isPositive && "+"}{comparison.value}% <span className="opacity-50 ml-1">{comparison.label}</span>
              </span>
            )}
            {progress && (
              <div className="w-full">
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 mb-2">
                  <span>{progress.current} / {progress.goal}</span>
                  <span>Goal</span>
                </div>
                <div className="h-px w-full bg-border">
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, delay: delay / 1000 + 0.2, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
