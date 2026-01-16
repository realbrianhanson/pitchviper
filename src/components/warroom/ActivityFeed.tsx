import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone,
  PhoneIncoming,
  Calendar,
  Trophy,
  XCircle,
  Sparkles,
  Medal,
  GraduationCap,
  Gamepad2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityItem } from "@/hooks/useWarRoomData";
import { formatDistanceToNow } from "date-fns";

interface ActivityFeedProps {
  activities: ActivityItem[];
}

type FilterType = "all" | "calls" | "appointments" | "closes";

export function ActivityFeed({ activities }: ActivityFeedProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "call_made":
        return <Phone className="h-4 w-4 text-primary" />;
      case "call_received":
        return <PhoneIncoming className="h-4 w-4 text-cyan-400" />;
      case "appointment_set":
        return <Calendar className="h-4 w-4 text-secondary" />;
      case "deal_closed":
        return <Trophy className="h-4 w-4 text-success" />;
      case "deal_lost":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "roleplay_completed":
        return <Gamepad2 className="h-4 w-4 text-purple-400" />;
      case "badge_earned":
        return <Medal className="h-4 w-4 text-warning" />;
      case "level_up":
        return <Sparkles className="h-4 w-4 text-warning" />;
      case "training_completed":
        return <GraduationCap className="h-4 w-4 text-blue-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getActivityMessage = (activity: ActivityItem) => {
    const name = activity.user_name.split(" ")[0];
    switch (activity.activity_type) {
      case "call_made":
        const duration = activity.metadata?.duration_minutes;
        return `${name} made a call${duration ? ` (${duration} min)` : ""}`;
      case "call_received":
        return `${name} received a call`;
      case "appointment_set":
        return `${name} set an appointment!`;
      case "deal_closed":
        const value = activity.metadata?.value;
        return `${name} closed a deal${value ? ` for $${Number(value).toLocaleString()}` : ""}! 🎉`;
      case "deal_lost":
        return `${name} lost a deal`;
      case "roleplay_completed":
        const score = activity.metadata?.score;
        return `${name} completed roleplay${score ? ` (Score: ${score}%)` : ""}`;
      case "badge_earned":
        const badge = activity.metadata?.badge_name;
        return `${name} earned a badge${badge ? `: ${badge}` : ""}! 🏅`;
      case "level_up":
        const level = activity.metadata?.new_level;
        return `${name} leveled up${level ? ` to Level ${level}` : ""}! ⬆️`;
      case "training_completed":
        const training = activity.metadata?.training_name;
        return `${name} completed training${training ? `: ${training}` : ""}`;
      default:
        return `${name} did something awesome`;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredActivities = activities.filter((activity) => {
    if (filter === "all") return true;
    if (filter === "calls") return activity.activity_type.includes("call");
    if (filter === "appointments") return activity.activity_type === "appointment_set";
    if (filter === "closes") return activity.activity_type === "deal_closed";
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Filter Buttons */}
      <div className="flex gap-2 p-4 border-b border-border/50">
        {(["all", "calls", "appointments", "closes"] as FilterType[]).map((type) => (
          <Button
            key={type}
            variant={filter === type ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter(type)}
            className={cn(
              "text-xs capitalize",
              filter === type && "bg-primary text-primary-foreground"
            )}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Activity List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredActivities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No activities yet</p>
          ) : (
            filteredActivities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg bg-card/50 border border-border/30 transition-all",
                  activity.activity_type === "deal_closed" &&
                    "border-success/30 bg-success/5"
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={activity.user_avatar || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {getInitials(activity.user_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getActivityIcon(activity.activity_type)}
                    <p className="text-sm text-foreground">{getActivityMessage(activity)}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
