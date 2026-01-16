import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { TeamMemberWithStatus } from "@/hooks/useWarRoomData";
import { formatCurrency } from "@/hooks/useAnimatedCounter";

interface LiveLeaderboardProps {
  members: TeamMemberWithStatus[];
}

export function LiveLeaderboard({ members }: LiveLeaderboardProps) {
  // Sort by revenue and take top 5
  const topPerformers = [...members]
    .sort((a, b) => b.today_stats.revenue_closed - a.today_stats.revenue_closed)
    .slice(0, 5);

  if (topPerformers.length === 0) {
    return null;
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Reorder for podium display: [2nd, 1st, 3rd, 4th, 5th]
  const podiumOrder = [
    topPerformers[1], // 2nd place (left)
    topPerformers[0], // 1st place (center, elevated)
    topPerformers[2], // 3rd place (right)
    topPerformers[3], // 4th place
    topPerformers[4], // 5th place
  ].filter(Boolean);

  const getRankStyles = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          container: "scale-110 z-10",
          avatar: "h-20 w-20 ring-4 ring-warning ring-offset-4 ring-offset-background shadow-lg shadow-warning/30",
          bg: "bg-gradient-to-t from-warning/20 to-transparent",
          icon: <Crown className="h-6 w-6 text-warning" />,
        };
      case 2:
        return {
          container: "",
          avatar: "h-16 w-16 ring-2 ring-slate-400 ring-offset-2 ring-offset-background",
          bg: "bg-gradient-to-t from-slate-400/10 to-transparent",
          icon: <Trophy className="h-5 w-5 text-slate-400" />,
        };
      case 3:
        return {
          container: "",
          avatar: "h-16 w-16 ring-2 ring-amber-700 ring-offset-2 ring-offset-background",
          bg: "bg-gradient-to-t from-amber-700/10 to-transparent",
          icon: <Trophy className="h-5 w-5 text-amber-700" />,
        };
      default:
        return {
          container: "scale-90 opacity-70",
          avatar: "h-12 w-12 ring-1 ring-border",
          bg: "",
          icon: <Star className="h-4 w-4 text-muted-foreground" />,
        };
    }
  };

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-6">
      <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-warning" />
        Today's Top Performers
      </h3>

      <div className="flex items-end justify-center gap-4">
        {podiumOrder.map((member, index) => {
          // Calculate actual rank from original position
          const actualRank = index === 0 ? 2 : index === 1 ? 1 : index === 2 ? 3 : index + 1;
          const styles = getRankStyles(actualRank);

          return (
            <div
              key={member.user_id}
              className={cn(
                "flex flex-col items-center transition-all duration-500",
                styles.container,
                actualRank === 1 && "mb-4" // Elevate 1st place
              )}
            >
              {/* Rank Icon */}
              <div className="mb-2">{styles.icon}</div>

              {/* Avatar */}
              <div className={cn("relative rounded-full", styles.bg, "p-1")}>
                <Avatar className={cn(styles.avatar)}>
                  <AvatarImage src={member.avatar_url || undefined} alt={member.full_name} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                    {getInitials(member.full_name)}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Name */}
              <p className="mt-3 font-medium text-foreground text-center text-sm truncate max-w-[100px]">
                {member.full_name.split(" ")[0]}
              </p>

              {/* Revenue */}
              <p className={cn(
                "text-xs font-semibold",
                actualRank === 1 ? "text-warning" : "text-success"
              )}>
                {formatCurrency(member.today_stats.revenue_closed)}
              </p>

              {/* Stats */}
              <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                <span>{member.today_stats.calls_made}c</span>
                <span>•</span>
                <span>{member.today_stats.deals_closed}d</span>
              </div>

              {/* Podium Base */}
              {actualRank <= 3 && (
                <div
                  className={cn(
                    "mt-3 rounded-t-md flex items-center justify-center font-bold text-xl",
                    actualRank === 1 && "w-16 h-16 bg-gradient-to-t from-warning to-warning/70 text-background",
                    actualRank === 2 && "w-14 h-12 bg-gradient-to-t from-slate-400 to-slate-300 text-background",
                    actualRank === 3 && "w-14 h-10 bg-gradient-to-t from-amber-700 to-amber-600 text-background"
                  )}
                >
                  {actualRank}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
