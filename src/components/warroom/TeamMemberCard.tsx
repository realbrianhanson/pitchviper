import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Phone, Calendar, Trophy, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMemberWithStatus } from "@/hooks/useWarRoomData";

interface TeamMemberCardProps {
  member: TeamMemberWithStatus;
  isPulsing: boolean;
  isCelebrating: boolean;
  rank?: number;
}

export function TeamMemberCard({
  member,
  isPulsing,
  isCelebrating,
  rank,
}: TeamMemberCardProps) {
  const [callDuration, setCallDuration] = useState<string | null>(null);
  const [timeSinceActivity, setTimeSinceActivity] = useState<string>("");

  // Calculate call duration if on a call
  useEffect(() => {
    if (member.status !== "on_call" || !member.current_call_started_at) {
      setCallDuration(null);
      return;
    }

    const updateDuration = () => {
      const start = new Date(member.current_call_started_at!).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setCallDuration(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);
    return () => clearInterval(interval);
  }, [member.status, member.current_call_started_at]);

  // Calculate time since last activity
  useEffect(() => {
    const updateTimeSince = () => {
      const lastActivity = new Date(member.last_activity_at).getTime();
      const now = Date.now();
      const diffMinutes = Math.floor((now - lastActivity) / 60000);

      if (diffMinutes < 1) {
        setTimeSinceActivity("Just now");
      } else if (diffMinutes < 60) {
        setTimeSinceActivity(`${diffMinutes} min ago`);
      } else {
        const hours = Math.floor(diffMinutes / 60);
        setTimeSinceActivity(`${hours}h ago`);
      }
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 60000);
    return () => clearInterval(interval);
  }, [member.last_activity_at]);

  const getStatusRingColor = () => {
    switch (member.status) {
      case "on_call":
        return "ring-success ring-2 ring-offset-2 ring-offset-card";
      case "available":
        return "ring-warning ring-2 ring-offset-2 ring-offset-card";
      case "in_meeting":
        return "ring-primary ring-2 ring-offset-2 ring-offset-card";
      default:
        return "ring-muted ring-2 ring-offset-2 ring-offset-card";
    }
  };

  const getStatusLabel = () => {
    switch (member.status) {
      case "on_call":
        return (
          <span className="text-success flex items-center gap-1">
            <Phone className="h-3 w-3 animate-pulse" />
            On call ({callDuration})
          </span>
        );
      case "available":
        return <span className="text-warning">Available</span>;
      case "in_meeting":
        return <span className="text-primary">In Meeting</span>;
      case "away":
        return <span className="text-muted-foreground">Away</span>;
      default:
        return <span className="text-muted-foreground">Offline</span>;
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

  return (
    <div
      className={cn(
        "relative bg-card/80 backdrop-blur-sm rounded-xl border border-border/50 p-4 transition-all duration-300",
        isPulsing && "animate-pulse ring-2 ring-primary ring-opacity-50",
        isCelebrating && "ring-4 ring-success shadow-lg shadow-success/30",
        "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
      )}
    >
      {/* Top Performer Badge */}
      {member.is_top_performer && (
        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-warning to-amber-400 rounded-full p-1.5 shadow-lg shadow-warning/30">
          <Crown className="h-4 w-4 text-background" />
        </div>
      )}

      {/* Rank Badge */}
      {rank && rank <= 3 && (
        <div
          className={cn(
            "absolute -top-2 -left-2 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg",
            rank === 1 && "bg-warning text-background",
            rank === 2 && "bg-slate-400 text-background",
            rank === 3 && "bg-amber-700 text-background"
          )}
        >
          {rank}
        </div>
      )}

      {/* Celebration Effect */}
      {isCelebrating && (
        <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-success/20 via-transparent to-success/20 animate-pulse" />
          <Sparkles className="absolute top-2 right-8 h-4 w-4 text-success animate-bounce" />
          <Sparkles className="absolute bottom-2 left-2 h-3 w-3 text-warning animate-bounce delay-100" />
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar with Status Ring */}
        <Avatar className={cn("h-14 w-14", getStatusRingColor())}>
          <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {getInitials(member.full_name)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          {/* Name & Title */}
          <h3 className="font-semibold text-foreground truncate">{member.full_name}</h3>
          <p className="text-xs text-muted-foreground truncate">{member.title || "Sales Rep"}</p>

          {/* Status */}
          <p className="text-xs mt-1">{getStatusLabel()}</p>
          {member.status !== "on_call" && (
            <p className="text-xs text-muted-foreground">Last: {timeSinceActivity}</p>
          )}
        </div>
      </div>

      {/* Today's Stats */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="bg-background/50 rounded-lg py-2">
          <div className="flex items-center justify-center gap-1">
            <Phone className="h-3 w-3 text-primary" />
            <span className="font-bold text-foreground">{member.today_stats.calls_made}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Calls</p>
        </div>
        <div className="bg-background/50 rounded-lg py-2">
          <div className="flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3 text-secondary" />
            <span className="font-bold text-foreground">{member.today_stats.appointments_set}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Appts</p>
        </div>
        <div className="bg-background/50 rounded-lg py-2">
          <div className="flex items-center justify-center gap-1">
            <Trophy className="h-3 w-3 text-success" />
            <span className="font-bold text-foreground">{member.today_stats.deals_closed}</span>
          </div>
          <p className="text-[10px] text-muted-foreground uppercase">Closes</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Daily Goal</span>
          <span>{Math.round(member.daily_goal_progress)}%</span>
        </div>
        <Progress
          value={member.daily_goal_progress}
          className="h-1.5 bg-muted/30"
        />
      </div>
    </div>
  );
}
