import { useNavigate } from "react-router-dom";
import { useGauntlet } from "@/hooks/useGauntlet";
import { ViperButton } from "@/components/ui/viper-button";
import { Flame, AlertTriangle, Trophy, Zap } from "lucide-react";

export function GauntletGate() {
  const navigate = useNavigate();
  const { todayChallenge, hasCompletedToday, hasPassed, streak, skipChallenge, isLoading } = useGauntlet();

  if (isLoading || hasCompletedToday) {
    return null;
  }

  if (!todayChallenge) {
    return null;
  }

  const handleSkip = async () => {
    await skipChallenge();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 text-center space-y-8 animate-fade-in">
        {/* Challenge icon */}
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary rounded-full animate-pulse opacity-50" />
          <div className="relative w-24 h-24 bg-primary/20 border-2 border-primary rounded-full flex items-center justify-center">
            <Flame className="h-12 w-12 text-primary animate-pulse" />
          </div>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Daily Gauntlet</h1>
          <p className="text-muted-foreground text-lg">
            Complete today's challenge to unlock the app
          </p>
        </div>

        {/* Today's challenge */}
        <div className="bg-card border border-border rounded-xl p-6 text-left space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Today's Challenge</p>
              <h3 className="font-semibold text-lg">{todayChallenge.title}</h3>
            </div>
          </div>
          <p className="text-muted-foreground">{todayChallenge.description}</p>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-primary font-medium">
              +{todayChallenge.xp_reward} XP
            </span>
            <span className="text-muted-foreground">
              ~{Math.round(todayChallenge.time_limit_seconds / 60)} min
            </span>
          </div>
        </div>

        {/* Streak warning */}
        {streak > 0 && (
          <div className="flex items-center justify-center gap-2 text-warning">
            <Trophy className="h-5 w-5" />
            <span className="font-medium">{streak} day streak!</span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <ViperButton
            variant="default"
            size="lg"
            className="w-full"
            onClick={() => navigate("/gauntlet")}
          >
            <Flame className="h-5 w-5 mr-2" />
            Start Challenge
          </ViperButton>

          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            Skip for now
          </button>

          {streak > 0 && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span>Skipping will reset your streak!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
