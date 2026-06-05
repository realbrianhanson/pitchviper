import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  metric: string;
  rank: number;
}

interface TeamPulseProps {
  members: TeamMember[];
  teamName: string | null;
}

export function TeamPulse({ members, teamName }: TeamPulseProps) {
  if (!teamName) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bento-tile min-h-[140px] flex flex-col justify-center"
      >
        <span className="eyebrow font-bold mb-3">Team Pulse</span>
        <p className="text-sm text-muted-foreground italic font-display">
          Join a squadron to synchronize real-time performance metrics.
        </p>
      </motion.div>
    );
  }

  const top = members.slice(0, 4);
  const remaining = Math.max(0, members.length - 4);
  const onlineCount = members.length;
  const topPerformer = members[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="bento-tile min-h-[140px]"
    >
      <div className="flex items-center justify-between mb-6">
        <span className="eyebrow font-bold">Team Pulse — {teamName}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
          {onlineCount} Operators
        </span>
      </div>

      <div className="flex items-center gap-8">
        <div className="flex -space-x-3">
          {top.map((m) => (
            <div
              key={m.id}
              className="w-10 h-10 border-2 border-background bg-accent flex items-center justify-center text-[10px] font-mono uppercase overflow-hidden"
              title={`${m.name} — ${m.value} ${m.metric}`}
            >
              {m.avatarUrl ? (
                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" />
              ) : (
                <span>{m.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}</span>
              )}
            </div>
          ))}
          {remaining > 0 && (
            <div className="w-10 h-10 border-2 border-background bg-accent flex items-center justify-center text-[10px] font-mono text-primary">
              +{remaining}
            </div>
          )}
        </div>
        <div className="flex-1 h-px bg-border" />
        {topPerformer && (
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
              Leading Today
            </div>
            <div className="text-sm mt-1">
              <span className="font-display italic text-primary">{topPerformer.name.split(" ")[0]}</span>
              <span className="font-mono text-xs ml-2 tabular-nums text-foreground">{topPerformer.value}</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60 ml-1">{topPerformer.metric}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
