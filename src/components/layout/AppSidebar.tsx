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
  Award,
  BarChart3,
  Gamepad2,
  Cog,
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
  { title: "AI Coach", url: "/ai-coach", icon: Brain },
  { title: "Achievements", url: "/achievements", icon: Award },
  { title: "Training Academy", url: "/training", icon: GraduationCap },
  { title: "Deal Pipeline", url: "/pipeline", icon: GitBranch },
];

const managerNavItems = [
  { title: "Manager Dashboard", url: "/manager", icon: BarChart3 },
  { title: "Competitions", url: "/manager/competitions", icon: Gamepad2 },
  { title: "Team Settings", url: "/team-settings", icon: Settings },
  { title: "Coaching Console", url: "/coaching", icon: Users },
];

const bottomNavItems = [
  { title: "Settings", url: "/settings", icon: Cog },
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
        "--sidebar-width": "260px",
        "--sidebar-width-icon": "72px",
      } as React.CSSProperties}
    >
      {/* Editorial Logo */}
      <SidebarHeader className="p-6 pb-8 border-b border-border">
        <div className="flex flex-col">
          <span className="font-display italic text-2xl tracking-tight text-primary leading-none">
            PitchViper
          </span>
          {!isCollapsed && (
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-2">
              Sales Command
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-6">
        {/* Operations */}
        <SidebarGroup>
          {!isCollapsed && (
            <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-bold px-3 mb-3">
              Operations
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 rounded-none",
                          active
                            ? "bg-accent text-primary border-l-2 border-primary -ml-px"
                            : "text-muted-foreground hover:text-foreground border-l-2 border-transparent -ml-px"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} strokeWidth={1.5} />
                        {!isCollapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isManager && (
          <>
            <SidebarSeparator className="my-6 bg-border" />
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-bold px-3 mb-3">
                  Manager
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {managerNavItems.map((item) => {
                    const active = isActive(item.url);
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                          <NavLink
                            to={item.url}
                            className={cn(
                              "relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 rounded-none",
                              active
                                ? "bg-accent text-primary border-l-2 border-primary -ml-px"
                                : "text-muted-foreground hover:text-foreground border-l-2 border-transparent -ml-px"
                            )}
                          >
                            <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} strokeWidth={1.5} />
                            {!isCollapsed && <span className="font-medium">{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-6 bg-border" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => {
                const active = isActive(item.url);
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={active}>
                      <NavLink
                        to={item.url}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2.5 text-sm transition-colors duration-150 rounded-none",
                          active
                            ? "bg-accent text-primary border-l-2 border-primary -ml-px"
                            : "text-muted-foreground hover:text-foreground border-l-2 border-transparent -ml-px"
                        )}
                      >
                        <item.icon className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "")} strokeWidth={1.5} />
                        {!isCollapsed && <span className="font-medium">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground hover:text-primary transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}