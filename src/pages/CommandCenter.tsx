import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
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
  });
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

  const cleanFirstName = (raw?: string | null) => {
    if (!raw) return "";
    const stripped = raw
      .replace(/\bhttps?:\/\/\S+/gi, "")
      .replace(/\bwww\.\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const first = stripped.split(" ")[0] || "";
    return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
  };
  const firstName = cleanFirstName(data?.profile?.full_name) || "there";
  const challenge = data?.challenge;
  const activities = data?.activities || [];

  return (
    <AppLayout title="Command Center">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {dashboardLoading ? (
            <div className="space-y-2">
              <EditorialSkeleton className="h-3 w-40" />
              <EditorialSkeleton className="h-9 w-72" />
              <EditorialSkeleton className="h-4 w-56" />
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-1.5">{formatDate()}</p>
              <h1 className="text-[32px] md:text-[40px] font-semibold leading-tight tracking-tight text-foreground">
                {getGreeting()}, {firstName}.
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Here's what's moving today.
              </p>
            </>
          )}
        </motion.div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Calls today"
            value={ghl.callsToday}
            icon={Phone}
            delay={0}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Pipeline deals"
            value={ghl.dealsInPipeline}
            icon={Calendar}
            delay={60}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Won this week"
            value={Math.round(ghl.revenueWonThisWeek)}
            format="currency"
            icon={Trophy}
            comparison={{
              value: ghl.dealsWonThisWeek,
              label: ghl.dealsWonThisWeek === 1 ? "deal" : "deals",
            }}
            delay={120}
            loading={ghlLoading}
            error={ghlError}
          />
          <MetricCard
            label="Day streak"
            value={ghl.currentStreak}
            icon={Flame}
            delay={180}
            loading={ghlLoading}
            error={ghlError}
          />
        </div>

        {/* Row 1: Focus + Quick actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <DailyChallenge
              challenge={challenge ? {
                title: challenge.title,
                description: challenge.description,
                reward: challenge.xp_reward,
                progress: challenge.progress,
                goal: challenge.target,
              } : {
                title: "No active focus",
                description: "You're clear for today. Use the time to run a roleplay drill or review your pipeline before tomorrow.",
                reward: 0,
                progress: 0,
                goal: 1,
              }}
              streak={ghl.currentStreak}
              loading={dashboardLoading || ghlLoading}
              error={dashboardError || ghlError}
            />
          </div>
          <div className="lg:col-span-5">
            <QuickActions
              followUps={followUps}
              followUpsLoading={followUpsLoading}
              followUpsError={followUpsError}
            />
          </div>
        </div>

        {/* Row 2: Recent activity + Team pulse */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7">
            <RecentActivity
              activities={activities}
              loading={dashboardLoading}
              error={dashboardError}
            />
          </div>
          <div className="lg:col-span-5">
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
        </div>
      </div>
    </AppLayout>
  );
}
