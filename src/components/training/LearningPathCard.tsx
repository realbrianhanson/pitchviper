import { 
  GraduationCap, Search, Shield, Target, Building, Package, 
  ChevronRight, Clock, BookOpen, CheckCircle, Star, Award
} from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Progress } from "@/components/ui/progress";
import { LearningPath } from "@/hooks/useTraining";

interface LearningPathCardProps {
  path: LearningPath;
  isComplete: boolean;
  onClick: () => void;
}

const iconMap: Record<string, any> = {
  'graduation-cap': GraduationCap,
  'search': Search,
  'shield': Shield,
  'target': Target,
  'building': Building,
  'package': Package,
  'book': BookOpen,
};

export function LearningPathCard({ path, isComplete, onClick }: LearningPathCardProps) {
  const IconComponent = iconMap[path.icon] || BookOpen;
  const progressPercent = path.totalModules && path.totalModules > 0 
    ? Math.round((path.completedCount || 0) / path.totalModules * 100) 
    : 0;

  return (
    <ViperCard 
      variant="glass" 
      className={`cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 min-w-[300px] ${
        isComplete ? 'border-success/50' : ''
      }`}
      onClick={onClick}
    >
      <ViperCardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl ${isComplete ? 'bg-success/20' : 'bg-primary/20'}`}>
            <IconComponent className={`h-6 w-6 ${isComplete ? 'text-success' : 'text-primary'}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold truncate">{path.name}</h3>
              {path.is_required && (
                <ViperBadge variant="destructive" size="sm">Required</ViperBadge>
              )}
              {isComplete && (
                <ViperBadge variant="success" size="sm">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Complete
                </ViperBadge>
              )}
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {path.description}
            </p>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3 w-3" />
                {path.totalModules} modules
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {path.estimated_hours}h
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {path.completedCount || 0}/{path.totalModules} completed
                </span>
                <span className={isComplete ? 'text-success' : 'text-primary'}>
                  {progressPercent}%
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className={`h-1.5 ${isComplete ? '[&>div]:bg-success' : ''}`}
              />
            </div>
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
        </div>

        {isComplete && (
          <div className="mt-4 pt-3 border-t border-success/20 flex items-center gap-2 text-success">
            <Award className="h-4 w-4" />
            <span className="text-sm font-medium">Certification Earned</span>
          </div>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}
