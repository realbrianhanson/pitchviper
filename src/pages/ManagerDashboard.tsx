import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, AlertCircle, Users, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useManagerDashboard } from "@/hooks/useManagerDashboard";
import { AppLayout } from "@/components/layout/AppLayout";
import { TeamOverviewCards } from "@/components/manager/TeamOverviewCards";
import { PerformanceSnapshot } from "@/components/manager/PerformanceSnapshot";
import { TeamTable } from "@/components/manager/TeamTable";
import { AITeamInsights } from "@/components/manager/AITeamInsights";
import { ManagerQuickActions } from "@/components/manager/ManagerQuickActions";
import { ForecastSection } from "@/components/manager/ForecastSection";
import { WorkspaceSetupChecklist } from "@/components/manager/WorkspaceSetupChecklist";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";
import { Button } from "@/components/ui/button";

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { profile, isManager, isLoading: authLoading } = useAuth();
  const {
    teamMembers,
    overview,
    insights,
    needsAttention,
    onFire,
    coachingDue,
    isLoading,
    isLoadingInsights,
    error,
    refetch,
    refreshInsights,
  } = useManagerDashboard();

  useEffect(() => {
    if (!authLoading && !isManager) navigate("/");
  }, [authLoading, isManager, navigate]);

  if (authLoading) {
    return (
      <AppLayout title="Manager Console">
        <div className="flex items-center justify-center min-h-[60vh]">
          <EditorialLoading label="Loading console" />
        </div>
      </AppLayout>
    );
  }

  if (!isManager) {
    return (
      <AppLayout title="Manager Console">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Shield className="h-10 w-10 text-muted-foreground mb-4" strokeWidth={1.5} />
          <h2 className="text-xl font-semibold mb-1">Access denied</h2>
          <p className="text-sm text-muted-foreground">Manager credentials required.</p>
        </div>
      </AppLayout>
    );
  }

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
  const firstName = cleanFirstName(profile?.full_name) || "Manager";
  const activeReps = overview?.currently_active ?? 0;
  const totalReps = overview?.team_size ?? 0;

  return (
    <AppLayout title="Manager Console">
      <div className="max-w-[1400px] mx-auto w-full space-y-6">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6"
        >
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{formatDate()}</p>
            <h1 className="text-[32px] md:text-[40px] font-semibold leading-tight tracking-tight text-foreground">
              Team overview, {firstName}.
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <p className="text-sm text-muted-foreground">Here's how your team is performing today.</p>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-success" />
                <span className="tabular-nums font-medium">{activeReps}</span>
                <span className="text-muted-foreground">of {totalReps} active</span>
              </span>
            </div>
          </div>
          <div className="w-full lg:w-auto">
            <ManagerQuickActions />
          </div>
        </motion.div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-[12px] border border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-destructive text-sm">Couldn't load team data</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && teamMembers.length === 0 ? (
          <div className="rounded-[12px] border border-border bg-card p-12 text-center shadow-sm">
            <Users className="h-10 w-10 mx-auto text-muted-foreground mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold mb-1">No team members yet</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Invite reps from Team Settings — once they start logging calls and pipeline activity, you'll see live aggregates and coaching flags here.
            </p>
          </div>
        ) : (
          <>
            {/* Triage */}
            <section>
              <SectionHeader title="Triage" subtitle="Who needs your attention right now" />
              <PerformanceSnapshot
                needsAttention={needsAttention}
                onFire={onFire}
                coachingDue={coachingDue}
              />
            </section>

            {/* Floor performance */}
            <section>
              <SectionHeader title="Floor performance" subtitle="Live today and 30-day context" />
              <TeamOverviewCards overview={overview} isLoading={isLoading} />
            </section>

            {/* Forecast */}
            <section>
              <SectionHeader title="Revenue forecast" subtitle="Pipeline outlook and quota progress" />
              <ForecastSection />
            </section>

            {/* Roster + insights */}
            <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-8">
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-semibold text-foreground">Roster</h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {teamMembers.length} {teamMembers.length === 1 ? "rep" : "reps"}
                  </span>
                </div>
                <TeamTable members={teamMembers} isLoading={isLoading} />
              </div>
              <div className="lg:col-span-4">
                <AITeamInsights
                  insights={insights}
                  isLoading={isLoadingInsights}
                  onRefresh={refreshInsights}
                />
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
