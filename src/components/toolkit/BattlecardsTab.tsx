import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ToolkitItem } from "@/hooks/useToolkit";
import { Shield, Target, MessageSquare, HelpCircle, ChevronRight } from "lucide-react";

interface BattlecardsTabProps {
  items: ToolkitItem[];
}

export function BattlecardsTab({ items }: BattlecardsTabProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>(items[0]?.id || '');

  const selectedCard = items.find(item => item.id === selectedCompetitor);
  const metadata = selectedCard?.metadata || {};

  return (
    <div className="space-y-4">
      <Select value={selectedCompetitor} onValueChange={setSelectedCompetitor}>
        <SelectTrigger className="bg-background border-border">
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

      {selectedCard && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Description */}
          <p className="text-sm text-muted-foreground italic">{selectedCard.content}</p>

          {/* Their Weaknesses */}
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

          {/* Our Advantages */}
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

          {/* Talk Track */}
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

          {/* Trap Questions */}
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
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No battlecards found</p>
        </div>
      )}
    </div>
  );
}
