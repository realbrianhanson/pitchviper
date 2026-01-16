import { useNavigate } from "react-router-dom";
import { Clock, Trophy, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { RoleplayScenario } from "@/hooks/useRoleplayData";
import { DifficultyBadge } from "./DifficultyBadge";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Button } from "@/components/ui/button";

interface ScenarioCardProps {
  scenario: RoleplayScenario;
  bestScore?: number;
}

export function ScenarioCard({ scenario, bestScore }: ScenarioCardProps) {
  const navigate = useNavigate();

  const handleStart = () => {
    navigate(`/roleplay/${scenario.id}`);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 70) return "text-warning";
    return "text-destructive";
  };

  return (
    <ViperCard
      variant="glass"
      className={cn(
        "group cursor-pointer transition-all duration-300",
        "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10",
        "hover:-translate-y-1"
      )}
      onClick={handleStart}
    >
      <ViperCardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <DifficultyBadge difficulty={scenario.difficulty} />
          {bestScore !== undefined && (
            <div className={cn("flex items-center gap-1", getScoreColor(bestScore))}>
              <Star className="h-4 w-4 fill-current" />
              <span className="font-bold text-sm">{bestScore}%</span>
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {scenario.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {scenario.description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            <span>{scenario.estimated_minutes} min</span>
          </div>
          <div className="flex items-center gap-1 text-warning">
            <Zap className="h-3.5 w-3.5" />
            <span>{scenario.xp_reward} XP</span>
          </div>
        </div>

        {/* Win Conditions Preview */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-1">Win conditions:</p>
          <p className="text-xs text-foreground/80 line-clamp-1">
            {scenario.win_conditions[0]}
          </p>
        </div>

        {/* CTA Button */}
        <Button
          className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
          variant="outline"
        >
          {bestScore !== undefined ? "Try Again" : "Start Session"}
          <Trophy className="ml-2 h-4 w-4" />
        </Button>
      </ViperCardContent>
    </ViperCard>
  );
}
