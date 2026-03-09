import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard,
  Radio,
  Swords,
  Brain,
  Shield,
  Trophy,
  TrendingUp,
  GraduationCap,
  GitBranch,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const mainNavItems = [
  { title: "Command Center", url: "/", icon: LayoutDashboard },
  { title: "War Room", url: "/war-room", icon: Radio },
  { title: "Roleplay Arena", url: "/roleplay", icon: Swords },
  { title: "Call Intelligence", url: "/call-intelligence", icon: Brain },
  { title: "Objection Vault", url: "/objection-vault", icon: Shield },
  { title: "Leaderboards", url: "/leaderboards", icon: Trophy },
  { title: "My Performance", url: "/performance", icon: TrendingUp },
  { title: "Training Academy", url: "/training", icon: GraduationCap },
  { title: "Deal Pipeline", url: "/pipeline", icon: GitBranch },
];

const managerNavItems = [
  { title: "Team Settings", url: "/team-settings", icon: Settings },
  { title: "Coaching Console", url: "/coaching", icon: Users },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { isManager } = useAuth();
  const isCollapsed = state === "collapsed";

  const isActive = (url: string) => {
    if (url === "/") return location.pathname === "/";
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar"
      style={{
        "--sidebar-width": "280px",
        "--sidebar-width-icon": "72px",
      } as React.CSSProperties}
    >
      {/* Logo Header */}
      <SidebarHeader className="p-3 md:p-4 border-b border-border">
        <div className="flex flex-col">
          <span className="font-display text-base md:text-lg text-foreground tracking-tight">
            <span className="font-normal">Pitch</span>
            <span className="font-bold">Viper</span>
          </span>
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground">
              Sales Command
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3 md:py-4">
        {/* Main Navigation */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="text-muted-foreground font-display text-xs uppercase tracking-wider mb-2">
              Operations
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(item.url)}
                  >
                    <NavLink
                      to={item.url}
                      className={cn(
                        "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                        "text-muted-foreground hover:text-foreground hover:bg-accent",
                        isActive(item.url) && [
                          "text-foreground bg-accent",
                          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                          "before:h-8 before:w-1 before:rounded-r-full before:bg-primary",
                          "before:shadow-[0_0_12px_hsl(var(--primary))]",
                        ]
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-5 w-5 shrink-0 transition-colors",
                          isActive(item.url) && "text-primary"
                        )}
                      />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isManager && (
          <>
            <SidebarSeparator className="my-4" />

            {/* Manager Section */}
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-muted-foreground font-display text-xs uppercase tracking-wider mb-2">
                  Manager
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {managerNavItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.title}
                        isActive={isActive(item.url)}
                      >
                        <NavLink
                          to={item.url}
                          className={cn(
                            "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                            "text-muted-foreground hover:text-foreground hover:bg-accent",
                            isActive(item.url) && [
                              "text-foreground bg-accent",
                              "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                              "before:h-8 before:w-1 before:rounded-r-full before:bg-primary",
                              "before:shadow-[0_0_12px_hsl(var(--primary))]",
                            ]
                          )}
                        >
                          <item.icon
                            className={cn(
                              "h-5 w-5 shrink-0 transition-colors",
                              isActive(item.url) && "text-primary"
                            )}
                          />
                          {!isCollapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Collapse Toggle */}
      <SidebarFooter className="p-3 md:p-4 border-t border-border">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg px-3 py-2 md:py-2.5 text-sm font-medium transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}