import { useState, useEffect } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Send, HelpCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
}

interface CompetitorQuizProps {
  content: Json;
  onComplete: (responses: number[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function CompetitorQuizChallenge({
  content,
  onComplete,
  onStepChange,
}: CompetitorQuizProps) {
  const parsedContent = content as unknown as {
    questions: Question[];
    passing_score: number;
  };
  const questions = parsedContent.questions || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(questions.length).fill(-1));
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");

  useEffect(() => {
    onStepChange(currentIndex, questions.length);
  }, [currentIndex, questions.length, onStepChange]);

  const handleSubmit = () => {
    const newAnswers = [...answers];
    newAnswers[currentIndex] = parseInt(selectedAnswer);
    setAnswers(newAnswers);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer("");
    } else {
      onComplete(newAnswers);
    }
  };

  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return <div>No questions found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Question card */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/20 shrink-0">
                <HelpCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Question {currentIndex + 1} of {questions.length}
                </p>
                <p className="text-lg font-medium">{currentQuestion.question}</p>
              </div>
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Options */}
      <div className="space-y-4">
        <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
          {currentQuestion.options.map((option, idx) => (
            <div
              key={idx}
              className={`flex items-center space-x-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedAnswer === String(idx)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => setSelectedAnswer(String(idx))}
            >
              <RadioGroupItem value={String(idx)} id={`option-${idx}`} />
              <Label
                htmlFor={`option-${idx}`}
                className="flex-1 cursor-pointer text-sm"
              >
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={selectedAnswer === ""}
        >
          <Send className="h-4 w-4 mr-2" />
          {currentIndex < questions.length - 1 ? "Submit & Next" : "Submit & Finish"}
        </ViperButton>
      </div>
    </div>
  );
}
