import { cn } from "@/lib/utils";
import { ViperBadge } from "@/components/ui/viper-badge";

type Difficulty = "rookie" | "pro" | "expert" | "nightmare";

interface DifficultyBadgeProps {
  difficulty: Difficulty;
  className?: string;
}

const difficultyConfig: Record<Difficulty, { label: string; variant: "success" | "warning" | "destructive" | "default"; className: string }> = {
  rookie: {
    label: "Rookie",
    variant: "success",
    className: "bg-success/20 text-success border-success/30",
  },
  pro: {
    label: "Pro",
    variant: "warning",
    className: "bg-warning/20 text-warning border-warning/30",
  },
  expert: {
    label: "Expert",
    variant: "destructive",
    className: "bg-secondary/20 text-secondary border-secondary/30",
  },
  nightmare: {
    label: "Nightmare",
    variant: "destructive",
    className: "bg-destructive/20 text-destructive border-destructive/30 animate-pulse",
  },
};

export function DifficultyBadge({ difficulty, className }: DifficultyBadgeProps) {
  const config = difficultyConfig[difficulty];

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border uppercase tracking-wider",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
