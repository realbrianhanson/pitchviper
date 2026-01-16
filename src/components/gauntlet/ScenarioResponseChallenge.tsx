import { useState, useEffect } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Textarea } from "@/components/ui/textarea";
import { Send, MessageSquare, User } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Scenario {
  id: number;
  prospect_says: string;
  context: string;
}

interface ScenarioResponseProps {
  content: Json;
  onComplete: (responses: string[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function ScenarioResponseChallenge({
  content,
  onComplete,
  onStepChange,
}: ScenarioResponseProps) {
  const parsedContent = content as unknown as {
    scenarios: Scenario[];
    passing_score: number;
  };
  const scenarios = parsedContent.scenarios || [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(Array(scenarios.length).fill(""));
  const [currentResponse, setCurrentResponse] = useState("");

  useEffect(() => {
    onStepChange(currentIndex, scenarios.length);
  }, [currentIndex, scenarios.length, onStepChange]);

  const handleSubmit = () => {
    const newResponses = [...responses];
    newResponses[currentIndex] = currentResponse || "(No response)";
    setResponses(newResponses);

    if (currentIndex < scenarios.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentResponse("");
    } else {
      onComplete(newResponses);
    }
  };

  const currentScenario = scenarios[currentIndex];

  if (!currentScenario) {
    return <div>No scenarios found</div>;
  }

  return (
    <div className="space-y-6">
      {/* Scenario card */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6 space-y-4">
          {/* Context */}
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-muted shrink-0">
              <MessageSquare className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">
                Scenario {currentIndex + 1} of {scenarios.length}
              </p>
              <p className="text-sm text-muted-foreground">{currentScenario.context}</p>
            </div>
          </div>

          {/* Prospect says */}
          <div className="flex items-start gap-3 bg-muted/50 rounded-lg p-4">
            <div className="p-2 rounded-full bg-primary/20 shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Prospect says:</p>
              <p className="text-lg italic">"{currentScenario.prospect_says}"</p>
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Response area */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-muted-foreground">
          Your Response:
        </label>
        <Textarea
          value={currentResponse}
          onChange={(e) => setCurrentResponse(e.target.value)}
          placeholder="How would you respond to this..."
          className="min-h-[120px] resize-none"
          autoFocus
        />
        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={!currentResponse.trim()}
        >
          <Send className="h-4 w-4 mr-2" />
          {currentIndex < scenarios.length - 1 ? "Submit & Next" : "Submit & Finish"}
        </ViperButton>
      </div>
    </div>
  );
}
