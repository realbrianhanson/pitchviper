import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { TeamOverviewCards } from "@/components/manager/TeamOverviewCards";
import { PerformanceSnapshot } from "@/components/manager/PerformanceSnapshot";
import { TeamTable } from "@/components/manager/TeamTable";
import { AITeamInsights } from "@/components/manager/AITeamInsights";
import { ManagerQuickActions } from "@/components/manager/ManagerQuickActions";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { user, profile, isManager, isLoading: authLoading } = useAuth();
  const {
    teamMembers,
    overview,
    insights,
    needsAttention,
    onFire,
    coachingDue,
    isLoading,
    isLoadingInsights,
    refreshInsights,
  } = useManagerDashboard();

  // Redirect non-managers
  useEffect(() => {
    if (!authLoading && !isManager) {
      navigate('/');
    }
  }, [authLoading, isManager, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-display font-bold mb-2">Access Denied</h2>
        <p className="text-muted-foreground">
          This page is only available to managers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Manager Console
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and coach your team in real-time
          </p>
        </div>
        <ManagerQuickActions />
      </div>

      {/* Team Overview Metrics */}
      <TeamOverviewCards overview={overview} isLoading={isLoading} />

      {/* Performance Snapshot */}
      <PerformanceSnapshot
        needsAttention={needsAttention}
        onFire={onFire}
        coachingDue={coachingDue}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Table */}
        <div className="lg:col-span-2">
          <ViperCard>
            <ViperCardHeader>
              <ViperCardTitle>Team Members</ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <TeamTable members={teamMembers} isLoading={isLoading} />
            </ViperCardContent>
          </ViperCard>
        </div>

        {/* AI Insights */}
        <div>
          <AITeamInsights
            insights={insights}
            isLoading={isLoadingInsights}
            onRefresh={refreshInsights}
          />
        </div>
      </div>
    </div>
  );
}