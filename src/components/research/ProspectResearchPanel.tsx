import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useProspectResearch, ResearchData } from '@/hooks/useProspectResearch';
import { DeepDivePanel } from './DeepDivePanel';
import {
  Building2,
  Globe,
  User,
  Linkedin,
  Search,
  Loader2,
  Copy,
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Target,
  Lightbulb,
  UserCircle,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProspectResearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialCompanyName?: string;
  initialCompanyUrl?: string;
  initialContactName?: string;
  onSaveToContact?: (research: ResearchData) => void;
}

export function ProspectResearchPanel({
  isOpen,
  onClose,
  initialCompanyName = '',
  initialCompanyUrl = '',
  initialContactName = '',
  onSaveToContact,
}: ProspectResearchPanelProps) {
  const {
    isLoading,
    researchProspect,
    copyToClipboard,
  } = useProspectResearch();

  const [companyName, setCompanyName] = useState(initialCompanyName);
  const [companyUrl, setCompanyUrl] = useState(initialCompanyUrl);
  const [contactName, setContactName] = useState(initialContactName);
  const [contactLinkedIn, setContactLinkedIn] = useState('');
  const [researchData, setResearchData] = useState<ResearchData | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleResearch = async (forceRefresh = false) => {
    if (!companyName.trim()) return;

    const data = await researchProspect(
      companyName.trim(),
      companyUrl.trim() || undefined,
      contactName.trim() || undefined,
      contactLinkedIn.trim() || undefined,
      forceRefresh
    );

    if (data) {
      setResearchData(data);
      setHasSearched(true);
    }
  };

  const handleClose = () => {
    setResearchData(null);
    setHasSearched(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Prospect Research
          </DialogTitle>
        </DialogHeader>

        {!researchData ? (
          // Input Form
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company-name" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company Name *
                </Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corporation"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company-url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Company Website
                </Label>
                <Input
                  id="company-url"
                  value={companyUrl}
                  onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://acme.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Name
                </Label>
                <Input
                  id="contact-name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="John Smith"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact-linkedin" className="flex items-center gap-2">
                  <Linkedin className="h-4 w-4" />
                  Contact LinkedIn
                </Label>
                <Input
                  id="contact-linkedin"
                  value={contactLinkedIn}
                  onChange={(e) => setContactLinkedIn(e.target.value)}
                  placeholder="https://linkedin.com/in/johnsmith"
                />
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tip:</strong> Providing a company website URL will enable us to scrape current information about the company for more accurate insights.
              </p>
            </div>

            <Button
              onClick={() => handleResearch()}
              disabled={isLoading || !companyName.trim()}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Researching {companyName}...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Research Prospect
                </>
              )}
            </Button>
          </div>
        ) : (
          // Research Results
          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{researchData.companyOverview.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {researchData.companyOverview.industry}
                  {researchData.companyOverview.location && ` • ${researchData.companyOverview.location}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleResearch(true)}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                  Refresh
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(researchData)}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                {onSaveToContact && (
                  <Button
                    size="sm"
                    onClick={() => onSaveToContact(researchData)}
                  >
                    Save to Contact
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid grid-cols-6 w-full">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
                <TabsTrigger value="pains">Pain Points</TabsTrigger>
                <TabsTrigger value="talking">Talking Points</TabsTrigger>
                <TabsTrigger value="contact" disabled={!researchData.contactIntel}>Contact</TabsTrigger>
                <TabsTrigger value="deepdive" className="flex items-center gap-1">
                  <Sparkles className="h-3 w-3" />
                  Deep Dive
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                <TabsContent value="overview" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader>
                      <ViperCardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        Company Overview
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Industry</p>
                          <p className="font-medium">{researchData.companyOverview.industry}</p>
                        </div>
                        {researchData.companyOverview.size && (
                          <div>
                            <p className="text-sm text-muted-foreground">Company Size</p>
                            <p className="font-medium">{researchData.companyOverview.size}</p>
                          </div>
                        )}
                        {researchData.companyOverview.location && (
                          <div>
                            <p className="text-sm text-muted-foreground">Location</p>
                            <p className="font-medium">{researchData.companyOverview.location}</p>
                          </div>
                        )}
                        {companyUrl && (
                          <div>
                            <p className="text-sm text-muted-foreground">Website</p>
                            <a 
                              href={companyUrl.startsWith('http') ? companyUrl : `https://${companyUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-primary hover:underline flex items-center gap-1"
                            >
                              {companyUrl}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      {researchData.companyOverview.recentNews && researchData.companyOverview.recentNews.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Recent News</p>
                          <ul className="space-y-1">
                            {researchData.companyOverview.recentNews.map((news, i) => (
                              <li key={i} className="text-sm flex items-start gap-2">
                                <span className="text-primary">•</span>
                                {news}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="business" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader>
                      <ViperCardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        What They Do
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Description</p>
                        <p>{researchData.whatTheyDo.description}</p>
                      </div>

                      {researchData.whatTheyDo.products && researchData.whatTheyDo.products.length > 0 && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-2">Products & Services</p>
                          <div className="flex flex-wrap gap-2">
                            {researchData.whatTheyDo.products.map((product, i) => (
                              <span key={i} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                                {product}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {researchData.whatTheyDo.targetMarket && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Target Market</p>
                          <p>{researchData.whatTheyDo.targetMarket}</p>
                        </div>
                      )}
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="pains" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader>
                      <ViperCardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        Potential Pain Points
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Companies like this often struggle with...
                      </p>
                      <div className="space-y-3">
                        {researchData.painPoints.map((painPoint, i) => (
                          <div key={i} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="font-medium text-yellow-600 dark:text-yellow-400">
                              {painPoint.pain}
                            </p>
                            {painPoint.implication && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {painPoint.implication}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="talking" className="m-0">
                  <ViperCard variant="glass">
                    <ViperCardHeader>
                      <ViperCardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-green-500" />
                        Talking Points
                      </ViperCardTitle>
                    </ViperCardHeader>
                    <ViperCardContent>
                      <p className="text-sm text-muted-foreground mb-4">
                        Personalized conversation starters for this prospect
                      </p>
                      <div className="space-y-4">
                        {researchData.talkingPoints.map((point, i) => (
                          <div key={i} className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Lightbulb className="h-4 w-4 text-green-500" />
                              <span className="font-medium text-green-600 dark:text-green-400">
                                {point.topic}
                              </span>
                            </div>
                            <p className="text-sm italic mb-2">"{point.opener}"</p>
                            {point.context && (
                              <p className="text-xs text-muted-foreground">{point.context}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </ViperCardContent>
                  </ViperCard>
                </TabsContent>

                <TabsContent value="contact" className="m-0">
                  {researchData.contactIntel && (
                    <ViperCard variant="glass">
                      <ViperCardHeader>
                        <ViperCardTitle className="flex items-center gap-2">
                          <UserCircle className="h-5 w-5 text-primary" />
                          Contact Intel: {contactName}
                        </ViperCardTitle>
                      </ViperCardHeader>
                      <ViperCardContent className="space-y-4">
                        {researchData.contactIntel.role && (
                          <div>
                            <p className="text-sm text-muted-foreground">Role Insights</p>
                            <p className="font-medium">{researchData.contactIntel.role}</p>
                          </div>
                        )}

                        {researchData.contactIntel.priorities && researchData.contactIntel.priorities.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Likely Priorities</p>
                            <ul className="space-y-1">
                              {researchData.contactIntel.priorities.map((priority, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {priority}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {researchData.contactIntel.communicationStyle && (
                          <div>
                            <p className="text-sm text-muted-foreground">Communication Style</p>
                            <p>{researchData.contactIntel.communicationStyle}</p>
                          </div>
                        )}

                        {researchData.contactIntel.tips && researchData.contactIntel.tips.length > 0 && (
                          <div>
                            <p className="text-sm text-muted-foreground mb-2">Tips</p>
                            <ul className="space-y-1">
                              {researchData.contactIntel.tips.map((tip, i) => (
                                <li key={i} className="text-sm flex items-start gap-2">
                                  <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                                  {tip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </ViperCardContent>
                    </ViperCard>
                  )}
                </TabsContent>

                <TabsContent value="deepdive" className="m-0">
                  <DeepDivePanel
                    companyName={companyName}
                    industry={researchData.companyOverview.industry}
                    contactName={contactName}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
