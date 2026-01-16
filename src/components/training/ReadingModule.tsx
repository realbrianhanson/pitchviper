import { useState, useEffect, useRef } from "react";
import { FileText, CheckCircle } from "lucide-react";
import { ViperCard, ViperCardContent } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrainingModule } from "@/hooks/useTraining";
import ReactMarkdown from "react-markdown";

interface ReadingModuleProps {
  module: TrainingModule;
  onComplete: () => void;
  onBack: () => void;
}

export function ReadingModule({ module, onComplete, onBack }: ReadingModuleProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(module.progress?.status === 'completed');
  const scrollRef = useRef<HTMLDivElement>(null);

  const content = module.content || {};
  const markdownContent = content.content || '# No content available';

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTop = target.scrollTop;
    const scrollHeight = target.scrollHeight - target.clientHeight;
    const progress = scrollHeight > 0 ? Math.round((scrollTop / scrollHeight) * 100) : 100;
    setScrollProgress(progress);
  };

  const canComplete = scrollProgress >= 95;

  const handleComplete = () => {
    setIsCompleted(true);
    onComplete();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <ViperButton variant="ghost" onClick={onBack}>
          ← Back
        </ViperButton>
        <div className="flex-1">
          <h2 className="text-xl font-bold">{module.title}</h2>
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </div>
        {isCompleted && (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle className="h-5 w-5" />
            <span className="font-medium">Completed</span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {!isCompleted && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Reading Progress</span>
            <span className={scrollProgress >= 95 ? 'text-success' : ''}>
              {scrollProgress}% {scrollProgress >= 95 && '- Ready to complete!'}
            </span>
          </div>
          <Progress value={scrollProgress} className="h-2" />
        </div>
      )}

      {/* Content */}
      <ViperCard variant="glass">
        <ViperCardContent className="p-0">
          <ScrollArea 
            className="h-[500px] p-6" 
            onScrollCapture={handleScroll}
            ref={scrollRef}
          >
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 text-foreground">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mt-6 mb-3 text-foreground">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mt-4 mb-2 text-foreground">{children}</h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2 text-muted-foreground">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2 text-muted-foreground">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-muted-foreground">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">{children}</strong>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                      {children}
                    </blockquote>
                  ),
                }}
              >
                {markdownContent}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </ViperCardContent>
      </ViperCard>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <ViperButton variant="outline" onClick={onBack}>
          Exit Module
        </ViperButton>
        {!isCompleted && (
          <ViperButton 
            onClick={handleComplete}
            disabled={!canComplete}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Complete
          </ViperButton>
        )}
      </div>
    </div>
  );
}
