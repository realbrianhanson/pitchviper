import { Gamepad2, PlayCircle, CheckCircle, Target } from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperBadge } from "@/components/ui/viper-badge";
import { TrainingModule } from "@/hooks/useTraining";
import { useNavigate } from "react-router-dom";

interface RoleplayModuleProps {
  module: TrainingModule;
  onComplete: (score: number) => void;
  onBack: () => void;
}

export function RoleplayModule({ module, onComplete, onBack }: RoleplayModuleProps) {
  const navigate = useNavigate();
  const isCompleted = module.progress?.status === 'completed';
  const previousScore = module.progress?.score;

  const content = module.content || {};
  const scenarioName = content.scenario_name || 'Sales Roleplay';
  const minScore = content.min_score || 70;

  const handleStartRoleplay = () => {
    // Navigate to roleplay arena
    navigate('/roleplay');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ViperButton variant="ghost" onClick={onBack}>← Back</ViperButton>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{module.title}</h2>
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </div>
        {isCompleted && (
          <ViperBadge variant="success">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </ViperBadge>
        )}
      </div>

      {/* Main Card */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-8 text-center">
          <div className="p-6 rounded-full bg-primary/20 w-fit mx-auto mb-6">
            <Gamepad2 className="h-16 w-16 text-primary" />
          </div>

          <h3 className="text-2xl font-bold mb-2">{scenarioName}</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Practice your skills in a realistic roleplay scenario. 
            You'll need to score at least {minScore}% to complete this module.
          </p>

          {/* Requirements */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center p-4 rounded-lg bg-card/50 border border-border">
              <Target className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold">{minScore}%</p>
              <p className="text-xs text-muted-foreground">Minimum Score</p>
            </div>

            {previousScore !== null && previousScore !== undefined && (
              <div className="text-center p-4 rounded-lg bg-card/50 border border-border">
                <CheckCircle className={`h-5 w-5 mx-auto mb-1 ${previousScore >= minScore ? 'text-success' : 'text-destructive'}`} />
                <p className="text-2xl font-bold">{previousScore}%</p>
                <p className="text-xs text-muted-foreground">Your Best Score</p>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="text-left p-4 rounded-lg bg-muted/50 border border-border mb-8 max-w-md mx-auto">
            <h4 className="font-semibold mb-2">Tips for Success:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Listen carefully to the prospect's concerns</li>
              <li>• Use open-ended questions to discover needs</li>
              <li>• Address objections with empathy first</li>
              <li>• Focus on value, not features</li>
            </ul>
          </div>

          {/* Action */}
          <ViperButton size="lg" onClick={handleStartRoleplay}>
            <PlayCircle className="h-5 w-5 mr-2" />
            Start Roleplay Session
          </ViperButton>
        </ViperCardContent>
      </ViperCard>

      {/* Note */}
      <p className="text-sm text-muted-foreground text-center">
        After completing the roleplay, return here and your progress will be automatically updated.
      </p>
    </div>
  );
}
