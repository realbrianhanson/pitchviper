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
import { Users, Brain, ChevronLeft } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { cn } from "@/lib/utils";

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

  const handleBackToList = () => {
    setSelectedRepId(null);
  };

  return (
    <AppLayout title="Coaching Console">
      <div className="animate-fade-in space-y-4 md:space-y-6">
        {/* Mobile: Back button when rep selected */}
        {selectedRepId && (
          <div className="lg:hidden">
            <ViperButton
              variant="ghost"
              size="sm"
              onClick={handleBackToList}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to Team
            </ViperButton>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Left Sidebar - Rep Selector (hidden on mobile when rep selected) */}
          <div className={cn(
            "lg:col-span-3 lg:min-w-[280px] transition-all duration-300",
            selectedRepId ? "hidden lg:block" : "block"
          )}>
            <ViperCard variant="glass" className="lg:sticky lg:top-4 overflow-hidden">
              <ViperCardHeader className="p-4 pb-3">
                <ViperCardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-primary" />
                  Team Members
                </ViperCardTitle>
              </ViperCardHeader>
              <ViperCardContent className="p-4 pt-0">
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
          <div className={cn(
            "lg:col-span-9 transition-all duration-300",
            !selectedRepId ? "hidden lg:block" : "block"
          )}>
            {selectedRep ? (
              <div className="space-y-4 md:space-y-6">
                {/* Rep Overview - Always on top on mobile */}
                <ViperCard variant="glass">
                  <ViperCardContent className="p-4 md:p-6">
                    <RepOverview
                      rep={selectedRep}
                      stats={insightsData?.stats || null}
                      lastSession={lastSession}
                    />
                  </ViperCardContent>
                </ViperCard>

                {/* Two column layout for larger screens */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                  {/* Left Column - Performance */}
                  <div className="space-y-4 md:space-y-6">
                    <PerformanceDeepDive
                      stats={insightsData?.stats || null}
                      isLoading={isLoadingInsights}
                    />
                    
                    <RecentActivity
                      calls={recentCalls}
                      roleplaySessions={roleplaySessions}
                      badges={recentBadges}
                      isLoading={isLoadingCalls || isLoadingRoleplays || isLoadingBadges}
                    />
                  </div>

                  {/* Right Column - Coaching Tools */}
                  <div className="space-y-4 md:space-y-6">
                    <AICoachingRecommendations
                      insights={insightsData?.insights || null}
                      isLoading={isLoadingInsights}
                      onRefresh={() => refetchInsights()}
                    />

                    <CoachingNotes
                      sessions={coachingSessions}
                      isLoading={isLoadingSessions}
                      onSave={handleSaveSession}
                      isSaving={saveCoachingSession.isPending}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <ViperCard variant="glass">
                <ViperCardContent className="py-12 md:py-16">
                  <div className="text-center text-muted-foreground">
                    <Brain className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg md:text-xl font-semibold mb-2">Select a Team Member</h3>
                    <p className="text-sm md:text-base max-w-md mx-auto">
                      Choose a rep from the list to view their coaching profile and AI recommendations.
                    </p>
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
