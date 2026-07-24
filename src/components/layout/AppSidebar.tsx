import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { useEntitlement, isGrowthTier } from "@/hooks/useEntitlement";
import { isGrowthRoute } from "@/lib/featureGates";
import { Lock } from "lucide-react";
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
  Building2,
  Sparkles,
  CreditCard,
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
  { title: "Company Setup", url: "/workspace-setup", icon: Building2 },
  { title: "Team Settings", url: "/team-settings", icon: Settings },
  { title: "Billing", url: "/billing", icon: CreditCard },
];

const sampleNavItem: NavItem = { title: "Sample workspace", url: "/sample-workspace", icon: Sparkles };

const bottomNavItems: NavItem[] = [
  { title: "Settings", url: "/settings", icon: Cog },
];

export function isNavItemActive(pathname: string, url: string, exact?: boolean): boolean {
  if (exact) return pathname === url;
  return pathname === url || pathname.startsWith(url + "/");
}

function NavItemRow({
  item,
  isCollapsed,
  active,
  locked,
}: {
  item: NavItem;
  isCollapsed: boolean;
  active: boolean;
  locked?: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={locked ? `${item.title} · Growth plan` : item.title} isActive={active}>
        <NavLink
          to={item.url}
          className={cn(
            "relative flex items-center gap-3 px-3 py-2 text-[15px] leading-tight transition-colors duration-150 rounded-md",
            active
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
            locked && "opacity-60",
          )}
        >
          <item.icon
            className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-sidebar-foreground/60")}
            strokeWidth={1.75}
          />
          {!isCollapsed && (
            <span className="flex items-center gap-2">
              {item.title}
              {locked && (
                <Lock className="h-3 w-3 text-muted-foreground" strokeWidth={2} aria-label="Growth plan" />
              )}
            </span>
          )}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { isManager } = useAuth();
  const { data: ent } = useEntitlement();
  const growthAllowed = isGrowthTier(ent);
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar"
      style={{
        "--sidebar-width": "248px",
        "--sidebar-width-icon": "72px",
      } as React.CSSProperties}
    >
      <SidebarHeader className="px-5 pt-6 pb-5 border-b border-sidebar-border">
        <div className="flex flex-col">
          <span className="brand-wordmark text-[22px] text-sidebar-foreground leading-none">
            PitchViper
          </span>
          {!isCollapsed && (
            <span className="text-[11px] text-muted-foreground mt-1.5">
              Sales OS
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-5">
        {navGroups.map((group, idx) => (
          <SidebarGroup key={group.label} className={idx > 0 ? "mt-5" : ""}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground px-3 mb-1.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {group.items.map((item) => (
                  <NavItemRow
                    key={item.title}
                    item={item}
                    isCollapsed={isCollapsed}
                    active={isNavItemActive(location.pathname, item.url, item.exact)}
                    locked={!growthAllowed && isGrowthRoute(item.url)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {isManager && (
          <>
            <SidebarSeparator className="my-5 bg-sidebar-border" />
            <SidebarGroup>
              {!isCollapsed && (
                <SidebarGroupLabel className="text-[11px] font-medium text-muted-foreground px-3 mb-1.5">
                  Manager
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {managerNavItems.map((item) => (
                    <NavItemRow
                      key={item.title}
                      item={item}
                      isCollapsed={isCollapsed}
                      active={isNavItemActive(location.pathname, item.url, item.exact)}
                      locked={!growthAllowed && isGrowthRoute(item.url)}
                    />
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild tooltip="Sample workspace" isActive={isNavItemActive(location.pathname, sampleNavItem.url)}>
                      <NavLink
                        to={sampleNavItem.url}
                        className={cn(
                          "relative flex items-center gap-3 px-3 py-2 text-[15px] leading-tight transition-colors duration-150 rounded-md",
                          isNavItemActive(location.pathname, sampleNavItem.url)
                            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                            : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 italic"
                        )}
                      >
                        <sampleNavItem.icon className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/50" strokeWidth={1.75} />
                        {!isCollapsed && (
                          <span className="flex items-center gap-2">
                            {sampleNavItem.title}
                            <span className="text-[9px] uppercase tracking-wide font-medium not-italic text-muted-foreground border border-border rounded px-1 py-px">
                              Sample
                            </span>
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        <SidebarSeparator className="my-5 bg-sidebar-border" />

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
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

      <SidebarFooter className="p-3 border-t border-sidebar-border">
        <button
          onClick={toggleSidebar}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-[12px] text-muted-foreground hover:text-foreground transition-colors rounded-md",
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
