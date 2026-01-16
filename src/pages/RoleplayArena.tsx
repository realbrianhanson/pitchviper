import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ScenarioCard } from "@/components/roleplay/ScenarioCard";
import { RoleplayStats } from "@/components/roleplay/RoleplayStats";
import { useRoleplayData } from "@/hooks/useRoleplayData";
import { Gamepad2, Loader2, Swords } from "lucide-react";

export default function RoleplayArena() {
  const { scenarios, userStats, isLoading } = useRoleplayData();

  if (isLoading) {
    return (
      <AppLayout title="Roleplay Arena">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Roleplay Arena">
      <div className="animate-fade-in space-y-8">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card/80 to-primary/10 border border-border/50 p-8 md:p-12">
          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl opacity-20" />

          {/* Content */}
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary/20 rounded-xl">
                <Swords className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight">
                  The{" "}
                  <span className="text-primary drop-shadow-[0_0_30px_rgba(0,240,255,0.5)]">
                    Arena
                  </span>
                </h1>
              </div>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mb-8">
              Sharpen your skills. Face any prospect. Close with confidence.
            </p>

            {/* User Stats */}
            <RoleplayStats stats={userStats} />
          </div>
        </div>

        {/* Scenario Selection Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              Select Your Challenge
            </h2>
            <p className="text-muted-foreground mt-1">
              Choose a scenario and prove your sales mastery
            </p>
          </div>
        </div>

        {/* Scenarios Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              bestScore={userStats.best_scores.get(scenario.id)}
            />
          ))}
        </div>

        {/* Empty State */}
        {scenarios.length === 0 && (
          <ViperCard variant="glass">
            <ViperCardContent className="py-16">
              <div className="text-center">
                <Gamepad2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  No Scenarios Available
                </h2>
                <p className="text-muted-foreground">
                  Check back soon for new roleplay challenges!
                </p>
              </div>
            </ViperCardContent>
          </ViperCard>
        )}
      </div>
    </AppLayout>
  );
}
