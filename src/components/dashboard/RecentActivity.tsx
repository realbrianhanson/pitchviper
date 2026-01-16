import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Phone, Target, Trophy, Award, MessageSquare, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface Activity {
  id: string;
  type: "call" | "deal" | "badge" | "appointment" | "message";
  description: string;
  timestamp: string;
  value?: string;
  user?: {
    name: string;
    avatarUrl?: string;
  };
}

interface RecentActivityProps {
  activities: Activity[];
}

const activityIcons = {
  call: Phone,
  deal: Target,
  badge: Award,
  appointment: Calendar,
  message: MessageSquare,
};

const activityColors = {
  call: "text-primary bg-primary/10",
  deal: "text-success bg-success/10",
  badge: "text-warning bg-warning/10",
  appointment: "text-magenta bg-magenta/10",
  message: "text-muted-foreground bg-muted",
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
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {activities.map((activity) => {
            const Icon = activityIcons[activity.type];
            const colorClass = activityColors[activity.type];

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/30 border border-border hover:border-primary/20 transition-colors"
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
                  <p className="text-sm text-foreground">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                    {activity.value && (
                      <ViperBadge variant="success" className="text-xs">
                        {activity.value}
                      </ViperBadge>
                    )}
                  </div>
                </div>
                {activity.user && (
                  <div className="shrink-0">
                    {activity.user.avatarUrl ? (
                      <img
                        src={activity.user.avatarUrl}
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
      </ViperCardContent>
    </ViperCard>
  );
}