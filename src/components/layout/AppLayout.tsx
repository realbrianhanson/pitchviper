import { ReactNode, useState } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";
import { LiveTicker } from "./LiveTicker";
import { CommandPalette, useCommandPalette } from "./CommandPalette";
import { ClosersToolkit } from "@/components/toolkit/ClosersToolkit";
import { ManagerFAB } from "@/components/manager/ManagerFAB";
import { BroadcastModal } from "@/components/manager/BroadcastModal";
import { LogCallModal } from "@/components/calls/LogCallModal";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [showLogCall, setShowLogCall] = useState(false);
  const palette = useCommandPalette();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <AppHeader title={title} onOpenPalette={() => palette.setOpen(true)} />
          <LiveTicker />
          <main className="flex-1 relative overflow-x-hidden bg-background">
            <div className="relative z-10 p-4 md:p-10">{children}</div>
          </main>
          <ClosersToolkit />
          <ManagerFAB onSendBroadcast={() => setShowBroadcast(true)} />
          <BroadcastModal open={showBroadcast} onOpenChange={setShowBroadcast} />
          <CommandPalette
            open={palette.open}
            onOpenChange={palette.setOpen}
            onLogCall={() => setShowLogCall(true)}
          />
          <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />
        </div>
      </div>
    </SidebarProvider>
  );
}
