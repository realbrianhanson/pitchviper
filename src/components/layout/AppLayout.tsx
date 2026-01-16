import { ReactNode } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { AppHeader } from "./AppHeader";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-h-screen">
          <AppHeader title={title} />
          <main className="flex-1 relative">
            {/* Gradient mesh background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
              <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-magenta/5 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3" />
              <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-success/3 rounded-full blur-[80px] -translate-x-1/2 -translate-y-1/2" />
            </div>
            {/* Content */}
            <div className="relative z-10 p-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}