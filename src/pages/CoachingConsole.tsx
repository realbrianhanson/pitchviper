import { useState } from "react";
import { Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { useAuth } from "@/hooks/useAuth";
import { useCoaching } from "@/hooks/useCoaching";
import { RepSelector } from "@/components/coaching/RepSelector";
import { RepOverview } from "@/components/coaching/RepOverview";
import { AICoachingRecommendations } from "@/components/coaching/AICoachingRecommendations";
import { PerformanceDeepDive } from "@/components/coaching/PerformanceDeepDive";
import { RecentActivity } from "@/components/coaching/RecentActivity";
import { CoachingNotes } from "@/components/coaching/CoachingNotes";
import { Users, Brain } from "lucide-react";

export default function CoachingConsole() {
  const { isManager, loading } = useAuth();
  const [selectedRepId, setSelectedRepId] = useState<string | null>(null);
  
  const {
    teamMembers,
    isLoadingMembers,
    useRepCoachingSessions,
    useRepRecentCalls,
    useRepRoleplaySessions,
    useRepRecentBadges,
    useCoachingInsights,
    saveCoachingSession,
  } = useCoaching();

  const { data: coachingSessions = [], isLoading: isLoadingSessions } = useRepCoachingSessions(selectedRepId);
  const { data: recentCalls = [], isLoading: isLoadingCalls } = useRepRecentCalls(selectedRepId);
  const { data: roleplaySessions = [], isLoading: isLoadingRoleplays } = useRepRoleplaySessions(selectedRepId);
  const { data: recentBadges = [], isLoading: isLoadingBadges } = useRepRecentBadges(selectedRepId);
  const { data: insightsData, isLoading: isLoadingInsights, refetch: refetchInsights } = useCoachingInsights(selectedRepId);

  const selectedRep = teamMembers.find(m => m.user_id === selectedRepId);
  const lastSession = coachingSessions[0] || null;

  // Redirect non-managers
  if (!loading && !isManager) {
    return <Navigate to="/" replace />;
  }

  const handleSaveSession = (session: {
    notes: string;
    focus_areas: string[];
    action_items: string[];
    next_session_date?: string;
  }) => {
    if (!selectedRepId) return;
    saveCoachingSession.mutate({
      rep_id: selectedRepId,
      ...session,
    });
  };

  return (
    <AppLayout title="Coaching Console">
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Rep Selector */}
          <div className="lg:col-span-3">
            <ViperCard variant="glass" className="sticky top-4">
              <ViperCardHeader>
                <ViperCardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Members
                </ViperCardTitle>
              </ViperCardHeader>
              <ViperCardContent>
                <RepSelector
                  members={teamMembers}
                  selectedRepId={selectedRepId}
                  onSelectRep={setSelectedRepId}
                  isLoading={isLoadingMembers}
                />
              </ViperCardContent>
            </ViperCard>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9">
            {selectedRep ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Column - Rep Overview */}
                <div className="space-y-6">
                  <ViperCard variant="glass">
                    <ViperCardContent className="p-6">
                      <RepOverview
                        rep={selectedRep}
                        stats={insightsData?.stats || null}
                        lastSession={lastSession}
                      />
                    </ViperCardContent>
                  </ViperCard>

                  <PerformanceDeepDive
                    stats={insightsData?.stats || null}
                    isLoading={isLoadingInsights}
                  />
                </div>

                {/* Right Column - Coaching Tools */}
                <div className="space-y-6">
                  <AICoachingRecommendations
                    insights={insightsData?.insights || null}
                    isLoading={isLoadingInsights}
                    onRefresh={() => refetchInsights()}
                  />

                  <RecentActivity
                    calls={recentCalls}
                    roleplaySessions={roleplaySessions}
                    badges={recentBadges}
                    isLoading={isLoadingCalls || isLoadingRoleplays || isLoadingBadges}
                  />

                  <CoachingNotes
                    sessions={coachingSessions}
                    isLoading={isLoadingSessions}
                    onSave={handleSaveSession}
                    isSaving={saveCoachingSession.isPending}
                  />
                </div>
              </div>
            ) : (
              <ViperCard variant="glass">
                <ViperCardContent className="py-16">
                  <div className="text-center text-muted-foreground">
                    <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl font-semibold mb-2">Select a Team Member</h3>
                    <p>Choose a rep from the list to view their coaching profile and AI recommendations.</p>
                  </div>
                </ViperCardContent>
              </ViperCard>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
