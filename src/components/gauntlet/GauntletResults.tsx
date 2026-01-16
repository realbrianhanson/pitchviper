import { useNavigate } from "react-router-dom";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  XCircle, 
  Zap, 
  RefreshCw, 
  ArrowRight,
  Star,
  TrendingUp,
  Flame
} from "lucide-react";
import type { EvaluationResult, GauntletChallenge } from "@/hooks/useGauntlet";

interface GauntletResultsProps {
  challenge: GauntletChallenge;
  evaluation: EvaluationResult;
  streak: number;
  onRetry: () => void;
}

export function GauntletResults({
  challenge,
  evaluation,
  streak,
  onRetry,
}: GauntletResultsProps) {
  const navigate = useNavigate();
  const { passed, averageScore, scores, overallFeedback } = evaluation;
  const bonusXp = averageScore === 100 ? 25 : 0;
  const totalXp = passed ? challenge.xp_reward + bonusXp : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      {/* Result header */}
      <div className="text-center space-y-4">
        <div
          className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center ${
            passed
              ? "bg-green-500/20 border-2 border-green-500"
              : "bg-destructive/20 border-2 border-destructive"
          }`}
        >
          {passed ? (
            <Trophy className="h-12 w-12 text-green-500" />
          ) : (
            <XCircle className="h-12 w-12 text-destructive" />
          )}
        </div>
        <h1 className="text-3xl font-bold">
          {passed ? "Challenge Complete!" : "Challenge Failed"}
        </h1>
        <p className="text-muted-foreground text-lg">
          {passed
            ? "Great work! You've conquered today's gauntlet."
            : "Don't give up! Review the feedback and try again."}
        </p>
      </div>

      {/* Score card */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6 space-y-6">
          {/* Score */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Your Score</p>
            <div className="flex items-center justify-center gap-2">
              <span
                className={`text-6xl font-bold ${
                  passed ? "text-green-500" : "text-destructive"
                }`}
              >
                {averageScore}
              </span>
              <span className="text-2xl text-muted-foreground">/ 100</span>
            </div>
            <Progress
              value={averageScore}
              className={`h-3 mt-4 ${
                passed ? "[&>div]:bg-green-500" : "[&>div]:bg-destructive"
              }`}
            />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
            {passed && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Zap className="h-5 w-5" />
                  <span className="text-2xl font-bold">+{totalXp}</span>
                </div>
                <p className="text-sm text-muted-foreground">XP Earned</p>
              </div>
            )}
            {streak > 0 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-warning">
                  <Flame className="h-5 w-5" />
                  <span className="text-2xl font-bold">{streak}</span>
                </div>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            )}
            {averageScore === 100 && (
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-primary">
                  <Star className="h-5 w-5" />
                  <span className="text-2xl font-bold">+{bonusXp}</span>
                </div>
                <p className="text-sm text-muted-foreground">Perfect Bonus</p>
              </div>
            )}
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Feedback */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">Feedback</span>
          </div>
          <p className="text-muted-foreground">{overallFeedback}</p>

          {scores && scores.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border">
              {scores.map((score, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      score.score >= 70
                        ? "bg-green-500/20 text-green-500"
                        : "bg-destructive/20 text-destructive"
                    }`}
                  >
                    {score.score}
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    {score.feedback}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ViperCardContent>
      </ViperCard>

      {/* Actions */}
      <div className="flex gap-4">
        {!passed && (
          <ViperButton variant="outline" className="flex-1" onClick={onRetry}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </ViperButton>
        )}
        <ViperButton
          variant="default"
          className="flex-1"
          onClick={() => navigate("/")}
        >
          Continue to App
          <ArrowRight className="h-4 w-4 ml-2" />
        </ViperButton>
      </div>
    </div>
  );
}
