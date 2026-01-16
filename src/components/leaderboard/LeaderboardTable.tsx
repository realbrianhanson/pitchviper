import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViperBadge } from "@/components/ui/viper-badge";
import { LeaderboardEntry, MetricType } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  metricType: MetricType;
}

const formatValue = (value: number, metricType: MetricType) => {
  if (metricType === 'revenue') {
    return `$${value.toLocaleString()}`;
  }
  if (metricType === 'roleplay') {
    return `${value}%`;
  }
  return value.toLocaleString();
};

const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'same' }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-success" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-destructive" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function LeaderboardTable({ entries, metricType }: LeaderboardTableProps) {
  const { user } = useAuth();

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        const isCurrentUser = entry.user_id === user?.id;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex items-center gap-4 p-4 rounded-lg border transition-all",
              isCurrentUser
                ? "bg-primary/10 border-primary/30 ring-1 ring-primary/20"
                : "bg-card/50 border-border hover:bg-card/80"
            )}
          >
            {/* Rank */}
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg",
              entry.rank <= 10 
                ? "bg-primary/20 text-primary" 
                : "bg-muted text-muted-foreground"
            )}>
              {entry.rank}
            </div>

            {/* Avatar */}
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={entry.avatar_url || undefined} />
              <AvatarFallback className="bg-muted text-sm font-bold">
                {entry.full_name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>

            {/* Name and info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold truncate">
                  {entry.full_name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-primary">(You)</span>
                  )}
                </h4>
                <ViperBadge variant="default" size="sm">
                  Lvl {entry.current_level}
                </ViperBadge>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {entry.title && <span>{entry.title}</span>}
                {entry.team_name && (
                  <>
                    <span>•</span>
                    <span>{entry.team_name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Score and trend */}
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-xl">
                {formatValue(entry.value, metricType)}
              </span>
              <TrendIcon trend={entry.trend} />
            </div>
          </div>
        );
      })}
    </div>
  );
}