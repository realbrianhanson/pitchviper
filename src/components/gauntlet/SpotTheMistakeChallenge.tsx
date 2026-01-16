import { useState, useEffect } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, FileText, AlertCircle } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface Mistake {
  id: number;
  text: string;
  location: string;
}

interface SpotTheMistakeProps {
  content: Json;
  onComplete: (responses: number[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function SpotTheMistakeChallenge({
  content,
  onComplete,
  onStepChange,
}: SpotTheMistakeProps) {
  const parsedContent = content as unknown as {
    transcript: string;
    mistakes: Mistake[];
    decoy_options: string[];
  };

  const mistakes = parsedContent.mistakes || [];
  const decoys = parsedContent.decoy_options || [];
  
  // Combine mistakes and decoys for display
  const allOptions = [
    ...mistakes.map((m) => ({ ...m, isReal: true })),
    ...decoys.map((d, i) => ({ id: 100 + i, text: d, location: "", isReal: false })),
  ].sort(() => Math.random() - 0.5);

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    onStepChange(selectedIds.length, mistakes.length);
  }, [selectedIds.length, mistakes.length, onStepChange]);

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    // Return only the IDs of real mistakes that were selected
    const correctSelections = selectedIds.filter((id) => id < 100);
    onComplete(correctSelections);
  };

  return (
    <div className="space-y-6">
      {/* Transcript */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 rounded-lg bg-primary/20 shrink-0">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Call Transcript</p>
              <p className="text-sm font-medium">Find the sales mistakes in this conversation</p>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 max-h-[250px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
              {parsedContent.transcript}
            </pre>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="font-medium">Select all the mistakes you spotted:</span>
        </div>

        <div className="space-y-3">
          {allOptions.map((option) => (
            <div
              key={option.id}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                selectedIds.includes(option.id)
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50"
              }`}
              onClick={() => toggleSelection(option.id)}
            >
              <Checkbox
                checked={selectedIds.includes(option.id)}
                onCheckedChange={() => toggleSelection(option.id)}
                className="mt-0.5"
              />
              <span className="text-sm">{option.text}</span>
            </div>
          ))}
        </div>

        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={selectedIds.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit Answers ({selectedIds.length} selected)
        </ViperButton>
      </div>
    </div>
  );
}
