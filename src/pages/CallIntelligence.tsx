import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Brain } from "lucide-react";

export default function CallIntelligence() {
  return (
    <AppLayout title="Call Intelligence">
      <div className="animate-fade-in">
        <ViperCard variant="glass">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Call Analytics
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">Call Intelligence - AI call analysis coming soon</p>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    </AppLayout>
  );
}