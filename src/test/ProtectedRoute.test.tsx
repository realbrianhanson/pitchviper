import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

// Mock useAuth before importing ProtectedRoute.
const authState = {
  user: null as { id: string } | null,
  profile: null as
    | { promo_validated: boolean; onboarding_completed: boolean }
    | null,
  loading: false,
  profileLoaded: false,
  canManageTeam: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

const entState = {
  data: undefined as
    | undefined
    | {
        access: boolean;
        reason: string;
        tier: string;
        can_manage: boolean;
        seat_limit: number;
        used_seats: number;
      },
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
};

vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => entState,
  isGrowthTier: () => false,
  trialDaysRemaining: () => 0,
}));

import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <div>APP CONTENT</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <div>ONBOARDING</div>
            </ProtectedRoute>
          }
        />
        <Route path="/sign-in" element={<div>SIGN IN PAGE</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function reset() {
  authState.user = null;
  authState.profile = null;
  authState.loading = false;
  authState.profileLoaded = false;
  authState.canManageTeam = false;
  entState.data = {
    access: true,
    reason: "active",
    tier: "growth",
    can_manage: false,
    seat_limit: 10,
    used_seats: 1,
  };
  entState.isLoading = false;
  entState.isError = false;
}


describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to /sign-in", () => {
    reset();
    renderAt("/");
    expect(screen.getByText("SIGN IN PAGE")).toBeInTheDocument();
    expect(screen.queryByText("APP CONTENT")).not.toBeInTheDocument();
  });

  it("shows the loading state while the profile is still resolving", () => {
    reset();
    authState.user = { id: "u1" };
    authState.profileLoaded = false;
    renderAt("/");
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });

  it("forces onboarding when authed but the profile is missing", () => {
    reset();
    authState.user = { id: "u1" };
    authState.profileLoaded = true;
    authState.profile = null;
    renderAt("/");
    // We navigate to /onboarding, which itself always renders its children.
    expect(screen.getByText("ONBOARDING")).toBeInTheDocument();
    expect(screen.queryByText("APP CONTENT")).not.toBeInTheDocument();
  });

  it("forces onboarding when promo_validated or onboarding_completed is false", () => {
    reset();
    authState.user = { id: "u1" };
    authState.profileLoaded = true;
    authState.profile = { promo_validated: false, onboarding_completed: true };
    renderAt("/");
    expect(screen.getByText("ONBOARDING")).toBeInTheDocument();
  });

  it("renders children once the gate passes", () => {
    reset();
    authState.user = { id: "u1" };
    authState.profileLoaded = true;
    authState.profile = { promo_validated: true, onboarding_completed: true };
    renderAt("/");
    expect(screen.getByText("APP CONTENT")).toBeInTheDocument();
  });

  it("always allows /onboarding through, even without a profile", () => {
    reset();
    authState.user = { id: "u1" };
    authState.profileLoaded = true;
    authState.profile = null;
    renderAt("/onboarding");
    expect(screen.getByText("ONBOARDING")).toBeInTheDocument();
  });
});
