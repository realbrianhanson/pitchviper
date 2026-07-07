import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Trophy,
  XCircle,
  TrendingUp,
  CheckCircle2,
  Zap,
  Lightbulb,
  ChevronDown,
  RotateCcw,
  Gamepad2,
  Star,
  Sparkles,
  User,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fireConfetti, BRAND_CONFETTI_VICTORY } from "@/lib/confetti";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ScoreCategory {
  name: string;
  score: number;
  feedback: string;
}

interface KeyMoment {
  type: "highlight" | "missed_opportunity";
  description: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

interface AnalysisResult {
  outcome: "won" | "lost" | "progress";
  overall_score: number;
  categories: ScoreCategory[];
  strengths: string[];
  improvements: string[];
  key_moment: KeyMoment;
  xp_earned: number;
  is_new_best: boolean;
  is_first_completion: boolean;
  previous_best: number | null;
}

interface RoleplayResultsProps {
  analysis: AnalysisResult;
  scenarioId: string;
  scenarioName: string;
  transcript: Message[];
}

export function RoleplayResults({
  analysis,
  scenarioId,
  scenarioName,
  transcript,
}: RoleplayResultsProps) {
  const navigate = useNavigate();
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showXp, setShowXp] = useState(false);
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  // Animate score and trigger celebrations
  useEffect(() => {
    // Animate score counting up
    const duration = 1500;
    const steps = 60;
    const increment = analysis.overall_score / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= analysis.overall_score) {
        setAnimatedScore(analysis.overall_score);
        clearInterval(timer);
        
        // Show XP after score animation
        setTimeout(() => setShowXp(true), 300);
        
        // Confetti for high scores
        if (analysis.overall_score >= 90 || analysis.outcome === "won") {
          fireConfetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.5 },
            colors: BRAND_CONFETTI_VICTORY,
          });
        }
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [analysis.overall_score, analysis.outcome]);

  const getOutcomeConfig = () => {
    switch (analysis.outcome) {
      case "won":
        return {
          icon: Trophy,
          title: "CLOSED!",
          subtitle: "You sealed the deal! 🎉",
          color: "text-success",
          bgColor: "bg-success/20",
          borderColor: "border-success/30",
        };
      case "progress":
        return {
          icon: TrendingUp,
          title: "PROGRESS MADE",
          subtitle: "You moved them forward",
          color: "text-warning",
          bgColor: "bg-warning/20",
          borderColor: "border-warning/30",
        };
      case "lost":
        return {
          icon: XCircle,
          title: "NOT THIS TIME",
          subtitle: "Learn and come back stronger 💪",
          color: "text-destructive",
          bgColor: "bg-destructive/20",
          borderColor: "border-destructive/30",
        };
    }
  };

  const outcomeConfig = getOutcomeConfig();
  const OutcomeIcon = outcomeConfig.icon;

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-success";
    if (score >= 60) return "bg-warning";
    return "bg-destructive";
  };

  return (
    <div className="min-h-screen bg-background p-6 overflow-auto">
      <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
        {/* Outcome Banner */}
        <div
          className={cn(
            "text-center p-8 rounded-2xl border",
            outcomeConfig.bgColor,
            outcomeConfig.borderColor
          )}
        >
          <OutcomeIcon className={cn("h-16 w-16 mx-auto mb-4", outcomeConfig.color)} />
          <h1 className={cn("text-4xl font-black mb-2", outcomeConfig.color)}>
            {outcomeConfig.title}
          </h1>
          <p className="text-muted-foreground text-lg">{outcomeConfig.subtitle}</p>
          
          {/* Badges */}
          <div className="flex justify-center gap-3 mt-4">
            {analysis.is_first_completion && (
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full border border-primary/30">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-sm">First Completion!</span>
              </div>
            )}
            {analysis.is_new_best && !analysis.is_first_completion && (
              <div className="inline-flex items-center gap-2 bg-warning/20 text-warning px-4 py-2 rounded-full border border-warning/30">
                <Star className="h-4 w-4" />
                <span className="font-semibold text-sm">New Personal Best!</span>
              </div>
            )}
          </div>
        </div>

        {/* Score Circle & XP */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Overall Score */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 text-center">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Overall Score
            </h3>
            <div className="relative w-40 h-40 mx-auto">
              {/* Background circle */}
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  className="text-muted/20"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(animatedScore / 100) * 440} 440`}
                  className={cn(
                    "transition-all duration-100",
                    animatedScore >= 80 ? "text-success" :
                    animatedScore >= 60 ? "text-warning" : "text-destructive"
                  )}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-5xl font-black text-foreground">{animatedScore}</span>
              </div>
            </div>
            {analysis.previous_best && (
              <p className="text-sm text-muted-foreground mt-4">
                Previous best: {analysis.previous_best}%
              </p>
            )}
          </div>

          {/* XP Earned */}
          <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6 text-center">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              XP Earned
            </h3>
            <div className={cn(
              "transition-all duration-500",
              showXp ? "opacity-100 scale-100" : "opacity-0 scale-90"
            )}>
              <div className="flex items-center justify-center gap-3">
                <Zap className="h-12 w-12 text-warning" />
                <span className="text-6xl font-black text-warning">+{analysis.xp_earned}</span>
              </div>
              <p className="text-muted-foreground mt-4">Added to your profile</p>
            </div>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Score Breakdown</h3>
          <div className="space-y-4">
            {analysis.categories.map((category, idx) => (
              <div key={idx}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-foreground">{category.name}</span>
                  <span className={cn(
                    "text-sm font-bold",
                    category.score >= 80 ? "text-success" :
                    category.score >= 60 ? "text-warning" : "text-destructive"
                  )}>
                    {category.score}%
                  </span>
                </div>
                <Progress
                  value={category.score}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground mt-1">{category.feedback}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div className="bg-success/5 rounded-2xl border border-success/20 p-6">
            <h3 className="text-lg font-semibold text-success flex items-center gap-2 mb-4">
              <CheckCircle2 className="h-5 w-5" />
              What You Crushed
            </h3>
            <ul className="space-y-3">
              {analysis.strengths.map((strength, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground/80">
                  <span className="text-success mt-1">✓</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5" />
              Level Up These Skills
            </h3>
            <ul className="space-y-3">
              {analysis.improvements.map((improvement, idx) => (
                <li key={idx} className="flex items-start gap-2 text-foreground/80">
                  <span className="text-primary mt-1">⚡</span>
                  {improvement}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Key Moment */}
        <div className={cn(
          "rounded-2xl border p-6",
          analysis.key_moment.type === "highlight"
            ? "bg-warning/5 border-warning/20"
            : "bg-secondary/5 border-secondary/20"
        )}>
          <h3 className={cn(
            "text-lg font-semibold flex items-center gap-2 mb-3",
            analysis.key_moment.type === "highlight" ? "text-warning" : "text-secondary"
          )}>
            <Lightbulb className="h-5 w-5" />
            {analysis.key_moment.type === "highlight" ? "Killer Moment" : "Missed Opportunity"}
          </h3>
          <p className="text-foreground/80">{analysis.key_moment.description}</p>
        </div>

        {/* Transcript */}
        <Collapsible open={transcriptOpen} onOpenChange={setTranscriptOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Review Transcript</span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                transcriptOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-96 rounded-lg border border-border/50 p-4 mt-2">
              <div className="space-y-4">
                {transcript.map((message, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        message.role === "user" ? "bg-primary/20" : "bg-muted"
                      )}>
                        {message.role === "user" ? (
                          <User className="h-4 w-4 text-primary" />
                        ) : (
                          <Bot className="h-4 w-4 text-muted-foreground" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-4 py-2",
                        message.role === "user"
                          ? "bg-primary/10 text-foreground"
                          : "bg-muted"
                      )}
                    >
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            variant="outline"
            className="gap-2"
            onClick={() => navigate(`/roleplay/${scenarioId}`)}
          >
            <RotateCcw className="h-4 w-4" />
            Try Again
          </Button>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => navigate("/roleplay")}
          >
            <Gamepad2 className="h-4 w-4" />
            New Scenario
          </Button>
        </div>
      </div>
    </div>
  );
}
