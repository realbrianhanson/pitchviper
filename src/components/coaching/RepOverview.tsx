import { RepCoachingProfile, RepStats } from "@/hooks/useCoaching";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViperBadge } from "@/components/ui/viper-badge";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Calendar, Flame, TrendingUp, TrendingDown, Minus, Zap } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RepOverviewProps {
  rep: RepCoachingProfile;
  stats: RepStats | null;
  lastSession: { notes: string; created_at: string } | null;
}

export function RepOverview({ rep, stats, lastSession }: RepOverviewProps) {
  const getTrendIcon = (trend: 'improving' | 'declining' | 'steady' | undefined) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendLabel = (trend: 'improving' | 'declining' | 'steady' | undefined) => {
    switch (trend) {
      case 'improving':
        return 'Trending Up';
      case 'declining':
        return 'Needs Attention';
      default:
        return 'Steady';
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Rep Header */}
      <div className="flex items-center gap-3 md:gap-4">
        <div className="relative shrink-0">
          <Avatar className="h-14 w-14 md:h-20 md:w-20 border-2 border-primary">
            <AvatarImage src={rep.avatar_url || undefined} />
            <AvatarFallback className="text-lg md:text-2xl">
              {rep.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <ViperBadge variant="secondary" size="sm">
              Lvl {rep.current_level}
            </ViperBadge>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-bold truncate">{rep.full_name}</h2>
          {rep.title && (
            <p className="text-sm md:text-base text-muted-foreground truncate">{rep.title}</p>
          )}
          {rep.hire_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3" />
              Hired {format(new Date(rep.hire_date), 'MMM d, yyyy')}
            </p>
          )}
        </div>
      </div>

      {/* Streak & XP */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        <ViperCard variant="glass" className="p-2 md:p-3">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 md:h-5 md:w-5 text-warning shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-warning">{rep.current_streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </ViperCard>

        <ViperCard variant="glass" className="p-2 md:p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 md:h-5 md:w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xl md:text-2xl font-bold text-primary truncate">{rep.xp_points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
        </ViperCard>
      </div>

      {/* 7-Day Metrics */}
      {stats && (
        <ViperCard variant="glass">
          <ViperCardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <h3 className="font-semibold text-sm md:text-base">7-Day Performance</h3>
              <div className={cn(
                "flex items-center gap-1 text-xs md:text-sm px-2 py-1 rounded-full w-fit",
                stats.calls_30d > stats.team_avg_calls ? "bg-success/10 text-success" :
                stats.calls_30d < stats.team_avg_calls * 0.8 ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                {getTrendIcon(undefined)}
                <span>{stats.calls_30d > stats.team_avg_calls ? 'Above Avg' : 'Below Avg'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Calls</p>
                <p className="text-lg md:text-xl font-bold">{stats.calls_30d}</p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {stats.team_avg_calls.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Connect Rate</p>
                <p className="text-lg md:text-xl font-bold">{stats.connect_rate}%</p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {stats.team_avg_connect_rate}%
                </p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Deals Closed</p>
                <p className="text-lg md:text-xl font-bold text-success">{stats.deals_closed}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Revenue</p>
                <p className="text-lg md:text-xl font-bold text-success truncate">
                  ${stats.revenue.toLocaleString()}
                </p>
              </div>
            </div>
          </ViperCardContent>
        </ViperCard>
      )}

      {/* Last Coaching Session */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4">
          <h3 className="font-semibold mb-2">Last Coaching Session</h3>
          {lastSession ? (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                {format(new Date(lastSession.created_at), 'MMM d, yyyy')}
              </p>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {lastSession.notes}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              No coaching sessions recorded yet.
            </p>
          )}
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}
