import { useState, useEffect } from "react";
import { Clock, Flame, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { GauntletChallenge } from "@/hooks/useGauntlet";

interface ChallengeHeaderProps {
  challenge: GauntletChallenge;
  streak: number;
  currentStep: number;
  totalSteps: number;
  timeRemaining?: number;
  onTimeUp?: () => void;
}

export function ChallengeHeader({
  challenge,
  streak,
  currentStep,
  totalSteps,
  timeRemaining,
  onTimeUp,
}: ChallengeHeaderProps) {
  const [time, setTime] = useState(timeRemaining ?? challenge.time_limit_seconds);

  useEffect(() => {
    if (timeRemaining !== undefined) {
      setTime(timeRemaining);
    }
  }, [timeRemaining]);

  useEffect(() => {
    if (time <= 0) {
      onTimeUp?.();
      return;
    }

    const timer = setInterval(() => {
      setTime((t) => {
        if (t <= 1) {
          onTimeUp?.();
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [time, onTimeUp]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = ((currentStep) / totalSteps) * 100;
  const timeWarning = time < 30;

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-primary" />
            <span className="font-semibold">{challenge.title}</span>
          </div>
          {streak > 0 && (
            <div className="flex items-center gap-1 text-sm text-warning">
              <Trophy className="h-4 w-4" />
              <span>{streak} day streak</span>
            </div>
          )}
        </div>
        <div
          className={`flex items-center gap-2 ${
            timeWarning ? "text-destructive animate-pulse" : "text-muted-foreground"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="font-mono font-semibold">{formatTime(time)}</span>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">
            {currentStep} / {totalSteps}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
