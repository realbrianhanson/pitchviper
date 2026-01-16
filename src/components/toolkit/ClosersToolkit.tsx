import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToolkit } from "@/hooks/useToolkit";
import { QuickWinsTab } from "./QuickWinsTab";
import { BattlecardsTab } from "./BattlecardsTab";
import { ProofPointsTab } from "./ProofPointsTab";
import { CalculatorsTab } from "./CalculatorsTab";
import { ScriptsTab } from "./ScriptsTab";
import { 
  Briefcase, 
  Search, 
  Zap, 
  Swords, 
  Award, 
  Calculator,
  FileText,
  Loader2
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function ClosersToolkit() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    isLoading,
    searchQuery,
    setSearchQuery,
    getItemsByType,
    getItemsByTypeAndCategory,
    sortWithRecentFirst,
    recentlyUsed,
    trackUsage
  } = useToolkit();

  // Don't show during roleplay sessions
  if (location.pathname.includes('/roleplay/')) {
    return null;
  }

  const quickWinItems = getItemsByTypeAndCategory('quick_win');
  const battlecardItems = getItemsByType('battlecard');
  const proofPointItems = getItemsByTypeAndCategory('proof_point');
  const scriptItems = getItemsByType('script');

  const handleCopy = (item: any) => {
    trackUsage(item.id);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className={cn(
            "fixed bottom-6 right-6 z-50 h-14 px-5 rounded-full shadow-lg",
            "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            "transition-all duration-300 hover:scale-105 group"
          )}
        >
          <Briefcase className="h-5 w-5 mr-2 group-hover:hidden" />
          <Zap className="h-5 w-5 mr-2 hidden group-hover:block animate-pulse" />
          <span className="font-semibold">Toolkit</span>
        </Button>
      </SheetTrigger>

      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[450px] bg-card border-border p-0 flex flex-col"
      >
        <SheetHeader className="px-4 pt-4 pb-2">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <Briefcase className="h-5 w-5 text-primary" />
            Closer's Toolkit
          </SheetTitle>
        </SheetHeader>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Quick search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="quick-wins" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid grid-cols-5 mx-4 bg-muted/50">
              <TabsTrigger 
                value="quick-wins" 
                className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Zap className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger 
                value="battlecards"
                className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Swords className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger 
                value="proof"
                className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Award className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger 
                value="calculators"
                className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Calculator className="h-3.5 w-3.5" />
              </TabsTrigger>
              <TabsTrigger 
                value="scripts"
                className="text-xs px-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <FileText className="h-3.5 w-3.5" />
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <TabsContent value="quick-wins" className="mt-0 h-full">
                <QuickWinsTab 
                  itemsByCategory={quickWinItems} 
                  recentlyUsed={recentlyUsed}
                  onCopy={handleCopy}
                />
              </TabsContent>

              <TabsContent value="battlecards" className="mt-0 h-full">
                <BattlecardsTab items={battlecardItems} />
              </TabsContent>

              <TabsContent value="proof" className="mt-0 h-full">
                <ProofPointsTab 
                  itemsByCategory={proofPointItems}
                  onCopy={handleCopy}
                />
              </TabsContent>

              <TabsContent value="calculators" className="mt-0 h-full">
                <CalculatorsTab />
              </TabsContent>

              <TabsContent value="scripts" className="mt-0 h-full">
                <ScriptsTab 
                  items={scriptItems}
                  onCopy={handleCopy}
                />
              </TabsContent>
            </div>
          </Tabs>
        )}
      </SheetContent>
    </Sheet>
  );
}
