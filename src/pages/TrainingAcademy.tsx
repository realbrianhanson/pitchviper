import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { EditorialLoading } from "@/components/ui/editorial-skeleton";
import { useTraining, LearningPath, TrainingModule } from "@/hooks/useTraining";
import { TrainingStats } from "@/components/training/TrainingStats";
import { LearningPathCard } from "@/components/training/LearningPathCard";
import { ModuleList } from "@/components/training/ModuleList";
import { VideoModule } from "@/components/training/VideoModule";
import { ReadingModule } from "@/components/training/ReadingModule";
import { QuizModule } from "@/components/training/QuizModule";
import { RoleplayModule } from "@/components/training/RoleplayModule";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Award, GraduationCap } from "lucide-react";
import { EditorialEmpty } from "@/components/ui/editorial-empty";

type ViewState = 
  | { type: 'paths' }
  | { type: 'modules'; path: LearningPath }
  | { type: 'module'; path: LearningPath; module: TrainingModule };

export default function TrainingAcademy() {
  const { 
    learningPaths, 
    certifications,
    stats, 
    isLoading, 
    updateModuleProgress,
    startModule,
    completeModule,
    refetch 
  } = useTraining();

  const [view, setView] = useState<ViewState>({ type: 'paths' });

  const handleSelectPath = (path: LearningPath) => {
    setView({ type: 'modules', path });
  };

  const handleSelectModule = (module: TrainingModule) => {
    if (view.type === 'modules') {
      // Mark as in_progress when starting
      startModule(module.id);
      setView({ type: 'module', path: view.path, module });
    }
  };

  const handleModuleComplete = async () => {
    if (view.type === 'module') {
      await completeModule(view.module.id);
      // Go back to module list
      setView({ type: 'modules', path: view.path });
      refetch();
    }
  };

  const handleBackToPaths = () => {
    setView({ type: 'paths' });
  };

  const handleBackToModules = () => {
    if (view.type === 'module') {
      setView({ type: 'modules', path: view.path });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Training Academy">
        <EditorialLoading label="Loading Curriculum" className="h-[60vh]" />
      </AppLayout>
    );
  }

  // Render active module
  if (view.type === 'module') {
    const { module } = view;
    
    switch (module.module_type) {
      case 'video':
        return (
          <AppLayout title="Training Academy">
            <VideoModule
              module={module}
              onComplete={handleModuleComplete}
              onBack={handleBackToModules}
            />
          </AppLayout>
        );
      case 'reading':
        return (
          <AppLayout title="Training Academy">
            <ReadingModule
              module={module}
              onComplete={handleModuleComplete}
              onBack={handleBackToModules}
            />
          </AppLayout>
        );
      case 'quiz':
        return (
          <AppLayout title="Training Academy">
            <QuizModule
              module={module}
              onComplete={handleModuleComplete}
              onBack={handleBackToModules}
            />
          </AppLayout>
        );
      case 'roleplay':
        return (
          <AppLayout title="Training Academy">
            <RoleplayModule
              module={module}
              onComplete={handleModuleComplete}
              onBack={handleBackToModules}
            />
          </AppLayout>
        );
      default:
        return (
          <AppLayout title="Training Academy">
            <ReadingModule
              module={module}
              onComplete={handleModuleComplete}
              onBack={handleBackToModules}
            />
          </AppLayout>
        );
    }
  }

  // Render module list for selected path
  if (view.type === 'modules') {
    return (
      <AppLayout title="Training Academy">
        <div className="animate-fade-in">
          <ModuleList
            path={view.path}
            onSelectModule={handleSelectModule}
            onBack={handleBackToPaths}
          />
        </div>
      </AppLayout>
    );
  }

  // Render learning paths overview
  return (
    <AppLayout title="Training Academy">
      <div className="space-y-6 animate-fade-in">
        {/* Training Stats */}
        {stats && <TrainingStats stats={stats} />}

        {/* Learning Paths */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Learning Paths</h2>
          
          {learningPaths.length === 0 ? (
            <EditorialEmpty
              eyebrow="The Academy"
              title="Curriculum in development"
              description="No learning paths available yet. Check back soon."
              icon={<GraduationCap className="h-8 w-8" strokeWidth={1.5} />}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {learningPaths.map((path) => {
                const isComplete = path.completedCount === path.totalModules && path.totalModules > 0;
                return (
                  <LearningPathCard
                    key={path.id}
                    path={path}
                    isComplete={isComplete}
                    onClick={() => handleSelectPath(path)}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Certifications Earned */}
        {certifications && certifications.filter(c => c.earned_at).length > 0 && (
          <ViperCard variant="glass">
            <ViperCardHeader>
              <ViperCardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Certifications Earned
              </ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {certifications.filter(c => c.earned_at).map((cert) => (
                  <div
                    key={cert.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-success/10 border border-success/20"
                  >
                    <div className="p-2 rounded-full bg-success/20">
                      <Award className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-success">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Earned {new Date(cert.earned_at!).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ViperCardContent>
          </ViperCard>
        )}
      </div>
    </AppLayout>
  );
}
