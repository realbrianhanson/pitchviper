import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";
import { NumberFlash } from "@/components/ui/number-flash";

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

function cleanName(name: string): string {
  return name.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}

function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean);
  return parts.map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

const shellCls =
  "rounded-[12px] border border-border bg-card p-6 shadow-sm h-full min-h-[280px]";

export function TeamPulse({ members, teamName, loading = false, error = null }: TeamPulseProps) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className={shellCls}
      >
        <div className="flex items-center justify-between mb-5">
          <EditorialSkeleton className="h-4 w-40" />
          <EditorialSkeleton className="h-3 w-16" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <EditorialSkeleton className="h-4 w-5" />
              <EditorialSkeleton className="h-9 w-9 rounded-full" />
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className={cn(shellCls, "flex flex-col justify-center")}
      >
        <h3 className="text-base font-semibold text-foreground mb-1">Team performance</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </motion.div>
    );
  }

  if (members.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className={cn(shellCls, "flex flex-col justify-center")}
      >
        <h3 className="text-base font-semibold text-foreground mb-1">Team performance</h3>
        <p className="text-sm text-muted-foreground">
          {teamName
            ? "No team activity yet this week."
            : "Join a team to see live performance."}
        </p>
      </motion.div>
    );
  }

  const top = members.slice(0, 5);
  const metricLabel = top[0]?.metric || "score";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={shellCls}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">
          Team performance{teamName ? ` — ${teamName}` : ""}
        </h3>
        <span className="text-xs text-muted-foreground">Top {top.length} · This week</span>
      </div>

      <ul className="divide-y divide-border">
        {top.map((m, idx) => {
          const displayName = cleanName(m.name);
          return (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={cn(
                "flex items-center gap-3 py-3 px-2 -mx-2 rounded-md transition-colors",
                m.isCurrentUser && "bg-primary/5"
              )}
            >
              <span className="w-5 text-center text-xs tabular-nums text-muted-foreground">
                {m.rank}
              </span>

              <div className="relative w-9 h-9 rounded-full border border-border bg-muted flex items-center justify-center text-xs font-medium overflow-hidden shrink-0 text-foreground">
                {m.avatarUrl ? (
                  <img src={m.avatarUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span>{initials(displayName)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">
                    {displayName}
                  </span>
                  {m.isCurrentUser && (
                    <span className="text-[10px] font-medium text-primary uppercase">You</span>
                  )}
                </div>
                {m.level !== undefined && (
                  <span className="text-xs text-muted-foreground">Level {m.level}</span>
                )}
              </div>

              <div className="text-right shrink-0">
                <NumberFlash
                  value={m.value}
                  className="text-sm font-semibold tabular-nums text-foreground"
                >
                  {m.value.toLocaleString()}
                </NumberFlash>
                <div className="text-xs text-muted-foreground">{metricLabel}</div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </motion.div>
  );
}
