import { motion, AnimatePresence } from "framer-motion";
import { formatActivityDescription } from "@/hooks/useDashboardData";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";

interface Activity {
  id: string;
  type: string;
  metadata: Record<string, any>;
  created_at: string;
  user: { name: string; avatar_url: string | null } | null;
}

interface RecentActivityProps {
  activities: Activity[];
  loading?: boolean;
  error?: string | null;
}

function formatTime(timestamp: string): string {
  const then = new Date(timestamp);
  return then.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function tagFor(type: string): string {
  if (type.includes("deal_closed")) return "REVENUE BOOKED";
  if (type.includes("deal_lost")) return "OPPORTUNITY LOST";
  if (type.includes("call")) return "CALL LOG";
  if (type.includes("appointment")) return "APPT SET";
  if (type.includes("roleplay")) return "TRAINING";
  if (type.includes("badge")) return "AWARD";
  if (type.includes("level")) return "MILESTONE";
  return "EVENT";
}

function ActivitySkeleton() {
  return (
    <div className="flex gap-6 items-start py-1">
      <EditorialSkeleton className="h-3 w-10 shrink-0 mt-1" />
      <div className="flex-1 space-y-2">
        <EditorialSkeleton className="h-4 w-3/4" />
        <EditorialSkeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function RecentActivity({ activities, loading = false, error = null }: RecentActivityProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bento-tile h-full min-h-[360px]"
    >
      <div className="flex items-center justify-between mb-8">
        <span className="eyebrow font-bold">Live Activity Stream</span>
        {!loading && !error && (
          <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            System Live
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-5">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border">
          <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive/50 animate-pulse" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-destructive/70 mb-1">
            Transmission Failed
          </p>
          <p className="font-body text-xs text-muted-foreground/60 max-w-xs text-center">
            {error}
          </p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed border-border">
          <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 animate-pulse" />
          </div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
            No transmissions captured for today
          </p>
        </div>
      ) : (
        <div className="space-y-5 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {activities.map((activity, index) => {
              const description = formatActivityDescription(activity);
              const value = activity.metadata?.value;
              const opacity = Math.max(0.4, 1 - index * 0.12);

              return (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity, x: 0 }}
                  exit={{ opacity: 0, x: 8 }}
                  transition={{ duration: 0.3, delay: index * 0.04 }}
                  className="flex gap-6 items-start hover:!opacity-100 transition-opacity cursor-pointer"
                >
                  <span className="font-mono text-[10px] text-muted-foreground/50 pt-1 tabular-nums shrink-0">
                    {formatTime(activity.created_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{description}</p>
                    <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mt-1">
                      {tagFor(activity.type)}
                      {value && (
                        <span className="text-success ml-2">
                          • ${Number(value).toLocaleString()} ARR
                        </span>
                      )}
                      {activity.user && (
                        <span className="opacity-70 ml-2">• {activity.user.name.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
