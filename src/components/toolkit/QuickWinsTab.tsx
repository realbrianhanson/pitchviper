import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolkitItem } from "@/hooks/useToolkit";
import { Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QuickWinsTabProps {
  itemsByCategory: Record<string, ToolkitItem[]>;
  recentlyUsed: string[];
  onCopy: (item: ToolkitItem) => void;
}

const categoryColors: Record<string, string> = {
  'Openers': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Value Props': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Urgency': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Closes': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Objection Quickies': 'bg-rose-500/20 text-rose-400 border-rose-500/30'
};

export function QuickWinsTab({ itemsByCategory, recentlyUsed, onCopy }: QuickWinsTabProps) {
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
            <Badge 
              variant="outline" 
              className={cn("text-xs", categoryColors[category] || 'bg-muted text-muted-foreground')}
            >
              {category}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {itemsByCategory[category].map(item => {
              const isRecent = recentlyUsed.includes(item.id);
              const isCopied = copiedId === item.id;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-primary/50",
                    isRecent ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background/50"
                  )}
                  onClick={() => handleCopy(item)}
                >
                  {isRecent && (
                    <Clock className="h-3.5 w-3.5 text-primary mt-1 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">{item.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.content}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 shrink-0",
                      isCopied ? "text-success" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {categories.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No quick wins found</p>
        </div>
      )}
    </div>
  );
}
