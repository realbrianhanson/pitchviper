import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Trophy, RefreshCw, Loader2 } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LeaderboardFilters } from "@/components/leaderboard/LeaderboardFilters";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { CurrentUserRankBar } from "@/components/leaderboard/CurrentUserRankBar";
import { CompetitionsPanel } from "@/components/leaderboard/CompetitionsPanel";

export default function Leaderboards() {
  const {
    leaderboard,
    topThree,
    restOfRankings,
    currentUserRank,
    competitions,
    isLoading,
    metricType,
    setMetricType,
    timePeriod,
    setTimePeriod,
    refetch,
  } = useLeaderboard();

  // Calculate next rank value for progress bar
  const nextRankValue = currentUserRank && currentUserRank.rank > 1
    ? leaderboard.find(e => e.rank === currentUserRank.rank - 1)?.value
    : undefined;

  return (
    <AppLayout title="Leaderboards">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Team Rankings</h1>
              <p className="text-sm text-muted-foreground">See who's crushing it</p>
            </div>
          </div>
          <ViperButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </ViperButton>
        </div>

        {/* Filters */}
        <LeaderboardFilters
          metricType={metricType}
          onMetricChange={setMetricType}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading rankings...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Leaderboard Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Podium */}
              <ViperCard variant="glass">
                <ViperCardHeader>
                  <ViperCardTitle>Top Performers</ViperCardTitle>
                </ViperCardHeader>
                <ViperCardContent>
                  <LeaderboardPodium topThree={topThree} metricType={metricType} />
                </ViperCardContent>
              </ViperCard>

              {/* Full Rankings Table */}
              {restOfRankings.length > 0 && (
                <ViperCard variant="glass">
                  <ViperCardHeader>
                    <ViperCardTitle>Full Rankings</ViperCardTitle>
                  </ViperCardHeader>
                  <ViperCardContent>
                    <LeaderboardTable entries={restOfRankings} metricType={metricType} />
                  </ViperCardContent>
                </ViperCard>
              )}
            </div>

            {/* Right Column - Competitions */}
            <div className="space-y-6">
              <CompetitionsPanel competitions={competitions} />
            </div>
          </div>
        )}

        {/* Current User Rank Bar (sticky at bottom) */}
        {currentUserRank && !isLoading && (
          <CurrentUserRankBar
            userRank={currentUserRank}
            metricType={metricType}
            nextRankValue={nextRankValue}
          />
        )}
      </div>
    </AppLayout>
  );
}
