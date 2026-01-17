import { AppLayout } from "@/components/layout/AppLayout";
import { Settings, Bell, Phone, Webhook, RefreshCw, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { AlowareTeamConfig } from "@/components/settings/AlowareTeamConfig";
import { AlowareWebhookSetup } from "@/components/settings/AlowareWebhookSetup";
import { AlowareSyncPanel } from "@/components/settings/AlowareSyncPanel";
import { TeamMembersManager } from "@/components/settings/TeamMembersManager";

export default function TeamSettings() {
  return (
    <AppLayout title="Settings">
      <div className="animate-fade-in">
        <Tabs defaultValue="team" className="space-y-6">
          <TabsList>
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="aloware" className="gap-2">
              <Phone className="h-4 w-4" />
              Aloware
            </TabsTrigger>
            <TabsTrigger value="sync" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Data Sync
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamMembersManager />
          </TabsContent>

          <TabsContent value="aloware">
            <AlowareTeamConfig />
          </TabsContent>

          <TabsContent value="sync">
            <AlowareSyncPanel />
          </TabsContent>

          <TabsContent value="webhook">
            <AlowareWebhookSetup />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
