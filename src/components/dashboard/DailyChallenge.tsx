import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Flame, Target, Trophy, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyChallengeProps {
  challenge: {
    title: string;
    description: string;
    reward: number;
    progress: number;
    goal: number;
  };
  streak: number;
}

export function DailyChallenge({ challenge, streak }: DailyChallengeProps) {
  const isOnFire = streak >= 7;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Daily Mission Card */}
      <ViperCard variant="glass" className="md:col-span-2">
        <ViperCardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <ViperCardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Today's Mission
            </ViperCardTitle>
            <ViperBadge variant="default">+{challenge.reward} XP</ViperBadge>
          </div>
        </ViperCardHeader>
        <ViperCardContent>
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">
            {challenge.title}
          </h3>
          <p className="text-muted-foreground mb-4">{challenge.description}</p>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">
                {challenge.progress} / {challenge.goal}
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary via-primary to-success rounded-full transition-all duration-500"
                style={{
                  width: `${(challenge.progress / challenge.goal) * 100}%`,
                }}
              />
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Streak Card */}
      <ViperCard variant={isOnFire ? "glow" : "glass"}>
        <ViperCardContent className="h-full flex flex-col items-center justify-center py-6 text-center">
          <div
            className={cn(
              "relative mb-3",
              isOnFire && "animate-pulse"
            )}
          >
            <Flame
              className={cn(
                "h-12 w-12 transition-colors",
                isOnFire ? "text-warning" : "text-muted-foreground"
              )}
            />
            {isOnFire && (
              <>
                <Flame className="absolute top-0 left-0 h-12 w-12 text-destructive animate-ping opacity-30" />
                <div className="absolute -inset-2 rounded-full bg-warning/20 blur-md animate-pulse" />
              </>
            )}
          </div>
          <p className="text-4xl font-display font-bold text-foreground mb-1">
            {streak}
          </p>
          <p className="text-sm text-muted-foreground">Day Streak</p>
          {isOnFire && (
            <ViperBadge variant="warning" className="mt-3">
              🔥 On Fire!
            </ViperBadge>
          )}
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}