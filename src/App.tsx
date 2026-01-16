import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import CommandCenter from "./pages/CommandCenter";
import WarRoom from "./pages/WarRoom";
import RoleplayArena from "./pages/RoleplayArena";
import CallIntelligence from "./pages/CallIntelligence";
import ObjectionVault from "./pages/ObjectionVault";
import Leaderboards from "./pages/Leaderboards";
import MyPerformance from "./pages/MyPerformance";
import TrainingAcademy from "./pages/TrainingAcademy";
import DealPipeline from "./pages/DealPipeline";
import TeamSettings from "./pages/TeamSettings";
import CoachingConsole from "./pages/CoachingConsole";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<CommandCenter />} />
          <Route path="/war-room" element={<WarRoom />} />
          <Route path="/roleplay" element={<RoleplayArena />} />
          <Route path="/call-intelligence" element={<CallIntelligence />} />
          <Route path="/objection-vault" element={<ObjectionVault />} />
          <Route path="/leaderboards" element={<Leaderboards />} />
          <Route path="/performance" element={<MyPerformance />} />
          <Route path="/training" element={<TrainingAcademy />} />
          <Route path="/pipeline" element={<DealPipeline />} />
          <Route path="/team-settings" element={<TeamSettings />} />
          <Route path="/coaching" element={<CoachingConsole />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;