import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AnimatedProgress } from "@/components/ui/animated-container";
import { useAnimatedCounter, formatNumber, formatCurrency } from "@/hooks/useAnimatedCounter";

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
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: delay / 1000,
      }}
      whileHover={{ 
        y: -4,
        transition: { type: "spring", stiffness: 400, damping: 25 }
      }}
      className="group relative rounded-xl bg-card/70 backdrop-blur-xl border border-glass-border p-6 transition-shadow duration-300 hover:shadow-glow-sm hover:border-primary/30"
    >
      {/* Background Icon with animation */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ delay: (delay / 1000) + 0.2, duration: 0.4 }}
        className="absolute top-4 right-4"
      >
        <Icon className="h-12 w-12 text-foreground/5 transition-colors duration-300 group-hover:text-primary/10" />
      </motion.div>

      {/* Label */}
      <motion.p
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: (delay / 1000) + 0.1 }}
        className="text-sm text-muted-foreground font-medium mb-2"
      >
        {label}
      </motion.p>

      {/* Value with counting animation */}
      <motion.p
        className="text-5xl font-display font-bold text-foreground mb-1 tabular-nums"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: (delay / 1000) + 0.15,
        }}
      >
        {formatValue(animatedValue)}
      </motion.p>

      {/* Comparison with animated badge */}
      <AnimatePresence>
        {comparison && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: (delay / 1000) + 0.3 }}
            className="flex items-center gap-1 mt-2"
          >
            <motion.span
              className={cn(
                "text-sm font-semibold inline-flex items-center",
                isPositive && "text-success",
                isNegative && "text-destructive",
                !isPositive && !isNegative && "text-muted-foreground"
              )}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25, delay: (delay / 1000) + 0.35 }}
            >
              {isPositive && (
                <motion.span
                  initial={{ y: 5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: (delay / 1000) + 0.4 }}
                >
                  ↑
                </motion.span>
              )}
              {isNegative && (
                <motion.span
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: (delay / 1000) + 0.4 }}
                >
                  ↓
                </motion.span>
              )}
              {isPositive && "+"}
              {comparison.value}%
            </motion.span>
            <span className="text-xs text-muted-foreground">{comparison.label}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated Progress Bar */}
      {progress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: (delay / 1000) + 0.4 }}
          className="mt-3"
        >
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Progress</span>
            <span>
              {progress.current} / {progress.goal}
            </span>
          </div>
          <AnimatedProgress 
            value={progress.current} 
            max={progress.goal} 
            delay={(delay / 1000) + 0.5}
          />
        </motion.div>
      )}
    </motion.div>
  );
}