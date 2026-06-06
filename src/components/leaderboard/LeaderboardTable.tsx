import { TrendingUp, TrendingDown, Minus, Users, ArrowUp, ArrowDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViperBadge } from "@/components/ui/viper-badge";
import { LeaderboardEntry, MetricType, ViewMode } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { EditorialEmpty } from "@/components/ui/editorial-empty";
import { motion, AnimatePresence } from "framer-motion";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  metricType: MetricType;
  viewMode?: ViewMode;
  currentUserTeamId?: string | null;
}

const formatValue = (value: number, metricType: MetricType) => {
  if (metricType === 'revenue') {
    return `$${value.toLocaleString()}`;
  }
  return value.toLocaleString();
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function LeaderboardTable({ entries, metricType, viewMode = 'individual', currentUserTeamId }: LeaderboardTableProps) {
  const { user } = useAuth();

  if (entries.length === 0) {
    return (
      <EditorialEmpty
        eyebrow="Rankings"
        title={viewMode === 'team' ? "No team standings yet" : "No rankings yet"}
        description={viewMode === 'team' ? "Team totals will appear once reps start closing deals and logging activity." : "Be the first to log calls and close deals to appear on the board."}
        size="sm"
      />
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {entries.map((entry) => {
          const isCurrentUser = viewMode === 'individual' && entry.user_id === user?.id;
          const isCurrentTeam = viewMode === 'team' && currentUserTeamId && entry.user_id === currentUserTeamId;
          const isHighlighted = isCurrentUser || isCurrentTeam;
          const delta = entry.rank_delta ?? 0;
          const moved = delta !== 0 && entry.previous_rank !== undefined;

          return (
            <motion.div
              key={entry.user_id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{
                opacity: 1,
                y: 0,
                backgroundColor: moved
                  ? delta > 0
                    ? ["hsl(var(--success) / 0.15)", "hsl(var(--card) / 0.5)"]
                    : ["hsl(var(--destructive) / 0.12)", "hsl(var(--card) / 0.5)"]
                  : undefined,
              }}
              exit={{ opacity: 0, y: -8 }}
              transition={{
                layout: { type: "spring", stiffness: 280, damping: 30 },
                backgroundColor: { duration: 1.6, ease: "easeOut" },
                default: { duration: 0.3 },
              }}
              className={cn(
                "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                isHighlighted
                  ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                  : "bg-card/50 border-border hover:bg-card/80"
              )}
            >
              {/* Rank */}
              <div className="relative">
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg tabular-nums",
                  entry.rank <= 10
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                )}>
                  {entry.rank}
                </div>
                {moved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.6, y: delta > 0 ? 4 : -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className={cn(
                      "absolute -top-1.5 -right-1.5 flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-mono font-bold leading-none",
                      delta > 0
                        ? "bg-success/20 text-success"
                        : "bg-destructive/20 text-destructive"
                    )}
                  >
                    {delta > 0 ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
                    {Math.abs(delta)}
                  </motion.div>
                )}
              </div>

              {/* Avatar */}
              {viewMode === 'team' ? (
                <div className={cn(
                  "h-12 w-12 rounded-full flex items-center justify-center border",
                  isHighlighted ? "border-primary/50 bg-primary/10" : "border-border bg-muted"
                )}>
                  <Users className="h-5 w-5 text-muted-foreground" />
                </div>
              ) : (
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={entry.avatar_url || undefined} />
                  <AvatarFallback className="bg-muted text-sm font-bold">
                    {entry.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Name and info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold truncate">
                    {entry.full_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-primary">(You)</span>
                    )}
                    {isCurrentTeam && (
                      <span className="ml-2 text-xs text-primary">(Your Team)</span>
                    )}
                  </h4>
                  <ViperBadge variant="default" size="sm">
                    Lvl {entry.current_level}
                  </ViperBadge>
                  <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 tabular-nums">
                    {entry.xp_points.toLocaleString()} XP
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {entry.title && <span className="truncate">{entry.title}</span>}
                  {entry.team_name && (
                    <>
                      <span>•</span>
                      <span className="truncate">{entry.team_name}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Score and trend */}
              <div className="flex items-center gap-3">
                <span className="font-display font-bold text-xl tabular-nums">
                  {formatValue(entry.value, metricType)}
                </span>
                <TrendIcon trend={entry.trend} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
