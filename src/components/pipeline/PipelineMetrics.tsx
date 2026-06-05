import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PipelineMetricsProps {
  totalDeals: number;
  totalValue: number;
  weightedValue: number;
  wonDeals: number;
  wonValue: number;
  lostDeals: number;
}

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
};

export function PipelineMetrics({
  totalDeals,
  totalValue,
  weightedValue,
  wonDeals,
  wonValue,
  lostDeals,
}: PipelineMetricsProps) {
  const metrics = [
    { label: "Open Deals", value: totalDeals.toString(), tone: "text-foreground" },
    { label: "Pipeline", value: formatCurrency(totalValue), tone: "text-foreground" },
    { label: "Weighted", value: formatCurrency(weightedValue), tone: "text-primary" },
    { label: "Won", value: `${wonDeals} · ${formatCurrency(wonValue)}`, tone: "text-success" },
    { label: "Lost", value: lostDeals.toString(), tone: "text-destructive" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border border border-border">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
          className="bg-background p-4 hover:bg-card transition-colors"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mb-2">
            {m.label}
          </p>
          <p className={cn("font-display text-2xl leading-none tabular-nums truncate", m.tone)}>
            {m.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
