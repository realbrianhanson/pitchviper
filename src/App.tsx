import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Auth pages
import SignUp from "./pages/SignUp";
import SignIn from "./pages/SignIn";
import Onboarding from "./pages/Onboarding";

// App pages
import CommandCenter from "./pages/CommandCenter";
import WarRoom from "./pages/WarRoom";
import RoleplayArena from "./pages/RoleplayArena";
import RoleplaySession from "./pages/RoleplaySession";
import CallIntelligence from "./pages/CallIntelligence";
import ObjectionVault from "./pages/ObjectionVault";
import Leaderboards from "./pages/Leaderboards";
import MyPerformance from "./pages/MyPerformance";
import Achievements from "./pages/Achievements";
import TrainingAcademy from "./pages/TrainingAcademy";
import DealPipeline from "./pages/DealPipeline";
import TeamSettings from "./pages/TeamSettings";
import CoachingConsole from "./pages/CoachingConsole";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            
            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;