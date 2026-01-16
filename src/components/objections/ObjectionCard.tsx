import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { Objection, ObjectionCategory, ObjectionDifficulty, ResponseApproach } from "@/hooks/useObjections";
import { 
  ChevronDown, 
  ChevronUp, 
  Star, 
  MessageSquare, 
  Copy, 
  ThumbsUp, 
  ThumbsDown,
  Target,
  Volume2,
  Brain,
  Lightbulb,
  HelpCircle,
  Users,
  ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ObjectionCardProps {
  objection: Objection;
  onVote: (responseId: string, isUpvote: boolean) => void;
  onCopy: (text: string) => void;
  onPractice: (objectionId: string) => void;
  onAddResponse: (objectionId: string) => void;
}

const categoryLabels: Record<ObjectionCategory, string> = {
  price: 'Price/Budget',
  timing: 'Timing',
  competition: 'Competition',
  authority: 'Authority',
  need: 'Need/Interest',
  trust: 'Trust',
  stall: 'Stall'
};

const categoryColors: Record<ObjectionCategory, string> = {
  price: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  timing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  competition: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  authority: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  need: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  trust: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  stall: 'bg-slate-500/20 text-slate-400 border-slate-500/30'
};

const difficultyColors: Record<ObjectionDifficulty, string> = {
  easy: 'bg-success/20 text-success border-success/30',
  medium: 'bg-warning/20 text-warning border-warning/30',
  hard: 'bg-destructive/20 text-destructive border-destructive/30'
};

const approachIcons: Record<ResponseApproach, React.ReactNode> = {
  empathy: <Brain className="h-3 w-3" />,
  logic: <Lightbulb className="h-3 w-3" />,
  redirect: <ArrowRight className="h-3 w-3" />,
  question: <HelpCircle className="h-3 w-3" />,
  social_proof: <Users className="h-3 w-3" />
};

const approachLabels: Record<ResponseApproach, string> = {
  empathy: 'Empathy',
  logic: 'Logic',
  redirect: 'Redirect',
  question: 'Question',
  social_proof: 'Social Proof'
};

const approachColors: Record<ResponseApproach, string> = {
  empathy: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  logic: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  redirect: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  question: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  social_proof: 'bg-green-500/20 text-green-400 border-green-500/30'
};

export function ObjectionCard({
  objection,
  onVote,
  onCopy,
  onPractice,
  onAddResponse
}: ObjectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Response copied to clipboard!');
    onCopy(text);
  };

  const successRate = (response: { times_used: number; times_successful: number }) => {
    if (response.times_used === 0) return null;
    return Math.round((response.times_successful / response.times_used) * 100);
  };

  return (
    <ViperCard 
      variant="glass" 
      className={cn(
        "transition-all duration-300 cursor-pointer group",
        isExpanded && "ring-1 ring-primary/30"
      )}
    >
      {/* Collapsed View */}
      <ViperCardContent 
        className="p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium text-lg leading-relaxed">
              "{objection.objection_text}"
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge 
                variant="outline" 
                className={cn("text-xs", categoryColors[objection.category])}
              >
                {categoryLabels[objection.category]}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn("text-xs capitalize", difficultyColors[objection.difficulty])}
              >
                {objection.difficulty}
              </Badge>
              <div className="flex items-center gap-1 text-muted-foreground text-sm">
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{objection.responses.length} responses</span>
              </div>
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                <Star className="h-3.5 w-3.5 fill-current" />
                <span>{objection.average_rating.toFixed(1)}</span>
              </div>
              <div className="text-muted-foreground text-sm">
                {objection.usage_count} uses
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0">
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </Button>
        </div>
      </ViperCardContent>

      {/* Expanded View */}
      {isExpanded && (
        <div className="border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Context Section */}
          {objection.context && (
            <div className="px-4 py-3 bg-muted/30 border-b border-border/50">
              <h4 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Why prospects say this
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {objection.context}
              </p>
            </div>
          )}

          {/* Responses Section */}
          <div className="p-4 space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Battle-Tested Responses
            </h4>

            {objection.responses.map((response, index) => (
              <div 
                key={response.id} 
                className="bg-background/50 rounded-lg p-4 border border-border/50 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-foreground leading-relaxed flex-1">
                    {response.response_text}
                  </p>
                  <Badge 
                    variant="outline" 
                    className={cn("shrink-0 text-xs", approachColors[response.approach])}
                  >
                    {approachIcons[response.approach]}
                    <span className="ml-1">{approachLabels[response.approach]}</span>
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/30">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {successRate(response) !== null && (
                      <span className="text-success">
                        {successRate(response)}% success rate
                      </span>
                    )}
                    <span>{response.times_used} uses</span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote(response.id, true);
                      }}
                    >
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      <span className="text-xs">{response.upvotes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVote(response.id, false);
                      }}
                    >
                      <ThumbsDown className="h-4 w-4 mr-1" />
                      <span className="text-xs">{response.downvotes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(response.response_text);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-secondary"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPractice(objection.id);
                      }}
                    >
                      <Target className="h-4 w-4 mr-1" />
                      <span className="text-xs">Practice</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Audio Examples Placeholder */}
            <div className="bg-muted/20 rounded-lg p-4 border border-dashed border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Volume2 className="h-4 w-4" />
                <span className="text-sm">Audio Examples coming soon</span>
              </div>
            </div>

            {/* Add Response Button */}
            <Button 
              variant="outline" 
              className="w-full border-dashed"
              onClick={(e) => {
                e.stopPropagation();
                onAddResponse(objection.id);
              }}
            >
              Add Your Response
            </Button>
          </div>
        </div>
      )}
    </ViperCard>
  );
}
