import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Shield } from "lucide-react";

export default function ObjectionVault() {
  return (
    <AppLayout title="Objection Vault">
      <div className="animate-fade-in">
        <ViperCard variant="glass">
          <ViperCardHeader>
            <ViperCardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Objection Library
            </ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <p className="text-lg">Objection Vault - Battle-tested responses coming soon</p>
            </div>
          </ViperCardContent>
        </ViperCard>
      </div>
    </AppLayout>
  );
}