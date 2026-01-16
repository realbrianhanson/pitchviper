import { useState, useEffect } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, User, Building, CheckCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface DiscoveryQuestionsProps {
  content: Json;
  onComplete: (responses: string[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function DiscoveryQuestionsChallenge({
  content,
  onComplete,
  onStepChange,
}: DiscoveryQuestionsProps) {
  const parsedContent = content as {
    prospect_scenario: string;
    prospect_role: string;
    num_questions: number;
    evaluation_criteria: string[];
    passing_score: number;
  };

  const numQuestions = parsedContent.num_questions || 5;
  const [questions, setQuestions] = useState<string[]>(Array(numQuestions).fill(""));
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const completedCount = questions.filter((q) => q.trim()).length;
    onStepChange(completedCount, numQuestions);
  }, [questions, numQuestions, onStepChange]);

  const handleQuestionChange = (index: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[index] = value;
    setQuestions(newQuestions);
  };

  const handleAddQuestion = () => {
    if (questions[currentIndex].trim() && currentIndex < numQuestions - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = () => {
    onComplete(questions.filter((q) => q.trim()));
  };

  const completedCount = questions.filter((q) => q.trim()).length;
  const canSubmit = completedCount >= numQuestions;

  return (
    <div className="space-y-6">
      {/* Scenario */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <Building className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Prospect Scenario</p>
              <p className="text-foreground">{parsedContent.prospect_scenario}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">You're Speaking With</p>
              <p className="font-medium">{parsedContent.prospect_role}</p>
            </div>
          </div>
          <div className="pt-2">
            <p className="text-sm text-muted-foreground mb-2">Questions should be:</p>
            <div className="flex flex-wrap gap-2">
              {parsedContent.evaluation_criteria?.map((criteria, idx) => (
                <Badge key={idx} variant="secondary">
                  {criteria}
                </Badge>
              ))}
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Questions */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-muted-foreground">
            Your Discovery Questions:
          </label>
          <span className="text-sm text-muted-foreground">
            {completedCount} / {numQuestions}
          </span>
        </div>

        {questions.map((question, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground w-6">{index + 1}.</span>
            <Input
              value={question}
              onChange={(e) => handleQuestionChange(index, e.target.value)}
              placeholder={`Question ${index + 1}...`}
              className={index > currentIndex ? "opacity-50" : ""}
              disabled={index > currentIndex}
              onKeyDown={(e) => {
                if (e.key === "Enter" && question.trim()) {
                  handleAddQuestion();
                }
              }}
              autoFocus={index === currentIndex}
            />
            {question.trim() && (
              <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            )}
          </div>
        ))}

        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit Questions
        </ViperButton>
      </div>
    </div>
  );
}
