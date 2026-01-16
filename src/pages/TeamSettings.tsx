import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Settings, Bell } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

export default function TeamSettings() {
  return (
    <AppLayout title="Settings">
      <div className="animate-fade-in">
        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <Settings className="h-4 w-4" />
              Team
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="team">
            <ViperCard variant="glass">
              <ViperCardHeader>
                <ViperCardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Team Configuration
                </ViperCardTitle>
              </ViperCardHeader>
              <ViperCardContent>
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <p className="text-lg">Team Settings - Manager controls coming soon</p>
                </div>
              </ViperCardContent>
            </ViperCard>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
