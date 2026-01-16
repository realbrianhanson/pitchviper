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
    <div className="space-y-6">
      {/* Rep Header */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Avatar className="h-20 w-20 border-2 border-primary">
            <AvatarImage src={rep.avatar_url || undefined} />
            <AvatarFallback className="text-2xl">
              {rep.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1">
            <ViperBadge variant="secondary" size="sm">
              Lvl {rep.current_level}
            </ViperBadge>
          </div>
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-bold">{rep.full_name}</h2>
          {rep.title && (
            <p className="text-muted-foreground">{rep.title}</p>
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
      <div className="grid grid-cols-2 gap-3">
        <ViperCard variant="glass" className="p-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-warning" />
            <div>
              <p className="text-2xl font-bold text-warning">{rep.current_streak}</p>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
        </ViperCard>

        <ViperCard variant="glass" className="p-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-2xl font-bold text-primary">{rep.xp_points.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
          </div>
        </ViperCard>
      </div>

      {/* 7-Day Metrics */}
      {stats && (
        <ViperCard variant="glass">
          <ViperCardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">7-Day Performance</h3>
              <div className={cn(
                "flex items-center gap-1 text-sm px-2 py-1 rounded-full",
                stats.calls_30d > stats.team_avg_calls ? "bg-success/10 text-success" :
                stats.calls_30d < stats.team_avg_calls * 0.8 ? "bg-destructive/10 text-destructive" :
                "bg-muted text-muted-foreground"
              )}>
                {getTrendIcon(undefined)}
                <span>{stats.calls_30d > stats.team_avg_calls ? 'Above Avg' : 'Below Avg'}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Calls</p>
                <p className="text-xl font-bold">{stats.calls_30d}</p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {stats.team_avg_calls.toFixed(0)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connect Rate</p>
                <p className="text-xl font-bold">{stats.connect_rate}%</p>
                <p className="text-xs text-muted-foreground">
                  Team avg: {stats.team_avg_connect_rate}%
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deals Closed</p>
                <p className="text-xl font-bold text-success">{stats.deals_closed}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-xl font-bold text-success">
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
