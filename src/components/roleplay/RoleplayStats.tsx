import { Gamepad2, Trophy, Target, Zap } from "lucide-react";
import { UserRoleplayStats } from "@/hooks/useRoleplayData";

interface RoleplayStatsProps {
  stats: UserRoleplayStats;
}

export function RoleplayStats({ stats }: RoleplayStatsProps) {
  const getSkillLevel = (winRate: number, sessions: number) => {
    if (sessions < 3) return { level: "Novice", color: "text-muted-foreground" };
    if (winRate >= 90) return { level: "Master Closer", color: "text-warning" };
    if (winRate >= 75) return { level: "Senior Rep", color: "text-success" };
    if (winRate >= 50) return { level: "Rising Star", color: "text-primary" };
    return { level: "Trainee", color: "text-muted-foreground" };
  };

  const skill = getSkillLevel(stats.win_rate, stats.completed_sessions);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Sessions */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 text-center">
        <Gamepad2 className="h-6 w-6 text-primary mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{stats.total_sessions}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Sessions</p>
      </div>

      {/* Win Rate */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 text-center">
        <Trophy className="h-6 w-6 text-warning mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{stats.win_rate}%</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Win Rate</p>
      </div>

      {/* XP Earned */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 text-center">
        <Zap className="h-6 w-6 text-success mx-auto mb-2" />
        <p className="text-2xl font-bold text-foreground">{stats.total_xp_earned}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">XP Earned</p>
      </div>

      {/* Skill Level */}
      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 p-4 text-center">
        <Target className="h-6 w-6 text-secondary mx-auto mb-2" />
        <p className={`text-lg font-bold ${skill.color}`}>{skill.level}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Skill Level</p>
      </div>
    </div>
  );
}
