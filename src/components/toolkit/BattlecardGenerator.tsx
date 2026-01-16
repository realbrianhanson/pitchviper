import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePerplexityResearch, Battlecard } from '@/hooks/usePerplexityResearch';
import {
  Swords,
  Loader2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  Save,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface BattlecardGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export function BattlecardGenerator({ isOpen, onClose, onSave }: BattlecardGeneratorProps) {
  const { isLoading, generateBattlecard, saveBattlecardToToolkit } = usePerplexityResearch();
  const [competitorName, setCompetitorName] = useState('');
  const [battlecard, setBattlecard] = useState<Battlecard | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    if (!competitorName.trim()) return;
    const result = await generateBattlecard(competitorName.trim());
    if (result) {
      setBattlecard(result);
    }
  };

  const handleSave = async () => {
    if (!battlecard) return;
    setIsSaving(true);
    const success = await saveBattlecardToToolkit(battlecard);
    setIsSaving(false);
    if (success) {
      onSave?.();
      onClose();
    }
  };

  const handleClose = () => {
    setBattlecard(null);
    setCompetitorName('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Generate Battlecard
          </DialogTitle>
        </DialogHeader>

        {!battlecard ? (
          // Input Form
          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="competitor">Competitor Name</Label>
                <Input
                  id="competitor"
                  value={competitorName}
                  onChange={(e) => setCompetitorName(e.target.value)}
                  placeholder="e.g., Salesforce, HubSpot, Zendesk"
                />
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Powered by Perplexity AI</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We'll research the competitor's products, pricing, strengths, weaknesses, and recent news to create a comprehensive battlecard with talk tracks and objection handling.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isLoading || !competitorName.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Researching {competitorName}...
                </>
              ) : (
                <>
                  <Swords className="h-4 w-4 mr-2" />
                  Generate Battlecard
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This may take 30-60 seconds as we research and analyze the competitor.
            </p>
          </div>
        ) : (
          // Battlecard Results
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{battlecard.competitor_name}</h2>
                <p className="text-sm text-muted-foreground">Battlecard</p>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save to Toolkit
              </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="compete">How to Win</TabsTrigger>
                <TabsTrigger value="questions">Trap Questions</TabsTrigger>
                <TabsTrigger value="objections">Objections</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="m-0 space-y-4">
                  <ViperCard variant="glass">
                    <ViperCardContent className="p-4">
                      <p>{battlecard.overview}</p>
                    </ViperCardContent>
                  </ViperCard>

                  {/* Strengths */}
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Their Strengths
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-3">
                      {battlecard.strengths.map((item, i) => (
                        <div key={i} className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <p className="font-medium text-green-600 dark:text-green-400">{item.strength}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>How to acknowledge:</strong> {item.how_to_acknowledge}
                          </p>
                        </div>
                      ))}
                    </ViperCardContent>
                  </ViperCard>

                  {/* Weaknesses */}
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Their Weaknesses
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-3">
                      {battlecard.weaknesses.map((item, i) => (
                        <div key={i} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                          <p className="font-medium text-red-600 dark:text-red-400">{item.weakness}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>Evidence:</strong> {item.evidence}
                          </p>
                        </div>
                      ))}
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="compete" className="m-0 space-y-4">
                  {/* Differentiators */}
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base">Key Differentiators</ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-3">
                      {battlecard.differentiators.map((item, i) => (
                        <div key={i} className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="font-medium text-primary">{item.area}</p>
                          <p className="text-sm mt-1">{item.our_advantage}</p>
                        </div>
                      ))}
                    </ViperCardContent>
                  </ViperCard>

                  {/* Switching Talk Track */}
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        "We're Using {battlecard.competitor_name}" Talk Track
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent>
                      <div className="p-4 bg-muted/50 rounded-lg italic">
                        "{battlecard.switching_talk_track}"
                      </div>
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="questions" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base flex items-center gap-2">
                        <HelpCircle className="h-4 w-4 text-yellow-500" />
                        Trap Questions
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Questions that expose {battlecard.competitor_name}'s weaknesses
                      </p>
                      {battlecard.trap_questions.map((item, i) => (
                        <div key={i} className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                          <p className="font-medium text-yellow-600 dark:text-yellow-400">
                            "{item.question}"
                          </p>
                          <p className="text-sm text-muted-foreground mt-2">
                            <strong>Why it works:</strong> {item.why_it_works}
                          </p>
                        </div>
                      ))}
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="objections" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader className="pb-2">
                      <ViperCardTitle className="text-base">Objection Responses</ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-4">
                      {battlecard.objection_responses.map((item, i) => (
                        <div key={i} className="space-y-2">
                          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                              Objection: "{item.objection}"
                            </p>
                          </div>
                          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg ml-4">
                            <p className="text-sm">
                              <strong className="text-green-600 dark:text-green-400">Response:</strong> {item.response}
                            </p>
                          </div>
                        </div>
                      ))}
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>
              </ScrollArea>
            </Tabs>

            {/* Citations */}
            {battlecard.citations && battlecard.citations.length > 0 && (
              <div className="pt-4 border-t border-border mt-4">
                <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {battlecard.citations.slice(0, 5).map((citation, i) => (
                    <a
                      key={i}
                      href={citation}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-muted rounded hover:bg-muted/80 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {new URL(citation).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
