import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, User, Settings, LogOut, Phone } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { LogCallModal } from "@/components/calls/LogCallModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface AppHeaderProps {
  title?: string;
  onOpenPalette?: () => void;
}

export function AppHeader({ title, onOpenPalette }: AppHeaderProps) {
  const { user, profile: authProfile, isManager, signOut } = useAuth();
  const navigate = useNavigate();
  const [showLogCall, setShowLogCall] = useState(false);

  const profile = authProfile
    ? { full_name: authProfile.full_name, avatar_url: authProfile.avatar_url, title: authProfile.title }
    : null;
  const role = isManager ? "manager" : "rep";

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in");
  };

  // Display-only cleaner: strip URL substrings, trim, uppercase first visible char.
  const cleanDisplay = (raw?: string | null) => {
    if (!raw) return "";
    const stripped = raw
      .replace(/\bhttps?:\/\/\S+/gi, "")
      .replace(/\bwww\.\S+/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!stripped) return "";
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
  };

  const cleanedName = cleanDisplay(profile?.full_name) || cleanDisplay(user?.email?.split("@")[0]) || "User";

  const getInitials = () => {
    if (cleanedName && cleanedName !== "User") {
      return cleanedName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || "??";
  };

  const displayName = cleanedName;
  const roleLabel = role === "manager" ? "Sales Manager" : "Sales Rep";

  return (
    <header className="sticky top-0 z-40 flex h-[68px] items-center justify-between gap-3 md:gap-6 border-b border-border bg-card px-4 sm:px-6 lg:px-8">
      {/* Left: mobile trigger + page title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <SidebarTrigger className="md:hidden -ml-1 text-muted-foreground hover:text-foreground shrink-0" />
        <h1 className="text-[17px] font-medium text-foreground truncate leading-none min-w-0">
          {title || "Dashboard"}
        </h1>
      </div>

      {/* Center: command search */}
      <div className="hidden lg:flex flex-1 max-w-md mx-auto">
        <button
          onClick={onOpenPalette}
          className="group w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background hover:bg-accent/40 hover:border-ring/40 transition-colors px-3 h-9 text-left"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-4 w-4" strokeWidth={1.75} />
            <span className="text-[13px]">Search or jump to…</span>
          </span>
          <kbd className="font-mono text-[11px] text-muted-foreground/80 border border-border rounded px-1.5 py-0.5 bg-muted/50">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onOpenPalette}
          className="hidden sm:inline-flex lg:hidden h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Open command palette"
        >
          <Search className="h-4 w-4" strokeWidth={1.75} />
        </button>

        <button
          onClick={() => setShowLogCall(true)}
          className="hidden md:inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 transition-colors shadow-elev-xs"
        >
          <Phone className="h-3.5 w-3.5" strokeWidth={2} />
          Log session
        </button>
        <button
          onClick={() => setShowLogCall(true)}
          className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          aria-label="Log session"
        >
          <Phone className="h-4 w-4" />
        </button>
        <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />

        <div className="flex items-center gap-0.5 text-muted-foreground">
          <div className="hidden sm:flex">
            <ChatPanel />
          </div>
          <NotificationBell />
          <ThemeToggle />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label={`Account menu for ${displayName}`}
              className="flex items-center gap-2 md:gap-2.5 h-9 pl-1 pr-1.5 md:pl-2 md:pr-2 rounded-md hover:bg-accent transition-colors md:border-l md:border-border md:ml-1 md:rounded-l-none"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <span className="text-[11px] font-semibold">{getInitials()}</span>
                </div>
              )}
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-[13px] font-medium text-foreground">{displayName}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{roleLabel}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border-border z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[13px] font-medium text-foreground">{displayName}</p>
              <p className="text-[12px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/performance")}>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
