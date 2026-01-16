import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Radio } from "lucide-react";

export default function WarRoom() {
  return (
    <AppLayout title="War Room">
      <div className="animate-fade-in">
        <ViperCard variant="glass">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Live Floor View
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">War Room - Live sales floor activity coming soon</p>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    </AppLayout>
  );
}