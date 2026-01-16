import { useGamification, Level } from "@/hooks/useGamification";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Star, Lock, Check, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelRoadmapProps {
  orientation?: 'horizontal' | 'vertical';
}

export function LevelRoadmap({ orientation = 'horizontal' }: LevelRoadmapProps) {
  const { levels, userProgress, isLoading } = useGamification();

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="w-20 h-20 rounded-full bg-muted/50 animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  const currentLevelNum = userProgress?.currentLevel?.level_number || 1;

  if (orientation === 'vertical') {
    return (
      <div className="space-y-4">
        {levels.map((level, index) => {
          const isUnlocked = level.level_number <= currentLevelNum;
          const isCurrent = level.level_number === currentLevelNum;
          const isNext = level.level_number === currentLevelNum + 1;

          return (
            <div 
              key={level.id}
              className={cn(
                "flex items-center gap-4 p-3 rounded-lg transition-all",
                isCurrent && "bg-primary/10 border border-primary/30",
                isNext && "bg-warning/5 border border-warning/20",
                !isUnlocked && !isNext && "opacity-50"
              )}
            >
              <div 
                className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shrink-0 border-2",
                  isUnlocked 
                    ? "bg-gradient-to-br from-primary/30 to-secondary/30 border-primary" 
                    : "bg-muted/30 border-muted"
                )}
              >
                {isUnlocked ? (
                  <Star className="h-5 w-5 text-primary" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-semibold",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {level.title}
                  </span>
                  {isCurrent && (
                    <Badge className="bg-primary text-primary-foreground text-xs">
                      Current
                    </Badge>
                  )}
                  {isNext && (
                    <Badge variant="outline" className="text-xs border-warning text-warning">
                      Next
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {level.xp_required.toLocaleString()} XP
                </p>
              </div>

              {isUnlocked && (
                <Check className="h-5 w-5 text-success shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex gap-2 pb-4">
        {levels.map((level, index) => {
          const isUnlocked = level.level_number <= currentLevelNum;
          const isCurrent = level.level_number === currentLevelNum;
          const isNext = level.level_number === currentLevelNum + 1;

          return (
            <Tooltip key={level.id}>
              <TooltipTrigger>
                <div className="flex flex-col items-center gap-1">
                  <div 
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                      isCurrent && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isUnlocked 
                        ? "bg-gradient-to-br from-primary/30 to-secondary/30 border-primary" 
                        : isNext
                        ? "bg-warning/10 border-warning/50"
                        : "bg-muted/30 border-muted"
                    )}
                  >
                    {level.level_number === 20 ? (
                      <Crown className={cn(
                        "h-5 w-5",
                        isUnlocked ? "text-warning" : "text-muted-foreground"
                      )} />
                    ) : isUnlocked ? (
                      <span className="text-sm font-bold text-primary">
                        {level.level_number}
                      </span>
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium truncate max-w-[60px]",
                    isUnlocked ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {level.title}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">{level.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {level.xp_required.toLocaleString()} XP required
                  </p>
                  {level.perks && level.perks.length > 0 && (
                    <div className="pt-1 border-t border-border">
                      {level.perks.slice(0, 2).map((perk, i) => (
                        <p key={i} className="text-xs text-primary">• {perk}</p>
                      ))}
                    </div>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
