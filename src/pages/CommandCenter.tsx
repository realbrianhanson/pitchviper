import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useUpcomingFollowUps } from "@/hooks/useUpcomingFollowUps";
import { Phone, Calendar, Target, TrendingUp, Loader2 } from "lucide-react";
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

// Calculate percentage change
function calcChange(today: number, yesterday: number | null | undefined): number {
  if (!yesterday || yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function CommandCenter() {
  const { data, loading, error } = useDashboardData();
  const { followUps } = useUpcomingFollowUps();

  if (loading) {
    return (
      <AppLayout title="Command Center">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Command Center">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <p className="text-destructive mb-2">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const firstName = data?.profile?.full_name?.split(" ")[0] || "there";
  const todayStats = data?.todayStats;
  const yesterdayStats = data?.yesterdayStats;
  const challenge = data?.challenge;
  const activities = data?.activities || [];
  const teamLeaderboard = data?.teamLeaderboard;

  // Calculate conversion rate
  const totalCalls = (todayStats?.calls_made || 0) + (todayStats?.calls_received || 0);
  const conversions = todayStats?.appointments_set || 0;
  const conversionRate = totalCalls > 0 ? Math.round((conversions / totalCalls) * 100) : 0;

  const yesterdayTotalCalls = (yesterdayStats?.calls_made || 0) + (yesterdayStats?.calls_received || 0);
  const yesterdayConversions = yesterdayStats?.appointments_set || 0;
  const yesterdayConversionRate = yesterdayTotalCalls > 0 
    ? Math.round((yesterdayConversions / yesterdayTotalCalls) * 100) 
    : 0;

  return (
    <AppLayout title="Command Center">
      <div className="space-y-6">
        {/* Top Section - Greeting */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <motion.h1
              className="text-3xl font-display font-bold text-foreground"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {getGreeting()}, {firstName}
            </motion.h1>
            <motion.p
              className="text-muted-foreground mt-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {formatDate()}
            </motion.p>
          </div>
        </motion.div>

        {/* Daily Challenge & Streak */}
        <DailyChallenge
          challenge={challenge ? {
            title: challenge.title,
            description: challenge.description,
            reward: challenge.xp_reward,
            progress: challenge.progress,
            goal: challenge.target,
          } : {
            title: "No Challenge Today",
            description: "Check back tomorrow for a new challenge!",
            reward: 0,
            progress: 0,
            goal: 1,
          }}
          streak={data?.profile?.current_streak || 0}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Calls Today"
            value={todayStats?.calls_made || 0}
            icon={Phone}
            comparison={{ 
              value: calcChange(todayStats?.calls_made || 0, yesterdayStats?.calls_made), 
              label: "vs yesterday" 
            }}
            delay={0}
          />
          <MetricCard
            label="Appointments Set"
            value={todayStats?.appointments_set || 0}
            icon={Calendar}
            progress={{ current: todayStats?.appointments_set || 0, goal: 8 }}
            delay={100}
          />
          <MetricCard
            label="Revenue Closed"
            value={Math.round(todayStats?.revenue_closed || 0)}
            format="currency"
            icon={Target}
            comparison={{ 
              value: calcChange(
                Math.round(todayStats?.revenue_closed || 0), 
                yesterdayStats?.revenue_closed ? Math.round(yesterdayStats.revenue_closed) : null
              ), 
              label: "vs yesterday" 
            }}
            delay={200}
          />
          <MetricCard
            label="Conversion Rate"
            value={conversionRate}
            format="percentage"
            icon={TrendingUp}
            comparison={{ 
              value: conversionRate - yesterdayConversionRate, 
              label: "vs yesterday" 
            }}
            delay={300}
          />
        </div>

        {/* Middle Section - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-2">
            <RecentActivity activities={activities} />
          </div>

          {/* Right Column - Quick Actions & Follow-ups */}
          <div>
            <QuickActions followUps={followUps} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Pulse */}
          <TeamPulse 
            members={teamLeaderboard?.map(m => ({
              id: m.user_id,
              name: m.name,
              avatarUrl: m.avatar_url || undefined,
              value: m.calls_made,
              metric: "calls",
              rank: m.rank,
            })) || []} 
            teamName={data?.profile?.team?.name || null} 
          />

          {/* Motivational Quote */}
          <div className="flex flex-col justify-center">
            <MotivationalQuote />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}