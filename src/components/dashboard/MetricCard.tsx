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

  const progressPct = progress ? Math.min(100, (progress.current / progress.goal) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: [0.22, 1, 0.36, 1] }}
      className="group flex flex-col justify-between min-h-[132px] rounded-[12px] border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/30"
    >
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-muted-foreground">{label}</span>
        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>

      <div className="mt-4">
        {loading ? (
          <EditorialSkeleton className="h-9 w-24" />
        ) : error ? (
          <div className="text-3xl font-semibold text-muted-foreground">—</div>
        ) : (
          <div className="text-[32px] md:text-[38px] font-semibold leading-none tabular-nums text-foreground">
            {formatValue(animatedValue)}
          </div>
        )}
      </div>

      <div className="mt-4 min-h-[16px] flex items-center justify-between">
        {loading ? (
          <EditorialSkeleton className="h-3 w-20" />
        ) : error ? (
          <span className="text-xs text-destructive/80">{error}</span>
        ) : (
          <>
            {comparison && (
              <span className="text-xs text-muted-foreground">
                <span className="tabular-nums text-foreground/80">{comparison.value}</span>{" "}
                {comparison.label}
              </span>
            )}
            {progress && (
              <div className="w-full">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5 tabular-nums">
                  <span>{progress.current} / {progress.goal}</span>
                  <span>Goal</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.7, delay: delay / 1000 + 0.15, ease: [0.22, 1, 0.36, 1] }}
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
