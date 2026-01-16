import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  metric: string;
  rank: number;
}

interface TeamPulseProps {
  members: TeamMember[];
  teamName: string | null;
}

const rankColors = [
  "bg-gradient-to-r from-yellow-500 to-amber-500 text-white", // 1st
  "bg-gradient-to-r from-gray-400 to-gray-500 text-white", // 2nd
  "bg-gradient-to-r from-amber-700 to-amber-800 text-white", // 3rd
];

export function TeamPulse({ members, teamName }: TeamPulseProps) {
  if (!teamName) {
    return (
      <ViperCard variant="glass">
        <ViperCardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Join a team to see the Team Pulse</p>
        </ViperCardContent>
      </ViperCard>
    );
  }

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <div className="flex items-center justify-between">
          <ViperCardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-warning" />
            Team Pulse
          </ViperCardTitle>
          <ViperBadge variant="glass">{teamName}</ViperBadge>
        </div>
      </ViperCardHeader>
      <ViperCardContent>
        <div className="flex items-end justify-center gap-4">
          {/* 2nd Place */}
          {members[1] && (
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                {members[1].avatarUrl ? (
                  <img
                    src={members[1].avatarUrl}
                    alt={members[1].name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-gray-400"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-gray-500/20 flex items-center justify-center text-lg font-bold text-gray-400">
                    {members[1].name.charAt(0)}
                  </div>
                )}
              </div>
              <div className={cn("w-16 h-20 rounded-t-lg flex flex-col items-center justify-start pt-2", rankColors[1])}>
                <span className="text-2xl font-bold">2</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center truncate max-w-[80px]">
                {members[1].name.split(" ")[0]}
              </p>
              <p className="text-xs font-medium text-foreground">{members[1].value}</p>
            </div>
          )}

          {/* 1st Place */}
          {members[0] && (
            <div className="flex flex-col items-center -mb-4">
              <div className="relative mb-2">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-xl">👑</span>
                </div>
                {members[0].avatarUrl ? (
                  <img
                    src={members[0].avatarUrl}
                    alt={members[0].name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-yellow-400 shadow-glow-sm"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-yellow-500/20 flex items-center justify-center text-xl font-bold text-yellow-500">
                    {members[0].name.charAt(0)}
                  </div>
                )}
              </div>
              <div className={cn("w-20 h-28 rounded-t-lg flex flex-col items-center justify-start pt-2", rankColors[0])}>
                <span className="text-3xl font-bold">1</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center truncate max-w-[80px]">
                {members[0].name.split(" ")[0]}
              </p>
              <p className="text-xs font-medium text-foreground">{members[0].value}</p>
            </div>
          )}

          {/* 3rd Place */}
          {members[2] && (
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                {members[2].avatarUrl ? (
                  <img
                    src={members[2].avatarUrl}
                    alt={members[2].name}
                    className="h-12 w-12 rounded-full object-cover border-2 border-amber-700"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-amber-700/20 flex items-center justify-center text-lg font-bold text-amber-700">
                    {members[2].name.charAt(0)}
                  </div>
                )}
              </div>
              <div className={cn("w-16 h-16 rounded-t-lg flex flex-col items-center justify-start pt-2", rankColors[2])}>
                <span className="text-2xl font-bold">3</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center truncate max-w-[80px]">
                {members[2].name.split(" ")[0]}
              </p>
              <p className="text-xs font-medium text-foreground">{members[2].value}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-center text-muted-foreground mt-4">
          Today's {members[0]?.metric || "performance"}
        </p>
      </ViperCardContent>
    </ViperCard>
  );
}