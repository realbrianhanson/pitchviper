import { useGamification } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Star, Zap, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface XPProgressBarProps {
  showDetails?: boolean;
  className?: string;
}

export function XPProgressBar({ showDetails = true, className }: XPProgressBarProps) {
  const { userProgress, isLoading } = useGamification();

  if (isLoading || !userProgress) {
    return (
      <div className={cn("animate-pulse bg-muted/50 rounded-lg h-12", className)} />
    );
  }

  const { currentLevel, nextLevel, progressPercent, xpToNextLevel, totalXp } = userProgress;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger>
              <Badge 
                variant="outline" 
                className="bg-gradient-to-r from-primary/20 to-secondary/20 border-primary/50 text-foreground font-semibold"
              >
                <Star className="h-3 w-3 mr-1 text-warning" />
                Lvl {currentLevel?.level_number || 1}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-semibold">{currentLevel?.title}</p>
            </TooltipContent>
          </Tooltip>
          
          {showDetails && (
            <span className="text-xs text-muted-foreground">
              {currentLevel?.title}
            </span>
          )}
        </div>

        {showDetails && nextLevel && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span>{xpToNextLevel.toLocaleString()} XP to {nextLevel.title}</span>
          </div>
        )}
      </div>

      <div className="relative">
        <Progress 
          value={progressPercent} 
          className="h-2 bg-muted/50"
        />
        {progressPercent > 0 && progressPercent < 100 && (
          <div 
            className="absolute top-0 h-2 w-1 bg-white/50 rounded-full animate-pulse"
            style={{ left: `${progressPercent}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>

      {showDetails && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{totalXp.toLocaleString()} XP Total</span>
          {nextLevel && (
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              {nextLevel.xp_required.toLocaleString()} XP
            </span>
          )}
        </div>
      )}
    </div>
  );
}
