import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { OfflineIndicator } from "@/components/ui/offline-indicator";
import { OnboardingTourProvider } from "@/components/onboarding/OnboardingTour";
import { Skeleton } from "@/components/ui/skeleton";

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-background p-6 space-y-4">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-64 w-full" />
    <div className="grid grid-cols-3 gap-4">
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
      <Skeleton className="h-32" />
    </div>
  </div>
);

// Auth pages (not lazy loaded for faster initial auth)
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Onboarding from "./pages/Onboarding";

// Lazy load app pages for better performance
const CommandCenter = lazy(() => import("./pages/CommandCenter"));
const WarRoom = lazy(() => import("./pages/WarRoom"));
const RoleplayArena = lazy(() => import("./pages/RoleplayArena"));
const RoleplaySession = lazy(() => import("./pages/RoleplaySession"));
const CallIntelligence = lazy(() => import("./pages/CallIntelligence"));
const ObjectionVault = lazy(() => import("./pages/ObjectionVault"));
const Leaderboards = lazy(() => import("./pages/Leaderboards"));
const MyPerformance = lazy(() => import("./pages/MyPerformance"));
const Achievements = lazy(() => import("./pages/Achievements"));
const TrainingAcademy = lazy(() => import("./pages/TrainingAcademy"));
const DealPipeline = lazy(() => import("./pages/DealPipeline"));
const TeamSettings = lazy(() => import("./pages/TeamSettings"));
const CoachingConsole = lazy(() => import("./pages/CoachingConsole"));
const ManagerDashboard = lazy(() => import("./pages/ManagerDashboard"));
const CompetitionsManager = lazy(() => import("./pages/CompetitionsManager"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingTourProvider>
          <TooltipProvider>
            <OfflineIndicator />
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public auth routes */}
                  <Route path="/sign-up" element={<SignUp />} />
                  <Route path="/sign-in" element={<SignIn />} />
                  
                  {/* Protected routes */}
                  <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                  <Route path="/" element={<ProtectedRoute><CommandCenter /></ProtectedRoute>} />
                  <Route path="/war-room" element={<ProtectedRoute><WarRoom /></ProtectedRoute>} />
                  <Route path="/roleplay" element={<ProtectedRoute><RoleplayArena /></ProtectedRoute>} />
                  <Route path="/roleplay/:scenarioId" element={<ProtectedRoute><RoleplaySession /></ProtectedRoute>} />
                  <Route path="/call-intelligence" element={<ProtectedRoute><CallIntelligence /></ProtectedRoute>} />
                  <Route path="/objection-vault" element={<ProtectedRoute><ObjectionVault /></ProtectedRoute>} />
                  <Route path="/leaderboards" element={<ProtectedRoute><Leaderboards /></ProtectedRoute>} />
                  <Route path="/performance" element={<ProtectedRoute><MyPerformance /></ProtectedRoute>} />
                  <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
                  <Route path="/training" element={<ProtectedRoute><TrainingAcademy /></ProtectedRoute>} />
                  <Route path="/pipeline" element={<ProtectedRoute><DealPipeline /></ProtectedRoute>} />
                  <Route path="/team-settings" element={<ProtectedRoute><TeamSettings /></ProtectedRoute>} />
                  <Route path="/coaching" element={<ProtectedRoute><CoachingConsole /></ProtectedRoute>} />
                  <Route path="/manager" element={<ProtectedRoute><ManagerDashboard /></ProtectedRoute>} />
                  <Route path="/manager/competitions" element={<ProtectedRoute><CompetitionsManager /></ProtectedRoute>} />
                  <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                  
                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </OnboardingTourProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
