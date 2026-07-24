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
  if (type.includes("deal_closed")) return "Deal won";
  if (type.includes("deal_lost")) return "Deal lost";
  if (type.includes("call")) return "Call";
  if (type.includes("appointment")) return "Appointment";
  if (type.includes("roleplay")) return "Training";
  if (type.includes("badge")) return "Award";
  if (type.includes("level")) return "Milestone";
  return "Event";
}

function ActivitySkeleton() {
  return (
    <div className="flex gap-4 items-start py-2">
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[12px] border border-border bg-card p-6 shadow-sm h-full min-h-[360px]"
    >
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-foreground">Recent activity</h3>
        {!loading && !error && (
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            Live
          </span>
        )}
      </div>

      {loading ? (
        <div className="divide-y divide-border">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </div>
      ) : error ? (
        <div className="py-12 text-center">
          <p className="text-sm font-medium text-foreground mb-1">Activity unavailable</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">No activity yet today</p>
        </div>
      ) : (
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {activities.map((activity, index) => {
              const description = formatActivityDescription(activity);
              const value = activity.metadata?.value;

              return (
                <motion.div
                  key={activity.id}
                  layout
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 6 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  className="flex gap-4 items-start py-3"
                >
                  <span className="text-xs text-muted-foreground pt-0.5 tabular-nums shrink-0 w-10">
                    {formatTime(activity.created_at)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {tagFor(activity.type)}
                      {value && (
                        <span className="text-success ml-2">
                          • ${Number(value).toLocaleString()}
                        </span>
                      )}
                      {activity.user && (
                        <span className="ml-2">• {activity.user.name}</span>
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
