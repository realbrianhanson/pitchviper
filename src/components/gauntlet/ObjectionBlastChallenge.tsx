import { useState, useEffect, useCallback } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Send, AlertCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Objection {
  id: number;
  text: string;
  time_limit: number;
}

interface ObjectionBlastProps {
  content: Json;
  onComplete: (responses: string[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function ObjectionBlastChallenge({
  content,
  onComplete,
  onStepChange,
}: ObjectionBlastProps) {
  const parsedContent = content as unknown as { objections: Objection[]; passing_score: number };
  const objections = parsedContent.objections || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<string[]>(Array(objections.length).fill(""));
  const [currentResponse, setCurrentResponse] = useState("");
  const [timeLeft, setTimeLeft] = useState(objections[0]?.time_limit || 30);
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    onStepChange(currentIndex, objections.length);
  }, [currentIndex, objections.length, onStepChange]);

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
    const newResponses = [...responses];
    newResponses[currentIndex] = currentResponse || "(No response)";
    setResponses(newResponses);

    if (currentIndex < objections.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setCurrentResponse("");
      setTimeLeft(objections[currentIndex + 1].time_limit);
      setIsTimedOut(false);
    } else {
      onComplete(newResponses);
    }
  }, [currentIndex, currentResponse, responses, objections, onComplete]);

  useEffect(() => {
    if (isTimedOut) {
      const timer = setTimeout(handleSubmit, 500);
      return () => clearTimeout(timer);
    }
  }, [isTimedOut, handleSubmit]);

  const currentObjection = objections[currentIndex];

  if (!currentObjection) {
    return <div>No objections found</div>;
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

      {/* Objection card */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-destructive/20 shrink-0">
                <AlertCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Objection {currentIndex + 1} of {objections.length}
                </p>
                <p className="text-lg font-medium">"{currentObjection.text}"</p>
              </div>
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
          placeholder="Type your response to handle this objection..."
          className="min-h-[120px] resize-none"
          disabled={isTimedOut}
          autoFocus
        />
        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={isTimedOut}
        >
          <Send className="h-4 w-4 mr-2" />
          {currentIndex < objections.length - 1 ? "Submit & Next" : "Submit & Finish"}
        </ViperButton>
      </div>
    </div>
  );
}
