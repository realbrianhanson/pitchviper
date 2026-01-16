import { 
  Video, FileText, HelpCircle, Gamepad2, 
  Clock, Star, CheckCircle, PlayCircle, Lock
} from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { TrainingModule, LearningPath } from "@/hooks/useTraining";

interface ModuleListProps {
  path: LearningPath;
  onSelectModule: (module: TrainingModule) => void;
  onBack: () => void;
}

const typeIcons: Record<string, any> = {
  video: Video,
  reading: FileText,
  quiz: HelpCircle,
  roleplay: Gamepad2,
};

const typeLabels: Record<string, string> = {
  video: 'Video',
  reading: 'Reading',
  quiz: 'Quiz',
  roleplay: 'Roleplay',
};

const typeColors: Record<string, string> = {
  video: 'bg-blue-500/20 text-blue-500',
  reading: 'bg-green-500/20 text-green-500',
  quiz: 'bg-purple-500/20 text-purple-500',
  roleplay: 'bg-orange-500/20 text-orange-500',
};

export function ModuleList({ path, onSelectModule, onBack }: ModuleListProps) {
  const modules = path.modules || [];

  const getModuleStatus = (module: TrainingModule, index: number) => {
    if (module.progress?.status === 'completed') return 'completed';
    if (module.progress?.status === 'in_progress') return 'in_progress';
    
    // Check if previous modules are completed
    const previousModules = modules.slice(0, index);
    const allPreviousCompleted = previousModules.every(
      m => m.progress?.status === 'completed'
    );
    
    return allPreviousCompleted ? 'available' : 'locked';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ViperButton variant="ghost" onClick={onBack}>
          ← Back to Paths
        </ViperButton>
        <div>
          <h2 className="text-xl font-bold">{path.name}</h2>
          <p className="text-sm text-muted-foreground">{path.description}</p>
        </div>
      </div>

      {/* Progress Summary */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {path.completedCount || 0}/{path.totalModules}
              </p>
              <p className="text-xs text-muted-foreground">Modules Completed</p>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="text-center">
              <p className="text-2xl font-bold text-magenta">
                {modules.reduce((sum, m) => m.progress?.status === 'completed' ? sum + m.xp_reward : sum, 0)}
              </p>
              <p className="text-xs text-muted-foreground">XP Earned</p>
            </div>
          </div>
          {path.completedCount === path.totalModules && (
            <ViperBadge variant="success" size="lg">
              <CheckCircle className="h-4 w-4 mr-1" />
              Path Completed!
            </ViperBadge>
          )}
        </ViperCardContent>
      </ViperCard>

      {/* Module List */}
      <div className="space-y-3">
        {modules.map((module, index) => {
          const status = getModuleStatus(module, index);
          const TypeIcon = typeIcons[module.module_type] || FileText;
          const isLocked = status === 'locked';
          const isCompleted = status === 'completed';
          const isInProgress = status === 'in_progress';

          return (
            <ViperCard 
              key={module.id}
              variant="glass"
              className={`transition-all ${
                isLocked 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'cursor-pointer hover:border-primary/50'
              } ${isCompleted ? 'border-success/30' : ''}`}
              onClick={() => !isLocked && onSelectModule(module)}
            >
              <ViperCardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Step Number */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                    isCompleted 
                      ? 'bg-success text-success-foreground' 
                      : isInProgress
                        ? 'bg-primary text-primary-foreground'
                        : isLocked
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/20 text-primary'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Module Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{module.title}</h4>
                      <div className={`p-1 rounded ${typeColors[module.module_type]}`}>
                        <TypeIcon className="h-3 w-3" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {typeLabels[module.module_type]}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {module.description}
                    </p>
                  </div>

                  {/* Duration & XP */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {module.duration_minutes}m
                    </span>
                    <span className="flex items-center gap-1 text-magenta">
                      <Star className="h-3.5 w-3.5" />
                      {module.xp_reward} XP
                    </span>
                  </div>

                  {/* Action */}
                  <div>
                    {isCompleted ? (
                      <ViperBadge variant="success">Completed</ViperBadge>
                    ) : isInProgress ? (
                      <ViperButton size="sm">
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Continue
                      </ViperButton>
                    ) : isLocked ? (
                      <ViperBadge variant="secondary">Locked</ViperBadge>
                    ) : (
                      <ViperButton size="sm" variant="outline">
                        <PlayCircle className="h-4 w-4 mr-1" />
                        Start
                      </ViperButton>
                    )}
                  </div>
                </div>
              </ViperCardContent>
            </ViperCard>
          );
        })}
      </div>
    </div>
  );
}
