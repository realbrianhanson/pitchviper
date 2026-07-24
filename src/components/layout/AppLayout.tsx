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
import { EntitlementBanner } from "@/components/billing/EntitlementBanner";


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
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen min-w-0">
          <AppHeader title={title} onOpenPalette={() => palette.setOpen(true)} />
          <EntitlementBanner />
          <LiveTicker />
          <main className="flex-1 overflow-x-hidden bg-background">
            <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 pb-32 md:pb-8">
              {children}
            </div>
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
