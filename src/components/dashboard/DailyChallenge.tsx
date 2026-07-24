import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";

interface DailyChallengeProps {
  challenge: {
    title: string;
    description: string;
    reward: number;
    progress: number;
    goal: number;
  };
  streak: number;
  loading?: boolean;
  error?: string | null;
}

export function DailyChallenge({ challenge, streak, loading = false, error = null }: DailyChallengeProps) {
  const progressPercentage = Math.min((challenge.progress / challenge.goal) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[12px] border border-border bg-card p-6 shadow-sm h-full flex flex-col"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-muted-foreground">Focus for today</span>
        </div>
        {!loading && !error && (
          <span className="text-xs font-medium text-primary">
            +{challenge.reward.toLocaleString()} XP
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          <EditorialSkeleton className="h-6 w-3/4" />
          <EditorialSkeleton className="h-4 w-full" />
          <EditorialSkeleton className="h-4 w-2/3" />
        </div>
      ) : error ? (
        <div>
          <h2 className="text-lg font-semibold mb-1 text-foreground">Focus unavailable</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      ) : (
        <>
          <h2 className="text-lg font-semibold leading-snug mb-1 text-foreground">{challenge.title}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{challenge.description}</p>
        </>
      )}

      <div className="mt-auto pt-6">
        {loading ? (
          <EditorialSkeleton className="h-2 w-full" />
        ) : error ? null : (
          <>
            <div className="flex justify-between mb-2 text-xs text-muted-foreground tabular-nums">
              <span>Progress</span>
              <span>{challenge.progress} / {challenge.goal}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5" strokeWidth={2} />
              <span>
                <span className="tabular-nums text-foreground font-medium">{streak}</span>
                {" "}day streak
              </span>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
