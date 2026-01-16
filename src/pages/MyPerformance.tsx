import { AppLayout } from "@/components/layout/AppLayout";
import { usePerformanceData } from "@/hooks/usePerformanceData";
import { PersonalScorecard } from "@/components/performance/PersonalScorecard";
import { PerformanceTrendsChart } from "@/components/performance/PerformanceTrendsChart";
import { AICoachInsights } from "@/components/performance/AICoachInsights";
import { GoalsSection } from "@/components/performance/GoalsSection";
import { BadgesGrid } from "@/components/performance/BadgesGrid";
import { Skeleton } from "@/components/ui/skeleton";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";

export default function MyPerformance() {
  const {
    profile,
    careerStats,
    dailyTrends,
    teamAverages,
    insights,
    insightsLoading,
    goals,
    goalProgress,
    badges,
    loading,
    xpToNextLevel,
    fetchInsights,
    updateGoals,
  } = usePerformanceData();

  if (loading) {
    return (
      <AppLayout title="My Performance">
        <div className="space-y-6 animate-fade-in">
          {/* Scorecard Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <ViperCard key={i} variant="glass">
                <ViperCardContent className="p-4">
                  <Skeleton className="h-8 w-8 rounded-lg mb-3" />
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-20" />
                </ViperCardContent>
              </ViperCard>
            ))}
          </div>
          
          {/* Charts Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ViperCard variant="glass">
              <ViperCardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
              </ViperCardContent>
            </ViperCard>
            <ViperCard variant="glass">
              <ViperCardContent className="p-4">
                <Skeleton className="h-6 w-32 mb-4" />
                <Skeleton className="h-64 w-full" />
              </ViperCardContent>
            </ViperCard>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profile || !careerStats) {
    return (
      <AppLayout title="My Performance">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Unable to load performance data</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="My Performance">
      <div className="space-y-8 animate-fade-in">
        {/* Personal Scorecard */}
        <section>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            Personal Scorecard
          </h2>
          <PersonalScorecard 
            profile={profile} 
            careerStats={careerStats} 
            xpToNextLevel={xpToNextLevel}
          />
        </section>

        {/* Performance Trends */}
        <section>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            30-Day Trends
          </h2>
          <PerformanceTrendsChart 
            dailyTrends={dailyTrends} 
            teamAverages={teamAverages}
          />
        </section>

        {/* AI Insights + Goals Row */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AICoachInsights 
            insights={insights}
            loading={insightsLoading}
            onRefresh={fetchInsights}
          />
          <GoalsSection 
            goals={goals}
            progress={goalProgress}
            onUpdateGoals={updateGoals}
          />
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">
            Achievement Badges
          </h2>
          <BadgesGrid badges={badges} />
        </section>
      </div>
    </AppLayout>
  );
}
