import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { ViperButton } from "@/components/ui/viper-button";
import { Rocket, Trophy, Zap } from "lucide-react";

interface StepCompleteProps {
  teamName: string | null;
  onComplete: () => void;
}

export function StepComplete({ teamName, onComplete }: StepCompleteProps) {
  const confettiTriggered = useRef(false);

  useEffect(() => {
    if (confettiTriggered.current) return;
    confettiTriggered.current = true;

    // Fire confetti!
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      // Left side
      confetti({
        particleCount,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#00f0ff", "#ff00aa", "#00ff88", "#ffaa00"],
      });

      // Right side
      confetti({
        particleCount,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#00f0ff", "#ff00aa", "#00ff88", "#ffaa00"],
      });
    }, 250);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="animate-fade-in text-center">
      <div className="mb-8">
        {/* Victory icon */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-magenta shadow-glow-lg animate-glow-pulse">
              <Trophy className="h-12 w-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-success shadow-glow-success">
              <Zap className="h-5 w-5 text-success-foreground" />
            </div>
          </div>
        </div>

        <h2 className="text-4xl font-display font-bold text-gradient mb-4">
          You're Ready to Dominate!
        </h2>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          {teamName 
            ? `Welcome to ${teamName}! Your profile is set up and your team is waiting.`
            : "Your profile is set up. Time to start closing deals and climbing the leaderboard."
          }
        </p>
      </div>

      {/* Quick video placeholder */}
      <div className="mb-8 p-8 rounded-xl bg-card/50 border border-border">
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
                <div className="h-0 w-0 border-t-8 border-t-transparent border-l-12 border-l-primary border-b-8 border-b-transparent ml-1" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm">Quick Start Video</p>
            <p className="text-xs text-muted-foreground/60">Coming soon</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <ViperButton size="xl" onClick={onComplete} className="font-display">
        <Rocket className="h-5 w-5" />
        Enter the Arena
      </ViperButton>
    </div>
  );
}