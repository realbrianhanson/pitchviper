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
  Phone,
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

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; exact?: boolean };

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Today",
    items: [
      { title: "Command Center", url: "/app", icon: LayoutDashboard, exact: true },
      { title: "War Room", url: "/war-room", icon: Radio },
      { title: "Deal Pipeline", url: "/pipeline", icon: GitBranch },
    ],
  },
  {
    label: "Conversations",
    items: [
      { title: "Call Intelligence", url: "/call-intelligence", icon: Phone },
      { title: "Objection Vault", url: "/objection-vault", icon: Shield },
    ],
  },
  {
    label: "Practice",
    items: [
      { title: "Roleplay Arena", url: "/roleplay", icon: Swords },
      { title: "AI Coach", url: "/ai-coach", icon: Brain },
      { title: "Training Academy", url: "/training", icon: GraduationCap },
    ],
  },
  {
    label: "Performance",
    items: [
      { title: "My Performance", url: "/performance", icon: TrendingUp },
      { title: "Leaderboards", url: "/leaderboards", icon: Trophy },
      { title: "Achievements", url: "/achievements", icon: Award },
    ],
  },
];

const managerNavItems: NavItem[] = [
  { title: "Manager Dashboard", url: "/manager", icon: BarChart3, exact: true },
  { title: "Coaching Console", url: "/coaching", icon: Users },
  { title: "Competitions", url: "/manager/competitions", icon: Gamepad2 },
  { title: "Team Settings", url: "/team-settings", icon: Settings },
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Cog },
];

export function isNavItemActive(pathname: string, url: string, exact?: boolean): boolean {
  if (exact) return pathname === url;
  return pathname === url || pathname.startsWith(url + "/");
}

function NavItemRow({ item, isCollapsed, active }: { item: NavItem; isCollapsed: boolean; active: boolean }) {
  return (
    <SidebarMenuItem>
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
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { isManager } = useAuth();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border bg-sidebar"
      style={{
        "--sidebar-width": "260px",
        "--sidebar-width-icon": "72px",
      } as React.CSSProperties}
    >
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
        {navGroups.map((group, idx) => (
          <SidebarGroup key={group.label} className={idx > 0 ? "mt-4" : ""}>
            {!isCollapsed && (
              <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-bold px-3 mb-2">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItemRow
                    key={item.title}
                    item={item}
                    isCollapsed={isCollapsed}
                    active={isNavItemActive(location.pathname, item.url, item.exact)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isManager && (
          <>
            <SidebarSeparator className="my-6 bg-border" />
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-bold px-3 mb-2">
                  Manager
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {managerNavItems.map((item) => (
                    <NavItemRow
                      key={item.title}
                      item={item}
                      isCollapsed={isCollapsed}
                      active={isNavItemActive(location.pathname, item.url, item.exact)}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-6 bg-border" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {bottomNavItems.map((item) => (
                <NavItemRow
                  key={item.title}
                  item={item}
                  isCollapsed={isCollapsed}
                  active={isNavItemActive(location.pathname, item.url, item.exact)}
                />
              ))}
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
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
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
