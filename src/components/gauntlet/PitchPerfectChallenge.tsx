import { useState, useEffect } from "react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Target, Package, Lightbulb } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

interface PitchPerfectProps {
  content: Json;
  onComplete: (responses: string[]) => void;
  onStepChange: (step: number, total: number) => void;
}

export function PitchPerfectChallenge({
  content,
  onComplete,
  onStepChange,
}: PitchPerfectProps) {
  const parsedContent = content as {
    scenario: string;
    product: string;
    key_elements: string[];
    passing_score: number;
  };

  const [pitch, setPitch] = useState("");

  useEffect(() => {
    onStepChange(0, 1);
  }, [onStepChange]);

  const handleSubmit = () => {
    onComplete([pitch]);
  };

  return (
    <div className="space-y-6">
      {/* Scenario */}
      <ViperCard variant="glass">
        <ViperCardContent className="pt-6 space-y-6">
          {/* Scenario */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Target className="h-5 w-5" />
              <span className="font-semibold">Scenario</span>
            </div>
            <p className="text-muted-foreground">{parsedContent.scenario}</p>
          </div>

          {/* Product */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Package className="h-5 w-5" />
              <span className="font-semibold">Product</span>
            </div>
            <p className="text-muted-foreground">{parsedContent.product}</p>
          </div>

          {/* Key elements */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Lightbulb className="h-5 w-5" />
              <span className="font-semibold">Include These Elements</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {parsedContent.key_elements?.map((element, idx) => (
                <Badge key={idx} variant="secondary">
                  {element}
                </Badge>
              ))}
            </div>
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Pitch area */}
      <div className="space-y-4">
        <label className="text-sm font-medium text-muted-foreground">
          Your Pitch:
        </label>
        <Textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Craft your compelling pitch for this prospect..."
          className="min-h-[200px] resize-none"
          autoFocus
        />
        <ViperButton
          variant="default"
          className="w-full"
          onClick={handleSubmit}
          disabled={!pitch.trim()}
        >
          <Send className="h-4 w-4 mr-2" />
          Submit Pitch
        </ViperButton>
      </div>
    </div>
  );
}
