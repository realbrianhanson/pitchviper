import { Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardEntry, MetricType } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
  metricType: MetricType;
}

const formatValue = (value: number, metricType: MetricType) => {
  if (metricType === "revenue") return `$${value.toLocaleString()}`;
  if (metricType === "roleplay") return `${value}%`;
  return value.toLocaleString();
};

const TrendIcon = ({ trend }: { trend: "up" | "down" | "same" }) => {
  if (trend === "up") return <TrendingUp className="h-3.5 w-3.5 text-success" strokeWidth={1.5} />;
  if (trend === "down") return <TrendingDown className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.5} />;
};

export function LeaderboardPodium({ topThree, metricType }: LeaderboardPodiumProps) {
  if (topThree.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          No rankings yet — be first
        </p>
      </div>
    );
  }

  // Order: 2 · 1 · 3 visually
  const ordered = [topThree[1], topThree[0], topThree[2]].filter(Boolean);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
      {ordered.map((entry, idx) => {
        if (!entry) return null;
        const rank = entry.rank;
        const isFirst = rank === 1;

        return (
          <motion.div
            key={entry.user_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "bg-background p-6 flex flex-col items-center text-center relative",
              isFirst && "md:order-2",
              !isFirst && idx === 0 && "md:order-1",
              !isFirst && idx === 2 && "md:order-3"
            )}
          >
            {/* Rank rule */}
            <div
              className={cn(
                "absolute top-0 left-0 right-0 h-[2px]",
                rank === 1 ? "bg-primary" : rank === 2 ? "bg-muted-foreground/40" : "bg-warning/60"
              )}
            />

            {/* Mono rank */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.3em]",
                  rank === 1 ? "text-primary" : "text-muted-foreground/70"
                )}
              >
                Rank {String(rank).padStart(2, "0")}
              </span>
              {isFirst && <Crown className="h-3.5 w-3.5 text-primary" strokeWidth={1.5} />}
            </div>

            {/* Avatar */}
            <Avatar
              className={cn(
                "mb-4 ring-1",
                isFirst ? "h-28 w-28 ring-primary" : "h-20 w-20 ring-border"
              )}
            >
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="bg-muted font-display text-2xl">
                {entry.full_name.split(" ").map((n) => n[0]).join("")}
              </AvatarFallback>
            </Avatar>

            {/* Name */}
            <h3
              className={cn(
                "font-display leading-tight",
                isFirst ? "text-2xl italic" : "text-lg text-muted-foreground"
              )}
            >
              {entry.full_name}
            </h3>
            {entry.title && (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-1">
                {entry.title}
              </p>
            )}

            {/* Score */}
            <div className="mt-5 pt-5 border-t border-border w-full flex flex-col items-center gap-1">
              <span
                className={cn(
                  "font-display tabular-nums leading-none",
                  isFirst ? "text-4xl text-primary italic" : "text-2xl text-foreground"
                )}
              >
                {formatValue(entry.value, metricType)}
              </span>
              <div className="flex items-center gap-1.5">
                <TrendIcon trend={entry.trend} />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  Lvl {entry.current_level}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
