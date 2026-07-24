import { ReactNode } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlement } from "@/hooks/useEntitlement";
import { Button } from "@/components/ui/button";
import { isGrowthRoute } from "@/lib/featureGates";

const ALWAYS_ALLOWED = new Set([
  "/onboarding",
  "/billing",
  "/settings",
]);

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function PausedWorkspace({ isManager }: { isManager: boolean }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full editorial-tile p-8 space-y-6">
        <div className="eyebrow">Workspace paused</div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">
          Your {isManager ? "team's " : ""}subscription is <span className="italic text-primary">inactive</span>.
        </h1>
        <p className="text-muted-foreground">
          {isManager
            ? "Choose a plan or update your billing details to bring the workspace back online. All your data is safe."
            : "Ask your manager to update the team's billing to bring the workspace back online. Your data is safe."}
        </p>
        <div className="flex flex-wrap gap-3">
          {isManager ? (
            <>
              <Button asChild>
                <Link to="/billing">Choose a plan</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/settings">Settings</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline">
              <Link to="/settings">Settings</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function GrowthUpgradeRequired({ isManager }: { isManager: boolean }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full editorial-tile p-8 space-y-6" data-testid="growth-upgrade-required">
        <div className="eyebrow">Upgrade required</div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight">
          This is a <span className="italic text-primary">Growth</span> feature.
        </h1>
        <p className="text-muted-foreground">
          {isManager
            ? "Upgrade your team to Growth to unlock AI coaching, competitions, and advanced signals."
            : "Ask your manager to upgrade the team to Growth to unlock this feature."}
        </p>
        <div className="flex flex-wrap gap-3">
          {isManager ? (
            <>
              <Button asChild>
                <Link to="/billing">Upgrade to Growth</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/settings">Settings</Link>
              </Button>
            </>
          ) : (
            <Button asChild variant="outline">
              <Link to="/settings">Settings</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, profile, loading, profileLoaded, canManageTeam } = useAuth();
  const location = useLocation();
  const ent = useEntitlement();

  if (loading || (user && !profileLoaded)) return <PageLoader />;

  if (!user) return <Navigate to="/sign-in" replace />;

  // Onboarding must always be reachable so brand-new users can create their profile.
  if (location.pathname === "/onboarding") return <>{children}</>;

  const passesGate =
    !!profile && profile.promo_validated === true && profile.onboarding_completed === true;
  if (!passesGate) return <Navigate to="/onboarding" replace />;

  // Always-allowed post-onboarding recovery routes.
  if (ALWAYS_ALLOWED.has(location.pathname)) return <>{children}</>;

  // Entitlement resolution
  if (ent.isLoading) return <PageLoader />;
  if (ent.isError || !ent.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="editorial-tile p-8 space-y-4 max-w-md">
          <div className="eyebrow">Connection issue</div>
          <p className="text-muted-foreground">We couldn't verify your workspace status.</p>
          <Button onClick={() => ent.refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!ent.data.access) {
    return <PausedWorkspace isManager={canManageTeam} />;
  }

  // Growth-only route gate. Trial grants tier=growth server-side.
  if (isGrowthRoute(location.pathname) && ent.data.tier !== "growth") {
    return <GrowthUpgradeRequired isManager={canManageTeam} />;
  }

  return <>{children}</>;
}

