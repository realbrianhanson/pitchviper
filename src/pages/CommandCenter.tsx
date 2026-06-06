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
import { Phone, Calendar, Trophy, Flame } from "lucide-react";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";
import { EditorialEmpty } from "@/components/ui/editorial-empty";
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

function calcChange(today: number, yesterday: number | null | undefined): number {
  if (!yesterday || yesterday === 0) return today > 0 ? 100 : 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}

export default function CommandCenter() {
  const { data, loading, error } = useDashboardData();
  const { followUps } = useUpcomingFollowUps();
  const { stats: ghl } = useGhlStats();

  if (loading) {
    return (
      <AppLayout title="Command Center">
        <EditorialLoading label="Initializing Command Surface" className="h-[60vh]" />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Command Center">
        <EditorialEmpty
          eyebrow="The Wire"
          title="Transmission Failed"
          description={error}
          className="h-[60vh]"
        />
      </AppLayout>
    );
  }

  const firstName = data?.profile?.full_name?.split(" ")[0] || "Operator";
  const todayStats = data?.todayStats;
  const yesterdayStats = data?.yesterdayStats;
  const challenge = data?.challenge;
  const activities = data?.activities || [];
  const teamLeaderboard = data?.teamLeaderboard;

  const totalCalls = (todayStats?.calls_made || 0) + (todayStats?.calls_received || 0);
  const conversions = todayStats?.appointments_set || 0;
  const conversionRate = totalCalls > 0 ? Math.round((conversions / totalCalls) * 100) : 0;
  const yesterdayTotalCalls = (yesterdayStats?.calls_made || 0) + (yesterdayStats?.calls_received || 0);
  const yesterdayConversionRate = yesterdayTotalCalls > 0
    ? Math.round(((yesterdayStats?.appointments_set || 0) / yesterdayTotalCalls) * 100)
    : 0;

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
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
              {getGreeting()}, <span className="italic">{firstName}.</span>
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mt-3">
              <span className="text-success">●</span> System Status: Active · {formatDate()}
            </p>
          </div>
          <div className="md:border-l md:border-border md:pl-10 flex md:flex-col items-baseline md:items-start gap-3 md:gap-1">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">Day Streak</span>
            <span className="font-display italic text-5xl md:text-6xl leading-none text-primary tabular-nums">
              {ghl.currentStreak}
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
          streak={data?.profile?.current_streak || 0}
        />

        {/* KPI strip — 4 hairline tiles */}
        <div className="bento-grid grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Calls Today"
            value={todayStats?.calls_made || 0}
            icon={Phone}
            comparison={{
              value: calcChange(todayStats?.calls_made || 0, yesterdayStats?.calls_made),
              label: "vs yest",
            }}
            delay={0}
          />
          <MetricCard
            label="Appts Set"
            value={todayStats?.appointments_set || 0}
            icon={Calendar}
            progress={{ current: todayStats?.appointments_set || 0, goal: 8 }}
            delay={80}
          />
          <MetricCard
            label="Revenue"
            value={Math.round(todayStats?.revenue_closed || 0)}
            format="currency"
            icon={Target}
            comparison={{
              value: calcChange(
                Math.round(todayStats?.revenue_closed || 0),
                yesterdayStats?.revenue_closed ? Math.round(yesterdayStats.revenue_closed) : null
              ),
              label: "today",
            }}
            delay={160}
          />
          <MetricCard
            label="Conversion"
            value={conversionRate}
            format="percentage"
            icon={TrendingUp}
            comparison={{
              value: conversionRate - yesterdayConversionRate,
              label: "delta",
            }}
            delay={240}
          />
        </div>

        {/* Activity + Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border">
          <div className="lg:col-span-8 bg-background">
            <RecentActivity activities={activities} />
          </div>
          <div className="lg:col-span-4 bg-background">
            <QuickActions followUps={followUps} />
          </div>
        </div>

        {/* Team Pulse + Quote */}
        <div className="bento-grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
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
          </div>
          <div className="lg:col-span-5">
            <MotivationalQuote />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
