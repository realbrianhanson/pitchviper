import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LeaderboardEntry, MetricType } from "@/hooks/useLeaderboard";

interface CurrentUserRankBarProps {
  userRank: LeaderboardEntry;
  metricType: MetricType;
  nextRankValue?: number;
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

export function CurrentUserRankBar({ userRank, metricType, nextRankValue }: CurrentUserRankBarProps) {
  const pointsToNext = nextRankValue ? nextRankValue - userRank.value : 0;

  return (
    <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-primary/30 p-4 shadow-lg">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center font-bold text-xl text-primary">
            #{userRank.rank}
          </div>
          <Avatar className="h-10 w-10 border border-primary/30">
            <AvatarImage src={userRank.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
              {userRank.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">Your Rank</p>
            <p className="text-sm text-muted-foreground">
              Score: {formatValue(userRank.value, metricType)}
            </p>
          </div>
        </div>

        {pointsToNext > 0 && (
          <div className="text-right">
            <p className="text-sm text-muted-foreground">To next rank</p>
            <p className="font-display font-bold text-primary">
              +{formatValue(pointsToNext, metricType)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}