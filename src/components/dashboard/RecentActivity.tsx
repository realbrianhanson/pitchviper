import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Phone, Target, Trophy, Award, MessageSquare, Calendar, Swords, GraduationCap, TrendingUp, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatActivityDescription } from "@/hooks/useDashboardData";

interface Activity {
  id: string;
  type: string;
  metadata: Record<string, any>;
  created_at: string;
  user: { name: string; avatar_url: string | null } | null;
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons: Record<string, any> = {
  call_made: Phone,
  call_received: Phone,
  appointment_set: Calendar,
  deal_closed: Target,
  deal_lost: XCircle,
  roleplay_completed: Swords,
  badge_earned: Award,
  level_up: TrendingUp,
  training_completed: GraduationCap,
};

const activityColors: Record<string, string> = {
  call_made: "text-primary bg-primary/10",
  call_received: "text-primary bg-primary/10",
  appointment_set: "text-magenta bg-magenta/10",
  deal_closed: "text-success bg-success/10",
  deal_lost: "text-destructive bg-destructive/10",
  roleplay_completed: "text-warning bg-warning/10",
  badge_earned: "text-warning bg-warning/10",
  level_up: "text-success bg-success/10",
  training_completed: "text-primary bg-primary/10",
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return then.toLocaleDateString();
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <ViperCard variant="glass" className="h-full">
      <ViperCardHeader>
        <ViperCardTitle>Recent Activity</ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Phone className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No activity yet today</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Start making calls to see your activity here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type] || Phone;
              const colorClass = activityColors[activity.type] || "text-muted-foreground bg-muted";
              const description = formatActivityDescription(activity);
              const value = activity.metadata?.value;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border hover:border-primary/20 transition-colors animate-fade-in"
                >
                  <div
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                      {value && (
                        <ViperBadge variant="success" className="text-xs">
                          ${Number(value).toLocaleString()}
                        </ViperBadge>
                      )}
                    </div>
                  </div>
                  {activity.user && (
                    <div className="shrink-0">
                      {activity.user.avatar_url ? (
                        <img
                          src={activity.user.avatar_url}
                          alt={activity.user.name}
                          className="h-7 w-7 rounded-full object-cover border border-border"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                          {activity.user.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}