import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ToolkitItem } from "@/hooks/useToolkit";
import { Copy, Check, Clock, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

interface ScriptsTabProps {
  items: ToolkitItem[];
  onCopy: (item: ToolkitItem) => void;
}

export function ScriptsTab({ items, onCopy }: ScriptsTabProps) {
  const [selectedScript, setSelectedScript] = useState<string>(items[0]?.id || '');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const selected = items.find(item => item.id === selectedScript);
  const metadata = selected?.metadata || {};

  const handleCopySection = (section: string) => {
    navigator.clipboard.writeText(section);
    setCopiedSection(section);
    toast.success('Section copied!');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleCopyFull = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.content);
    onCopy(selected);
    toast.success('Full script copied!');
  };

  // Split content by markdown headers
  const sections = selected?.content.split(/(?=\*\*[A-Z]+.*\*\*)/).filter(Boolean) || [];

  return (
    <div className="space-y-4">
      <Select value={selectedScript} onValueChange={setSelectedScript}>
        <SelectTrigger className="bg-background border-border">
          <SelectValue placeholder="Select script type" />
        </SelectTrigger>
        <SelectContent>
          {items.map(item => (
            <SelectItem key={item.id} value={item.id}>
              {item.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selected && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Script metadata */}
          <div className="flex flex-wrap items-center gap-2">
            {metadata.duration && (
              <Badge variant="outline" className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">
                <Clock className="h-3 w-3 mr-1" />
                {metadata.duration}
              </Badge>
            )}
            {metadata.goal && (
              <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                <Target className="h-3 w-3 mr-1" />
                {metadata.goal}
              </Badge>
            )}
          </div>

          {/* Copy Full Button */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopyFull}
            className="w-full"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Full Script
          </Button>

          {/* Script Sections */}
          <div className="space-y-3">
            {sections.map((section, index) => {
              const isCopied = copiedSection === section;
              
              return (
                <div 
                  key={index}
                  className="group relative p-3 rounded-lg border border-border/50 bg-background/50 hover:border-primary/50 transition-all"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "absolute top-2 right-2 h-7 w-7",
                      isCopied ? "text-success" : "text-muted-foreground opacity-0 group-hover:opacity-100"
                    )}
                    onClick={() => handleCopySection(section)}
                  >
                    {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  
                  <div className="prose prose-sm prose-invert max-w-none pr-8">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="text-sm text-muted-foreground mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                        ul: ({ children }) => <ul className="space-y-1 mt-2">{children}</ul>,
                        li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
                      }}
                    >
                      {section}
                    </ReactMarkdown>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No scripts found</p>
        </div>
      )}
    </div>
  );
}
