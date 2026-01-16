import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Trophy } from "lucide-react";

export default function Leaderboards() {
  return (
    <AppLayout title="Leaderboards">
      <div className="animate-fade-in">
        <ViperCard variant="glass">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Team Rankings
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">Leaderboards - Live rankings coming soon</p>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    </AppLayout>
  );
}