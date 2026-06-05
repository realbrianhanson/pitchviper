import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { LiveStatsBanner } from "@/components/warroom/LiveStatsBanner";
import { TeamMemberCard } from "@/components/warroom/TeamMemberCard";
import { ActivityFeed } from "@/components/warroom/ActivityFeed";
import { LiveLeaderboard } from "@/components/warroom/LiveLeaderboard";
import { DealCelebration } from "@/components/warroom/DealCelebration";
import { SOSButton } from "@/components/warroom/SOSButton";
import { useWarRoomData } from "@/hooks/useWarRoomData";
import { Radio, Users } from "lucide-react";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";

export default function WarRoom() {
  const {
    teamMembers,
    teamStats,
    activities,
    isLoading,
    pulsingMembers,
    celebratingMembers,
    celebrationData,
    showCelebration,
    closeCelebration,
    soundEnabled,
  } = useWarRoomData();

  // Sort members by activity for display
  const sortedMembers = [...teamMembers].sort((a, b) => {
    // SOS alerts first
    if (a.has_pending_sos && !b.has_pending_sos) return -1;
    if (b.has_pending_sos && !a.has_pending_sos) return 1;
    // On call members next
    if (a.status === "on_call" && b.status !== "on_call") return -1;
    if (b.status === "on_call" && a.status !== "on_call") return 1;
    // Then by calls made
    return b.today_stats.calls_made - a.today_stats.calls_made;
  });

  // Calculate ranks based on revenue
  const rankedMembers = [...teamMembers]
    .sort((a, b) => b.today_stats.revenue_closed - a.today_stats.revenue_closed)
    .map((m, i) => ({ user_id: m.user_id, rank: i + 1 }));
  const rankMap = new Map(rankedMembers.map(r => [r.user_id, r.rank]));

  if (isLoading) {
    return (
      <AppLayout title="War Room">
        <EditorialLoading label="Tuning Frequencies" className="h-[60vh]" />
      </AppLayout>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <AppLayout title="War Room">
        <div className="animate-fade-in">
          <ViperCard variant="glass">
            <ViperCardContent className="py-16">
              <div className="text-center">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Team Found
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  The War Room displays real-time activity from your team. Join or create a team
                  to see your team's live performance dashboard.
                </p>
              </div>
            </ViperCardContent>
          </ViperCard>
        </div>
        <SOSButton />
      </AppLayout>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Deal Celebration Overlay */}
      {celebrationData && (
        <DealCelebration
          isOpen={showCelebration}
          onClose={closeCelebration}
          closerName={celebrationData.closerName}
          closerAvatar={celebrationData.closerAvatar}
          dealValue={celebrationData.dealValue}
          clientName={celebrationData.clientName}
          dealType={celebrationData.dealType}
          dealsToday={celebrationData.dealsToday}
          soundEnabled={soundEnabled}
        />
      )}

      {/* Live Stats Banner - Fixed at top */}
      <LiveStatsBanner
        totalCalls={teamStats.total_calls}
        totalAppointments={teamStats.total_appointments}
        totalRevenue={teamStats.total_revenue}
        totalDeals={teamStats.total_deals}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Left Side - Team Grid */}
          <div className="flex-1 overflow-auto p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                <Radio className="h-6 w-6 text-primary" />
                War Room
                <span className="text-sm font-normal text-muted-foreground">
                  — Live Sales Floor
                </span>
              </h1>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {sortedMembers.map((member) => (
                <TeamMemberCard
                  key={member.user_id}
                  member={member}
                  isPulsing={pulsingMembers.has(member.user_id)}
                  isCelebrating={celebratingMembers.has(member.user_id)}
                  rank={rankMap.get(member.user_id)}
                />
              ))}
            </div>

            {/* Bottom Leaderboard */}
            <LiveLeaderboard members={teamMembers} />
          </div>

          {/* Right Sidebar - Activity Feed */}
          <div className="w-80 xl:w-96 border-l border-border/50 bg-card/30 backdrop-blur-sm flex flex-col">
            <div className="p-4 border-b border-border/50">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                </span>
                Live Activity
              </h2>
            </div>
            <div className="flex-1 overflow-hidden">
              <ActivityFeed activities={activities} />
            </div>
          </div>
        </div>
      </div>

      {/* SOS Button */}
      <SOSButton />
    </div>
  );
}
