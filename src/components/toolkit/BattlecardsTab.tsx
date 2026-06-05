import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolkitItem } from "@/hooks/useToolkit";
import { BattlecardGenerator } from "./BattlecardGenerator";
import { Shield, Target, MessageSquare, HelpCircle, ChevronRight, Plus, Swords } from "lucide-react";

interface BattlecardsTabProps {
  items: ToolkitItem[];
  onRefresh?: () => void;
}

export function BattlecardsTab({ items, onRefresh }: BattlecardsTabProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>(items[0]?.id || '');
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

  const selectedCard = items.find(item => item.id === selectedCompetitor);
  const metadata = selectedCard?.metadata || {};

  // Check if this is a generated battlecard with new structure
  const isGeneratedCard = metadata.generated_at || metadata.competitor_name;

  // Parse content if it's a generated battlecard stored as JSON
  let parsedContent: any = null;
  if (isGeneratedCard && selectedCard?.content) {
    try {
      parsedContent = JSON.parse(selectedCard.content);
    } catch {
      parsedContent = null;
    }
  }

  const handleGeneratorClose = () => {
    setIsGeneratorOpen(false);
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
          <SelectTrigger className="bg-background border-border flex-1">
            <SelectValue placeholder="Select competitor" />
          </SelectTrigger>
          <SelectContent>
            {items.map(item => (
              <SelectItem key={item.id} value={item.id}>
                {item.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setIsGeneratorOpen(true)} variant="outline" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {selectedCard && parsedContent ? (
        // Generated battlecard with new structure
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Overview */}
          <p className="text-sm text-muted-foreground italic">{parsedContent.overview}</p>

          {/* Strengths */}
          {parsedContent.strengths && parsedContent.strengths.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-500">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-semibold">Their Strengths</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {parsedContent.strengths.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    <span className="font-medium">{item.strength}</span>
                    {item.how_to_acknowledge && (
                      <span className="text-xs block text-muted-foreground/70 mt-0.5">
                        → {item.how_to_acknowledge}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weaknesses */}
          {parsedContent.weaknesses && parsedContent.weaknesses.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <Target className="h-4 w-4" />
                <span className="text-sm font-semibold">Their Weaknesses</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {parsedContent.weaknesses.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-destructive shrink-0" />
                    <div>
                      <span className="font-medium">{item.weakness}</span>
                      {item.evidence && (
                        <span className="text-xs block text-muted-foreground/70">
                          Evidence: {item.evidence}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Differentiators */}
          {parsedContent.differentiators && parsedContent.differentiators.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Swords className="h-4 w-4" />
                <span className="text-sm font-semibold">Key Differentiators</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {parsedContent.differentiators.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                    <div>
                      <span className="font-medium">{item.area}:</span> {item.our_advantage}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Talk Track */}
          {parsedContent.switching_talk_track && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-semibold">Switching Talk Track</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                "{parsedContent.switching_talk_track}"
              </p>
            </div>
          )}

          {/* Trap Questions */}
          {parsedContent.trap_questions && parsedContent.trap_questions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-500">
                <HelpCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Trap Questions</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {parsedContent.trap_questions.map((item: any, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-yellow-500 shrink-0" />
                    <div>
                      <span>"{item.question}"</span>
                      {item.why_it_works && (
                        <span className="text-xs block text-muted-foreground/70">
                          Why: {item.why_it_works}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : selectedCard ? (
        // Legacy battlecard structure
        <div className="space-y-4 animate-in fade-in duration-200">
          <p className="text-sm text-muted-foreground italic">{selectedCard.content}</p>

          {metadata.weaknesses && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-destructive">
                <Target className="h-4 w-4" />
                <span className="text-sm font-semibold">Their Weaknesses</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {metadata.weaknesses.map((weakness: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-destructive shrink-0" />
                    {weakness}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metadata.our_advantages && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-success">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-semibold">Our Advantages</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {metadata.our_advantages.map((advantage: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-success shrink-0" />
                    {advantage}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {metadata.talk_track && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <MessageSquare className="h-4 w-4" />
                <span className="text-sm font-semibold">Talk Track</span>
              </div>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50">
                "{metadata.talk_track}"
              </p>
            </div>
          )}

          {metadata.trap_questions && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-secondary">
                <HelpCircle className="h-4 w-4" />
                <span className="text-sm font-semibold">Trap Questions to Ask</span>
              </div>
              <ul className="space-y-1.5 pl-6">
                {metadata.trap_questions.map((question: string, i: number) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <ChevronRight className="h-3 w-3 mt-1 text-secondary shrink-0" />
                    "{question}"
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}

      {items.length === 0 && (
        <EditorialEmpty
          eyebrow="Battlecards"
          title="No battlecards drafted"
          description="Generate your first card to capture the play."
          icon={<Swords className="h-10 w-10" strokeWidth={1.25} />}
          action={
            <Button onClick={() => setIsGeneratorOpen(true)} variant="outline" className="rounded-none font-mono text-[10px] uppercase tracking-[0.2em]">
              <Plus className="h-3.5 w-3.5 mr-2" />
              Generate Battlecard
            </Button>
          }
        />
      )}

      <BattlecardGenerator
        isOpen={isGeneratorOpen}
        onClose={handleGeneratorClose}
        onSave={onRefresh}
      />
    </div>
  );
}
