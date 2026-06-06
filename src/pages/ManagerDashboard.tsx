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
import { EditorialLoading } from "@/components/ui/editorial-skeleton";
import { ViperButton } from "@/components/ui/viper-button";

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
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
          <EditorialLoading label="Initializing Console" />
        </div>
      </AppLayout>
    );
  }

  if (!isManager) {
    return (
      <AppLayout title="Manager Console">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Shield className="h-12 w-12 text-muted-foreground mb-6" strokeWidth={1.5} />
          <h2 className="font-display italic text-3xl mb-2">Access Denied</h2>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Manager credentials required
          </p>
        </div>
      </AppLayout>
    );
  }

  const firstName = profile?.full_name?.split(" ")[0] || "Manager";
  const activeReps = overview?.currently_active ?? 0;
  const totalReps = overview?.team_size ?? 0;

  return (
    <AppLayout title="Manager Console">
    <div className="max-w-7xl mx-auto w-full space-y-8">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-2"
      >
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
            Manager Console · {formatDate()}
          </p>
          <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
            Floor view, <span className="italic">{firstName}.</span>
          </h1>
        </div>
        <div className="flex items-end gap-8">
          <div className="md:border-l md:border-border md:pl-8">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 block mb-1">
              Active
            </span>
            <span className="font-display italic text-5xl leading-none text-success tabular-nums">
              {activeReps}
            </span>
            <span className="font-mono text-xs text-muted-foreground/60 ml-1">/ {totalReps}</span>
          </div>
          <ManagerQuickActions />
        </div>
      </motion.div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-4 border border-destructive/40 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-destructive">Couldn't load team data</p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
          </div>
          <ViperButton variant="outline" size="sm" onClick={refetch} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry
          </ViperButton>
        </div>
      )}

      {/* Empty team state */}
      {!isLoading && !error && teamMembers.length === 0 ? (
        <div className="border border-border bg-background p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground/60 mb-4" strokeWidth={1.5} />
          <h3 className="font-display italic text-2xl mb-2">No team members yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Invite reps from Team Settings — once they start logging calls and pipeline activity, you'll see live aggregates and coaching flags here.
          </p>
        </div>
      ) : (
      <>
      {/* Overview strip */}
      <TeamOverviewCards overview={overview} isLoading={isLoading} />

      {/* Performance triage */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Triage</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Who needs you now
          </span>
        </div>
        <PerformanceSnapshot
          needsAttention={needsAttention}
          onFire={onFire}
          coachingDue={coachingDue}
        />
      </div>

      {/* Forecast */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Revenue Forecast</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
            Pipeline outlook
          </span>
        </div>
        <ForecastSection />
      </div>

      {/* Team + AI insights */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-px bg-border border border-border">
        <div className="lg:col-span-8 bg-background p-6">
          <div className="flex items-baseline justify-between mb-5">
            <h2 className="font-display text-2xl">The Roster</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
              {teamMembers.length} reps
            </span>
          </div>
          <TeamTable members={teamMembers} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-4 bg-background p-6">
          <AITeamInsights
            insights={insights}
            isLoading={isLoadingInsights}
            onRefresh={refreshInsights}
          />
        </div>
      </div>
      </>
      )}
    </div>
    </AppLayout>
  );
}
