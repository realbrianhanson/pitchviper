import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { AnimatedProgress } from "@/components/ui/animated-container";
import { Flame, Target } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.1 }}
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      {/* Daily Mission Card */}
      <motion.div
        className="md:col-span-2"
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <ViperCard variant="glass">
          <ViperCardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <ViperCardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Target className="h-5 w-5 text-primary" />
                </motion.div>
                Today's Mission
              </ViperCardTitle>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25, delay: 0.3 }}
              >
                <ViperBadge variant="default">+{challenge.reward} XP</ViperBadge>
              </motion.div>
            </div>
          </ViperCardHeader>
          <ViperCardContent>
            <motion.h3
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl font-display font-semibold text-foreground mb-2"
            >
              {challenge.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-muted-foreground mb-4"
            >
              {challenge.description}
            </motion.p>

            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <motion.span
                  className="font-medium text-foreground"
                  key={challenge.progress}
                  initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                  animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                  transition={{ duration: 0.3 }}
                >
                  {challenge.progress} / {challenge.goal}
                </motion.span>
              </div>
              <AnimatedProgress
                value={challenge.progress}
                max={challenge.goal}
                delay={0.4}
                className="h-3"
                barClassName="bg-gradient-to-r from-primary via-primary to-success"
              />
            </div>
          </ViperCardContent>
        </ViperCard>
      </motion.div>

      {/* Streak Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
      >
        <ViperCard variant={isOnFire ? "glow" : "glass"} className="h-full">
          <ViperCardContent className="h-full flex flex-col items-center justify-center py-6 text-center">
            <motion.div
              className="relative mb-3"
              animate={isOnFire ? {
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              } : {}}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "reverse",
              }}
            >
              <Flame
                className={cn(
                  "h-12 w-12 transition-colors",
                  isOnFire ? "text-warning" : "text-muted-foreground"
                )}
              />
              {isOnFire && (
                <>
                  <motion.div
                    className="absolute inset-0"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <Flame className="h-12 w-12 text-destructive" />
                  </motion.div>
                  <motion.div
                    className="absolute -inset-2 rounded-full bg-warning/20 blur-md"
                    animate={{ opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                </>
              )}
            </motion.div>
            <motion.p
              className="text-4xl font-display font-bold text-foreground mb-1"
              key={streak}
              initial={{ scale: 1.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              {streak}
            </motion.p>
            <p className="text-sm text-muted-foreground">Day Streak</p>
            {isOnFire && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <ViperBadge variant="warning" className="mt-3">
                  🔥 On Fire!
                </ViperBadge>
              </motion.div>
            )}
          </ViperCardContent>
        </ViperCard>
      </motion.div>
    </motion.div>
  );
}