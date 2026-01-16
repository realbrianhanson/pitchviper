import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { TrendingUp } from "lucide-react";

export default function MyPerformance() {
  return (
    <AppLayout title="My Performance">
      <div className="animate-fade-in">
        <ViperCard variant="glass">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Metrics
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">My Performance - Personal analytics coming soon</p>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    </AppLayout>
  );
}