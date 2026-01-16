import { Crown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ViperBadge } from "@/components/ui/viper-badge";
import { LeaderboardEntry, MetricType } from "@/hooks/useLeaderboard";
import { cn } from "@/lib/utils";

interface LeaderboardPodiumProps {
  topThree: LeaderboardEntry[];
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

export function LeaderboardPodium({ topThree, metricType }: LeaderboardPodiumProps) {
  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [
    topThree[1], // 2nd place - left
    topThree[0], // 1st place - center
    topThree[2], // 3rd place - right
  ].filter(Boolean);

  const podiumHeights = ['h-32', 'h-44', 'h-24'];
  const podiumColors = [
    'from-zinc-400/20 to-zinc-500/10 border-zinc-400/30', // Silver
    'from-yellow-500/20 to-amber-500/10 border-yellow-500/30', // Gold
    'from-orange-700/20 to-orange-800/10 border-orange-700/30', // Bronze
  ];

  if (podiumOrder.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No rankings available yet. Be the first!
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-4 py-8">
      {podiumOrder.map((entry, index) => {
        if (!entry) return null;
        const actualRank = entry.rank;
        const isFirst = actualRank === 1;

        return (
          <div
            key={entry.user_id}
            className={cn(
              "flex flex-col items-center",
              index === 1 ? "order-2" : index === 0 ? "order-1" : "order-3"
            )}
          >
            {/* Crown for 1st place */}
            {isFirst && (
              <Crown className="h-8 w-8 text-yellow-500 mb-2 animate-pulse" />
            )}

            {/* Avatar */}
            <div className={cn(
              "relative mb-3",
              isFirst && "ring-4 ring-yellow-500/50 rounded-full"
            )}>
              <Avatar className={cn(
                "border-2",
                isFirst ? "h-24 w-24 border-yellow-500" : "h-20 w-20 border-border"
              )}>
                <AvatarImage src={entry.avatar_url || undefined} />
                <AvatarFallback className="text-xl font-bold bg-muted">
                  {entry.full_name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className={cn(
                "absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                actualRank === 1 ? "bg-yellow-500 text-yellow-950" :
                actualRank === 2 ? "bg-zinc-400 text-zinc-950" :
                "bg-orange-700 text-orange-100"
              )}>
                {actualRank}
              </div>
            </div>

            {/* Name and title */}
            <h3 className={cn(
              "font-bold text-center",
              isFirst ? "text-lg text-foreground" : "text-sm text-muted-foreground"
            )}>
              {entry.full_name}
            </h3>
            {entry.title && (
              <p className="text-xs text-muted-foreground text-center">
                {entry.title}
              </p>
            )}

            {/* Level badge */}
            <ViperBadge variant="default" size="sm" className="mt-2">
              Lvl {entry.current_level}
            </ViperBadge>

            {/* Score */}
            <div className="flex items-center gap-1 mt-2">
              <span className={cn(
                "font-display font-bold",
                isFirst ? "text-2xl text-primary" : "text-xl"
              )}>
                {formatValue(entry.value, metricType)}
              </span>
              <TrendIcon trend={entry.trend} />
            </div>

            {/* Podium base */}
            <div className={cn(
              "mt-4 w-28 rounded-t-lg bg-gradient-to-t border-t border-x",
              podiumHeights[index],
              podiumColors[index === 1 ? 0 : index === 0 ? 1 : 2]
            )}>
              {isFirst && (
                <div className="absolute inset-0 bg-yellow-500/5 animate-pulse rounded-t-lg" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}