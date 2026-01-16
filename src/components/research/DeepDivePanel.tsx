import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePerplexityResearch, DeepDiveType, DeepDiveResult } from '@/hooks/usePerplexityResearch';
import {
  TrendingUp,
  Users,
  Newspaper,
  UserCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface DeepDivePanelProps {
  companyName?: string;
  industry?: string;
  contactName?: string;
}

const DEEP_DIVE_OPTIONS: Array<{
  type: DeepDiveType;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  requiresCompany?: boolean;
  requiresContact?: boolean;
}> = [
  {
    type: 'industry_trends',
    label: 'Industry Trends',
    description: 'Current trends, challenges, and opportunities',
    icon: TrendingUp,
    color: 'text-blue-500',
  },
  {
    type: 'competitive_landscape',
    label: 'Competitive Landscape',
    description: 'Competitors, market position, differentiators',
    icon: Users,
    color: 'text-purple-500',
    requiresCompany: true,
  },
  {
    type: 'recent_news',
    label: 'Recent News',
    description: 'Last 30 days of news and announcements',
    icon: Newspaper,
    color: 'text-orange-500',
    requiresCompany: true,
  },
  {
    type: 'decision_maker_intel',
    label: 'Decision Maker Intel',
    description: 'Public information about the contact',
    icon: UserCircle,
    color: 'text-green-500',
    requiresCompany: true,
    requiresContact: true,
  },
];

export function DeepDivePanel({ companyName, industry, contactName }: DeepDivePanelProps) {
  const { isLoading, deepDiveResult, deepDive, setDeepDiveResult } = usePerplexityResearch();
  const [activeType, setActiveType] = useState<DeepDiveType | null>(null);

  const handleDeepDive = async (type: DeepDiveType, forceRefresh = false) => {
    setActiveType(type);
    await deepDive(type, { company_name: companyName, industry, contact_name: contactName }, forceRefresh);
  };

  const isOptionDisabled = (option: typeof DEEP_DIVE_OPTIONS[0]) => {
    if (option.requiresContact && !contactName) return true;
    if (option.requiresCompany && !companyName) return true;
    return false;
  };

  return (
    <ViperCard variant="glass">
      <ViperCardHeader>
        <ViperCardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Deep Dive — Powered by Perplexity
        </ViperCardTitle>
      </ViperCardHeader>
      <ViperCardContent className="space-y-4">
        {/* Option Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {DEEP_DIVE_OPTIONS.map((option) => {
            const disabled = isOptionDisabled(option);
            const isActive = activeType === option.type && deepDiveResult?.query_type === option.type;
            
            return (
              <button
                key={option.type}
                onClick={() => handleDeepDive(option.type)}
                disabled={disabled || (isLoading && activeType === option.type)}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  isActive
                    ? "border-primary bg-primary/10"
                    : disabled
                    ? "border-border/50 bg-muted/30 opacity-50 cursor-not-allowed"
                    : "border-border bg-background/50 hover:border-primary/50"
                )}
              >
                <option.icon className={cn("h-5 w-5 shrink-0 mt-0.5", option.color)} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{option.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                </div>
                {isLoading && activeType === option.type && (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        {/* Results */}
        {deepDiveResult && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                {DEEP_DIVE_OPTIONS.find(o => o.type === deepDiveResult.query_type)?.label}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeepDive(deepDiveResult.query_type, true)}
                disabled={isLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-1", isLoading && "animate-spin")} />
                Refresh
              </Button>
            </div>

            <ScrollArea className="h-64 rounded-lg border border-border/50 p-4 bg-background/50">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{deepDiveResult.content}</ReactMarkdown>
              </div>
            </ScrollArea>

            {/* Citations */}
            {deepDiveResult.citations && deepDiveResult.citations.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Sources:</p>
                <div className="flex flex-wrap gap-2">
                  {deepDiveResult.citations.slice(0, 5).map((citation, i) => (
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
                  {deepDiveResult.citations.length > 5 && (
                    <span className="text-xs text-muted-foreground py-1">
                      +{deepDiveResult.citations.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {!deepDiveResult && !isLoading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a research option above to get AI-powered insights with real-time web search
          </p>
        )}
      </ViperCardContent>
    </ViperCard>
  );
}
