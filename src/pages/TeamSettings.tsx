import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Bell, Phone, Upload, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";
import { TeamMembersManager } from "@/components/settings/TeamMembersManager";
import { PhoneSystemPanel } from "@/components/settings/PhoneSystemPanel";
import { DataImportPanel } from "@/components/settings/DataImportPanel";

// Legacy tabs (aloware/sync/webhook) redirect to "phone".
const VALID_TABS = new Set(["team", "phone", "data-import", "notifications"]);
const LEGACY_REDIRECT: Record<string, string> = {
  aloware: "phone",
  sync: "phone",
  webhook: "phone",
};

export default function TeamSettings() {
  const [params, setParams] = useSearchParams();
  const raw = params.get("tab") ?? "";
  const redirected = LEGACY_REDIRECT[raw];
  const value = redirected ?? (VALID_TABS.has(raw) ? raw : "team");

  const setTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <AppLayout title="Settings">
      <div className="animate-fade-in">
        <Tabs value={value} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 gap-1 h-auto sm:inline-flex sm:w-auto sm:h-10 sm:grid-cols-none sm:gap-0">
            <TabsTrigger value="team" className="gap-2 min-h-10">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
            <TabsTrigger value="phone" className="gap-2 min-h-10">
              <Phone className="h-4 w-4" />
              Phone system
            </TabsTrigger>
            <TabsTrigger value="data-import" className="gap-2 min-h-10">
              <Upload className="h-4 w-4" />
              Data import
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2 min-h-10">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="team">
            <TeamMembersManager />
          </TabsContent>

          <TabsContent value="phone">
            <PhoneSystemPanel />
          </TabsContent>

          <TabsContent value="data-import">
            <DataImportPanel />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
