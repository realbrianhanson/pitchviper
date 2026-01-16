import { GraduationCap, Award, Star, BookOpen } from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Progress } from "@/components/ui/progress";
import { TrainingStats as TrainingStatsType } from "@/hooks/useTraining";

interface TrainingStatsProps {
  stats: TrainingStatsType;
}

export function TrainingStats({ stats }: TrainingStatsProps) {
  const completionPercent = stats.totalModules > 0 
    ? Math.round((stats.modulesCompleted / stats.totalModules) * 100) 
    : 0;

  return (
    <ViperCard variant="glass" className="overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-magenta/10" />
      <ViperCardContent className="p-6 relative">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          {/* Hero Icon */}
          <div className="p-4 rounded-2xl bg-primary/20 border border-primary/30 w-fit">
            <GraduationCap className="h-12 w-12 text-primary" />
          </div>

          {/* Title & Progress */}
          <div className="flex-1 space-y-3">
            <div>
              <h1 className="text-2xl font-bold">Training Academy</h1>
              <p className="text-muted-foreground">Level up your skills and earn certifications</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{completionPercent}%</span>
              </div>
              <Progress value={completionPercent} className="h-2" />
            </div>
          </div>

          {/* Stats Cards */}
          <div className="flex gap-4 md:gap-6">
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border min-w-[100px]">
              <BookOpen className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.modulesCompleted}</p>
              <p className="text-xs text-muted-foreground">of {stats.totalModules} Modules</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-card/50 border border-border min-w-[100px]">
              <Award className="h-5 w-5 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.certificationsEarned}</p>
              <p className="text-xs text-muted-foreground">Certifications</p>
            </div>

            <div className="text-center p-4 rounded-lg bg-card/50 border border-border min-w-[100px]">
              <Star className="h-5 w-5 text-magenta mx-auto mb-1" />
              <p className="text-2xl font-bold">{stats.xpFromTraining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
        </div>
      </ViperCardContent>
    </ViperCard>
  );
}
