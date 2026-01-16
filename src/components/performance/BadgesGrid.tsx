import { Lock } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Badge as BadgeType } from "@/hooks/usePerformanceData";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BadgesGridProps {
  badges: BadgeType[];
}

export function BadgesGrid({ badges }: BadgesGridProps) {
  const earnedCount = badges.filter(b => b.earned).length;

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center justify-between">
          <span>Badges Earned</span>
          <span className="text-sm font-normal text-muted-foreground">
            {earnedCount} / {badges.length}
          </span>
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent>
        <TooltipProvider>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {badges.map((badge) => (
              <Tooltip key={badge.id}>
                <TooltipTrigger asChild>
                  <div
                    className={`
                      aspect-square rounded-xl flex flex-col items-center justify-center p-2
                      transition-all duration-200 cursor-pointer
                      ${badge.earned 
                        ? "bg-card border border-primary/30 hover:border-primary/50 hover:scale-105" 
                        : "bg-muted/50 border border-border opacity-50"
                      }
                    `}
                  >
                    {badge.earned ? (
                      <span className="text-2xl">{badge.icon}</span>
                    ) : (
                      <div className="relative">
                        <span className="text-2xl opacity-30 blur-[1px]">{badge.icon}</span>
                        <Lock className="h-4 w-4 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[200px]">
                  <p className="font-medium">{badge.name}</p>
                  <p className="text-xs text-muted-foreground">{badge.description}</p>
                  {badge.earned && (
                    <p className="text-xs text-success mt-1">✓ Earned!</p>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      </ViperCardContent>
    </ViperCard>
  );
}
