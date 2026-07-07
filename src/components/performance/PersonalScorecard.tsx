import { Flame, Trophy, Phone, DollarSign, Target } from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Progress } from "@/components/ui/progress";
import { PerformanceProfile, CareerStats } from "@/hooks/usePerformanceData";
import { useGhlStats } from "@/hooks/useGhlStats";

interface PersonalScorecardProps {
  profile: PerformanceProfile;
  careerStats: CareerStats;
  xpToNextLevel: (level: number) => number;
}

export function PersonalScorecard({ profile, careerStats, xpToNextLevel }: PersonalScorecardProps) {
  // Streak is a headline KPI — read from the canonical ghl_activities source
  // so it always matches Command Center and the LiveTicker. `profile.currentStreak`
  // (daily_stats-derived) is only used as a graceful fallback while ghl loads.
  const { stats: ghl, loading: ghlLoading } = useGhlStats();
  const currentStreak = ghlLoading ? profile.currentStreak : ghl.currentStreak;

  const nextLevelXp = xpToNextLevel(profile.currentLevel);
  const currentLevelXp = xpToNextLevel(profile.currentLevel - 1);
  const xpProgress = ((profile.xpPoints - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {/* Level & XP */}
      <ViperCard variant="glass" className="col-span-2 md:col-span-1">
        <ViperCardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Level</p>
              <p className="text-3xl font-display font-bold text-foreground">{profile.currentLevel}</p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{profile.xpPoints.toLocaleString()} XP</span>
              <span>{nextLevelXp.toLocaleString()} XP</span>
            </div>
            <Progress value={xpProgress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {(nextLevelXp - profile.xpPoints).toLocaleString()} XP to Level {profile.currentLevel + 1}
            </p>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Current Streak */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-warning/20 relative">
              <Flame className="h-5 w-5 text-warning animate-pulse" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Streak</p>
              <p className="text-3xl font-display font-bold text-foreground">{profile.currentStreak}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Best: {profile.longestStreak} days
          </p>
          {profile.currentStreak >= 7 && (
            <div className="mt-2 px-2 py-1 rounded-full bg-warning/20 text-warning text-xs font-medium text-center">
              🔥 On Fire!
            </div>
          )}
        </ViperCardContent>
      </ViperCard>

      {/* Total Calls */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Phone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Calls</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {careerStats.totalCalls.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">All time</p>
        </ViperCardContent>
      </ViperCard>

      {/* Total Revenue */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/20">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Revenue</p>
              <p className="text-2xl font-display font-bold text-foreground">
                ${careerStats.totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {careerStats.totalDeals} deals closed
          </p>
        </ViperCardContent>
      </ViperCard>

      {/* Close Rate */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-magenta/20">
              <Target className="h-5 w-5 text-magenta" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Close Rate</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {careerStats.careerCloseRate.toFixed(1)}%
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Career average</p>
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}
