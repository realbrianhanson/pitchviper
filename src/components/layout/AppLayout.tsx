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
          <main className="flex-1 relative overflow-x-hidden">
            {/* Gradient mesh background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/5 rounded-full blur-[80px] md:blur-[120px] -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-[250px] md:w-[500px] h-[250px] md:h-[500px] bg-magenta/5 rounded-full blur-[60px] md:blur-[100px] translate-y-1/2 -translate-x-1/3" />
              <div className="absolute top-1/2 left-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-success/3 rounded-full blur-[50px] md:blur-[80px] -translate-x-1/2 -translate-y-1/2" />
            </div>
            {/* Content */}
            <div className="relative z-10 p-3 md:p-6">
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