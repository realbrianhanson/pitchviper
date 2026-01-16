import { useState, useEffect, useRef } from "react";
import { Video, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Progress } from "@/components/ui/progress";
import { TrainingModule } from "@/hooks/useTraining";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface VideoModuleProps {
  module: TrainingModule;
  onComplete: () => void;
  onBack: () => void;
}

export function VideoModule({ module, onComplete, onBack }: VideoModuleProps) {
  const [watchProgress, setWatchProgress] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isCompleted, setIsCompleted] = useState(module.progress?.status === 'completed');
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const content = module.content || {};
  const videoUrl = content.video_url || '';
  const transcript = content.transcript || 'No transcript available.';

  // Simulate video progress (in a real app, you'd track actual video playback)
  useEffect(() => {
    if (!isCompleted) {
      progressInterval.current = setInterval(() => {
        setWatchProgress(prev => {
          const newProgress = Math.min(prev + 2, 100);
          return newProgress;
        });
      }, 1000);
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [isCompleted]);

  const canComplete = watchProgress >= 90;

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ViperButton variant="ghost" onClick={onBack}>
          ← Back
        </ViperButton>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{module.title}</h2>
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Completed</span>
          </div>
        )}
      </div>

      {/* Video Player */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-0 overflow-hidden rounded-lg">
          <div className="aspect-video bg-black">
            {videoUrl ? (
              <iframe
                src={videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/50">
                <Video className="h-16 w-16" />
              </div>
            )}
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Progress Bar */}
      {!isCompleted && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Watch Progress</span>
            <span className={watchProgress >= 90 ? 'text-success' : ''}>
              {watchProgress}% {watchProgress >= 90 && '- Ready to complete!'}
            </span>
          </div>
          <Progress value={watchProgress} className="h-2" />
        </div>
      )}

      {/* Transcript */}
      <Collapsible open={showTranscript} onOpenChange={setShowTranscript}>
        <ViperCard variant="glass">
          <CollapsibleTrigger asChild>
            <div className="cursor-pointer">
              <ViperCardHeader className="flex flex-row items-center justify-between">
                <ViperCardTitle className="text-base">Transcript</ViperCardTitle>
                {showTranscript ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </ViperCardHeader>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ViperCardContent className="pt-0">
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="text-muted-foreground">{transcript}</p>
              </div>
            </ViperCardContent>
          </CollapsibleContent>
        </ViperCard>
      </Collapsible>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <ViperButton variant="outline" onClick={onBack}>
          Exit Module
        </ViperButton>
        {!isCompleted && (
          <ViperButton 
            onClick={handleComplete}
            disabled={!canComplete}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Complete
          </ViperButton>
        )}
      </div>
    </div>
  );
}
