import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUpcomingFollowUps } from "@/hooks/useUpcomingFollowUps";
import { useGhlStats } from "@/hooks/useGhlStats";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/hooks/useAuth";
import { Phone, Calendar, Trophy, Flame } from "lucide-react";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";
import { motion } from "framer-motion";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

export default function CommandCenter() {
  const { data, loading: dashboardLoading, error: dashboardError } = useDashboardData();
  const { followUps, isLoading: followUpsLoading, error: followUpsError } = useUpcomingFollowUps();
  const { stats: ghl, loading: ghlLoading, error: ghlError } = useGhlStats();
  const { user } = useAuth();
  const {
    leaderboard,
    isLoading: leaderboardLoading,
    error: leaderboardError,
    metricLabels,
    metricType,
  } = useLeaderboard();

  const firstName = data?.profile?.full_name?.split(" ")[0] || "Operator";
  const challenge = data?.challenge;
  const activities = data?.activities || [];

  return (
    <AppLayout title="Command Center">
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Hero greeting + streak rule */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-2"
        >
          <div>
            {dashboardLoading ? (
              <div className="space-y-3">
                <EditorialSkeleton className="h-14 w-80" />
                <EditorialSkeleton className="h-3 w-56" />
              </div>
            ) : (
              <div className="gold-vignette">
                <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
                  {getGreeting()}, <span className="italic">{firstName}.</span>
                </h1>
                <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mt-3">
                  <span className="text-success">●</span> System Status: Active · {formatDate()}
                </p>
              </div>
            )}
          </div>
          <div className="md:border-l md:border-border md:pl-10 flex md:flex-col items-baseline md:items-start gap-3 md:gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">Day Streak</span>
            <span className="flex items-center gap-3">
              {ghlLoading ? (
                <EditorialSkeleton className="h-14 w-16" />
              ) : (
                <>
                  <span className="font-display italic text-5xl md:text-6xl leading-none text-primary tabular-nums">
                    {ghl.currentStreak}
                  </span>
                  {ghl.currentStreak > 7 && (
                    <Flame className="h-7 w-7 text-primary animate-flame-flicker" strokeWidth={1.5} />
                  )}
                </>
              )}
            </span>
          </div>
        </motion.div>

        {/* Mission + Streak meta bento */}
        <DailyChallenge
          challenge={challenge ? {
            title: challenge.title,
            description: challenge.description,
            reward: challenge.xp_reward,
            progress: challenge.progress,
            goal: challenge.target,
          } : {
            title: "No Active Mission",
            description: "Today's briefing is clear. Use the silence to drill objections or audit the pipeline before tomorrow's slate drops.",
            reward: 0,
            progress: 0,
            goal: 1,
          }}
          streak={ghl.currentStreak}
          loading={dashboardLoading || ghlLoading}
          error={dashboardError || ghlError}
        />

        {/* KPI strip — 4 hairline tiles */}
        <div className="bento-grid grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Calls Today"
            value={ghl.callsToday}
            icon={Phone}
            delay={0}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Pipeline Deals"
            value={ghl.dealsInPipeline}
            icon={Calendar}
            delay={80}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Won This Week"
            value={Math.round(ghl.revenueWonThisWeek)}
            format="currency"
            icon={Trophy}
            comparison={{
              value: ghl.dealsWonThisWeek,
              label: "deals",
            }}
            delay={160}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Day Streak"
            value={ghl.currentStreak}
            icon={Flame}
            delay={240}
            loading={ghlLoading}
            error={ghlError}
          />
        </div>

        {/* Activity + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border">
          <div className="lg:col-span-8 bg-background">
            <RecentActivity
              activities={activities}
              loading={dashboardLoading}
              error={dashboardError}
            />
          </div>
          <div className="lg:col-span-4 bg-background">
            <QuickActions
              followUps={followUps}
              followUpsLoading={followUpsLoading}
              followUpsError={followUpsError}
            />
          </div>
        </div>

        {/* Team Pulse + Quote */}
        <div className="bento-grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <TeamPulse
              members={leaderboard.slice(0, 5).map((m) => ({
                id: m.user_id,
                name: m.full_name,
                avatarUrl: m.avatar_url || undefined,
                value: m.value,
                metric: metricLabels[metricType].toLowerCase(),
                rank: m.rank,
                level: m.current_level,
                isCurrentUser: m.user_id === user?.id,
              }))}
              teamName={data?.profile?.team?.name || null}
              loading={leaderboardLoading}
              error={leaderboardError}
            />
          </div>
          <div className="lg:col-span-5">
            <MotivationalQuote />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
