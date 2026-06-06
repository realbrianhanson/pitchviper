import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

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
  const progressPercentage = Math.min((challenge.progress / challenge.goal) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      className="bento-grid grid-cols-1 md:grid-cols-3"
    >
      {/* Mission */}
      <div className="bento-tile md:col-span-2 flex flex-col justify-between min-h-[200px]">
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="eyebrow font-bold">Current Objective</span>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-success">
              +{challenge.reward.toLocaleString()} XP
            </span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl leading-tight mb-2">{challenge.title}</h2>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">{challenge.description}</p>
        </div>

        <div className="mt-8">
          <div className="flex justify-between mb-2 font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/60">
            <span>Operational Progress</span>
            <span>{challenge.progress} / {challenge.goal}</span>
          </div>
          <div className="h-px w-full bg-border overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      </div>

      {/* Streak */}
      <div className="bento-tile flex flex-col justify-between min-h-[200px] bg-background">
        <div className="flex items-center justify-between">
          <span className="eyebrow font-bold">Day Streak</span>
          <Flame
            className={cn(
              "h-4 w-4 transition-colors",
              isOnFire ? "text-primary animate-flame-flicker" : "text-muted-foreground/40"
            )}
            strokeWidth={1.5}
          />
        </div>

        <div>
          <motion.div
            key={streak}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "font-display text-7xl md:text-8xl leading-none tabular-nums",
              isOnFire ? "text-primary italic" : "text-foreground"
            )}
          >
            {streak}
          </motion.div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-3">
            {isOnFire ? "On Fire — Gold Tier" : "Consecutive Days"}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
