import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolkitItem } from "@/hooks/useToolkit";
import { Copy, Check, Quote, BarChart3, FileText, Calculator } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProofPointsTabProps {
  itemsByCategory: Record<string, ToolkitItem[]>;
  onCopy: (item: ToolkitItem) => void;
}

const categoryIcons: Record<string, React.ReactNode> = {
  'Testimonials': <Quote className="h-4 w-4" />,
  'Statistics': <BarChart3 className="h-4 w-4" />,
  'Case Studies': <FileText className="h-4 w-4" />,
  'ROI Examples': <Calculator className="h-4 w-4" />
};

const categoryColors: Record<string, string> = {
  'Testimonials': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Statistics': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Case Studies': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'ROI Examples': 'bg-amber-500/20 text-amber-400 border-amber-500/30'
};

export function ProofPointsTab({ itemsByCategory, onCopy }: ProofPointsTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (item: ToolkitItem) => {
    navigator.clipboard.writeText(item.content);
    setCopiedId(item.id);
    onCopy(item);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const categories = Object.keys(itemsByCategory);

  return (
    <div className="space-y-6">
      {categories.map(category => (
        <div key={category}>
          <div className="flex items-center gap-2 mb-3">
            <div className={cn(
              "p-1.5 rounded",
              categoryColors[category]?.split(' ')[0] || 'bg-muted'
            )}>
              {categoryIcons[category] || <FileText className="h-4 w-4" />}
            </div>
            <span className="text-sm font-semibold text-foreground">{category}</span>
          </div>
          
          <div className="space-y-2">
            {itemsByCategory[category].map(item => {
              const isCopied = copiedId === item.id;
              const metadata = item.metadata || {};

              return (
                <div
                  key={item.id}
                  className="group p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.content}</p>
                      
                      {/* Metadata display */}
                      {metadata.author && (
                        <p className="text-xs text-primary mt-2">
                          — {metadata.author}, {metadata.title} at {metadata.company}
                        </p>
                      )}
                      {metadata.source && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Source: {metadata.source}
                        </p>
                      )}
                      {metadata.key_results && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {metadata.key_results.map((result: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs bg-success/10 text-success border-success/30">
                              {result}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-8 w-8 shrink-0",
                        isCopied ? "text-success" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                      )}
                      onClick={() => handleCopy(item)}
                    >
                      {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No proof points found</p>
        </div>
      )}
    </div>
  );
}
