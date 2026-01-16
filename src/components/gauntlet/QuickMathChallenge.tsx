import { useState, useEffect, useCallback } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Input } from "@/components/ui/input";
import { Clock, Send, Calculator } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Problem {
  id: number;
  question: string;
  answer: number;
  time_limit: number;
}

interface QuickMathProps {
  content: Json;
  onComplete: (responses: number[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function QuickMathChallenge({
  content,
  onComplete,
  onStepChange,
}: QuickMathProps) {
  const parsedContent = content as unknown as {
    problems: Problem[];
    passing_score: number;
  };
  const problems = parsedContent.problems || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(problems.length).fill(0));
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(problems[0]?.time_limit || 60);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    onStepChange(currentIndex, problems.length);
  }, [currentIndex, problems.length, onStepChange]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setIsTimedOut(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((t) => t - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmit = useCallback(() => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = parseFloat(currentAnswer) || 0;
    setAnswers(newAnswers);

    if (currentIndex < problems.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentAnswer("");
      setTimeLeft(problems[currentIndex + 1].time_limit);
      setIsTimedOut(false);
    } else {
      onComplete(newAnswers);
    }
  }, [currentIndex, currentAnswer, answers, problems, onComplete]);

  useEffect(() => {
    if (isTimedOut) {
      const timer = setTimeout(handleSubmit, 500);
      return () => clearTimeout(timer);
    }
  }, [isTimedOut, handleSubmit]);

  const currentProblem = problems[currentIndex];

  if (!currentProblem) {
    return <div>No problems found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className="flex justify-center">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-full ${
            timeLeft <= 10
              ? "bg-destructive/20 text-destructive animate-pulse"
              : "bg-muted"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span className="font-mono font-bold text-xl">{timeLeft}s</span>
        </div>
      </div>

      {/* Problem card */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Problem {currentIndex + 1} of {problems.length}
                </p>
                <p className="text-lg">{currentProblem.question}</p>
              </div>
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Answer area */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-muted-foreground">
          Your Answer:
        </label>
        <Input
          type="number"
          value={currentAnswer}
          onChange={(e) => setCurrentAnswer(e.target.value)}
          placeholder="Enter your answer..."
          className="text-xl text-center font-mono"
          disabled={isTimedOut}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={isTimedOut}
        >
          <Send className="h-4 w-4 mr-2" />
          {currentIndex < problems.length - 1 ? "Submit & Next" : "Submit & Finish"}
        </ViperButton>
      </div>
    </div>
  );
}
