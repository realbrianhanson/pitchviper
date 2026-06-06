import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";
import { Crown } from "lucide-react";

export interface TeamPulseMember {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  metric: string;
  rank: number;
  level?: number;
  isCurrentUser?: boolean;
}

interface TeamPulseProps {
  members: TeamPulseMember[];
  teamName: string | null;
  loading?: boolean;
  error?: string | null;
}

export function TeamPulse({ members, teamName, loading = false, error = null }: TeamPulseProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bento-tile min-h-[260px]"
      >
        <div className="flex items-center justify-between mb-6">
          <EditorialSkeleton className="h-3 w-32" />
          <EditorialSkeleton className="h-3 w-16" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <EditorialSkeleton className="h-6 w-6" />
              <EditorialSkeleton className="h-8 w-8 rounded-full" />
              <EditorialSkeleton className="h-4 flex-1" />
              <EditorialSkeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bento-tile min-h-[260px] flex flex-col justify-center"
      >
        <span className="eyebrow font-bold mb-3">Team Pulse</span>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-destructive/70 mb-1">
          Sync Failed
        </p>
        <p className="font-body text-xs text-muted-foreground/60">{error}</p>
      </motion.div>
    );
  }

  if (members.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bento-tile min-h-[260px] flex flex-col justify-center"
      >
        <span className="eyebrow font-bold mb-3">Team Pulse</span>
        <p className="text-sm text-muted-foreground italic font-display">
          {teamName
            ? "No team activity yet this week. Be the first to put numbers on the board."
            : "Join a squadron to synchronize real-time performance metrics."}
        </p>
      </motion.div>
    );
  }

  const top = members.slice(0, 5);
  const metricLabel = top[0]?.metric || "score";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bento-tile min-h-[260px]"
    >
      <div className="flex items-center justify-between mb-5">
        <span className="eyebrow font-bold">
          Team Pulse{teamName ? ` — ${teamName}` : ""}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
          Top {top.length} · This Week
        </span>
      </div>

      <ul className="space-y-1.5">
        {top.map((m, idx) => (
          <motion.li
            key={m.id}
            layout
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className={cn(
              "flex items-center gap-3 px-2 py-2 -mx-2 rounded-sm transition-colors",
              m.isCurrentUser ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-accent/30"
            )}
          >
            <span
              className={cn(
                "font-mono text-[11px] tabular-nums w-5 text-center",
                idx === 0 ? "text-primary font-bold" : "text-muted-foreground/70"
              )}
            >
              {String(m.rank).padStart(2, "0")}
            </span>

            <div className="relative w-8 h-8 border border-border bg-accent flex items-center justify-center text-[10px] font-mono uppercase overflow-hidden shrink-0">
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span>{m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
              )}
              {idx === 0 && (
                <Crown
                  className="absolute -top-1.5 -right-1.5 h-3 w-3 text-primary"
                  strokeWidth={2}
                />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "font-display text-sm leading-none truncate",
                    idx === 0 ? "italic text-primary" : "text-foreground"
                  )}
                >
                  {m.name.split(" ")[0]}{" "}
                  <span className="text-foreground/80">
                    {m.name.split(" ").slice(1).join(" ")}
                  </span>
                </span>
                {m.isCurrentUser && (
                  <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-primary">
                    You
                  </span>
                )}
              </div>
              {m.level !== undefined && (
                <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60">
                  Lvl {m.level}
                </span>
              )}
            </div>

            <div className="text-right shrink-0">
              <span className="font-mono text-sm tabular-nums text-foreground">
                {m.value.toLocaleString()}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/60 ml-1">
                {metricLabel}
              </span>
            </div>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}
