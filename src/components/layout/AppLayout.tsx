import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { ClosersToolkit } from "@/components/toolkit/ClosersToolkit";
import { ManagerFAB } from "@/components/manager/ManagerFAB";
import { BroadcastModal } from "@/components/manager/BroadcastModal";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [showBroadcast, setShowBroadcast] = useState(false);

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <AppHeader title={title} />
          <main className="flex-1 relative overflow-x-hidden bg-background">
            {/* Content */}
            <div className="relative z-10 p-4 md:p-10">
              {children}
            </div>
          </main>
          {/* Floating Toolkit */}
          <ClosersToolkit />
          {/* Manager FAB */}
          <ManagerFAB onSendBroadcast={() => setShowBroadcast(true)} />
          <BroadcastModal open={showBroadcast} onOpenChange={setShowBroadcast} />
        </div>
      </div>
    </SidebarProvider>
  );
}