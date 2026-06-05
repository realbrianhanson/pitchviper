import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronDown, User, Settings, LogOut, Phone } from "lucide-react";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

  const profile = authProfile ? {
    full_name: authProfile.full_name,
    avatar_url: authProfile.avatar_url,
    title: authProfile.title,
  } : null;
  const role = isManager ? "manager" : "rep";

  const handleSignOut = async () => {
    await signOut();
    navigate("/sign-in");
  };

  // Get initials from name
  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.substring(0, 2).toUpperCase() || "??";
  };

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const roleLabel = role === "manager" ? "Sales Manager" : "Sales Rep";

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/90 backdrop-blur-xl px-4 md:px-8">
      {/* Left: Terminal breadcrumb */}
      <div className="flex items-center gap-3 min-w-0 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        <span className="text-primary hidden sm:inline">Terminal v1.0</span>
        <span className="opacity-30 hidden sm:inline">/</span>
        <span className="truncate text-foreground">{title || "Dashboard"}</span>
      </div>

      {/* Center: Command palette trigger */}
      <div className="hidden lg:flex flex-1 max-w-md mx-auto">
        <button
          onClick={onOpenPalette}
          className="group w-full flex items-center justify-between gap-2 border border-border hover:border-primary/60 transition-colors px-3 py-1.5 text-left"
        >
          <span className="flex items-center gap-2 text-muted-foreground">
            <Search className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
              Jump to anything
            </span>
          </span>
          <kbd className="font-mono text-[9px] uppercase tracking-[0.15em] text-muted-foreground/70 border border-border px-1.5 py-0.5">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        <button
          onClick={() => setShowLogCall(true)}
          className="hidden md:inline-flex items-center gap-2 px-4 py-1.5 border border-primary/60 text-primary text-[10px] font-mono uppercase tracking-[0.2em] font-bold hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <Phone className="h-3 w-3" />
          Log Session
        </button>
        <button
          onClick={() => setShowLogCall(true)}
          className="md:hidden inline-flex h-8 w-8 items-center justify-center border border-primary/60 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
        >
          <Phone className="h-3.5 w-3.5" />
        </button>
        <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />

        <div className="flex items-center gap-1 text-muted-foreground">
          <ChatPanel />
          <ThemeToggle />
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 px-2 py-1 transition-colors hover:text-primary border-l border-border pl-4 ml-2">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 rounded-full object-cover border border-primary/30"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent border border-primary/30">
                  <span className="text-[10px] font-mono font-bold text-primary">
                    {getInitials()}
                  </span>
                </div>
              )}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-xs font-semibold text-foreground leading-tight">{displayName}</span>
                <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground leading-tight mt-0.5">{roleLabel}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-card border-border z-50 rounded-none">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-none" onClick={() => navigate("/performance")}>
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer rounded-none" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 cursor-pointer text-destructive focus:text-destructive rounded-none"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}