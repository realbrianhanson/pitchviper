import { AppLayout } from "@/components/layout/AppLayout";
import { ViperButton } from "@/components/ui/viper-button";
import { RefreshCw, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { LeaderboardFilters } from "@/components/leaderboard/LeaderboardFilters";
import { LeaderboardPodium } from "@/components/leaderboard/LeaderboardPodium";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { CurrentUserRankBar } from "@/components/leaderboard/CurrentUserRankBar";
import { CompetitionsPanel } from "@/components/leaderboard/CompetitionsPanel";

export default function Leaderboards() {
  const {
    leaderboard,
    topThree,
    restOfRankings,
    currentUserRank,
    competitions,
    isLoading,
    metricType,
    setMetricType,
    timePeriod,
    setTimePeriod,
    refetch,
  } = useLeaderboard();

  const nextRankValue =
    currentUserRank && currentUserRank.rank > 1
      ? leaderboard.find((e) => e.rank === currentUserRank.rank - 1)?.value
      : undefined;

  const leader = topThree[0];

  return (
    <AppLayout title="Leaderboards">
      <div className="max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-2"
        >
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70 mb-3">
              The Rankings · Live
            </p>
            <h1 className="font-display text-5xl md:text-6xl leading-[1.05]">
              Who's <span className="italic">crushing it.</span>
            </h1>
          </div>
          <div className="flex items-end gap-6">
            {leader && (
              <div className="md:border-l md:border-border md:pl-8">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 block mb-1">
                  Reigning
                </span>
                <span className="font-display italic text-3xl text-primary leading-none truncate max-w-[200px] block">
                  {leader.full_name.split(" ")[0]}
                </span>
              </div>
            )}
            <ViperButton variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isLoading ? "animate-spin" : ""}`} strokeWidth={1.5} />
              Refresh
            </ViperButton>
          </div>
        </motion.div>

        {/* Filters */}
        <LeaderboardFilters
          metricType={metricType}
          onMetricChange={setMetricType}
          timePeriod={timePeriod}
          onTimePeriodChange={setTimePeriod}
        />

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-6 w-6 text-primary animate-spin" strokeWidth={1.5} />
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Compiling Rankings
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-border border border-border">
            <div className="lg:col-span-2 bg-background p-6 space-y-8">
              <div>
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="font-display text-2xl">The Podium</h2>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                    Top three
                  </span>
                </div>
                <LeaderboardPodium topThree={topThree} metricType={metricType} />
              </div>

              {restOfRankings.length > 0 && (
                <div>
                  <div className="flex items-baseline justify-between mb-5">
                    <h2 className="font-display text-2xl">The Field</h2>
                    <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                      Ranks 04 — {String(leaderboard.length).padStart(2, "0")}
                    </span>
                  </div>
                  <LeaderboardTable entries={restOfRankings} metricType={metricType} />
                </div>
              )}
            </div>

            <div className="bg-background p-6">
              <div className="flex items-baseline justify-between mb-5">
                <h2 className="font-display text-2xl">Competitions</h2>
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70">
                  Active
                </span>
              </div>
              <CompetitionsPanel competitions={competitions} />
            </div>
          </div>
        )}

        {currentUserRank && !isLoading && (
          <CurrentUserRankBar
            userRank={currentUserRank}
            metricType={metricType}
            nextRankValue={nextRankValue}
          />
        )}
      </div>
    </AppLayout>
  );
}
