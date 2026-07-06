import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, profile, loading, profileLoaded } = useAuth();
  const location = useLocation();

  // Still resolving session or profile — never render the app yet
  if (loading || (user && !profileLoaded)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />;
  }

  // Onboarding itself must always be reachable so a brand-new user (or one
  // whose profile row is missing) can create/repair it.
  if (location.pathname === "/onboarding") {
    return <>{children}</>;
  }

  // Fail closed: no profile OR either gate flag missing = force onboarding.
  const passesGate =
    !!profile && profile.promo_validated === true && profile.onboarding_completed === true;

  if (!passesGate) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
