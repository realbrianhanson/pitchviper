import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { LogCallModal } from "@/components/calls/LogCallModal";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ChatPanel } from "@/components/chat/ChatPanel";

interface AppHeaderProps {
  title?: string;
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
  title: string | null;
}

interface UserRole {
  role: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<string>("rep");
  const [showLogCall, setShowLogCall] = useState(false);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, title")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      // Load role
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      if (rolesData && rolesData.length > 0) {
        setRole(rolesData[0].role);
      }
    };

    loadData();
  }, [user]);

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
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 backdrop-blur-xl px-6">
      {/* Left: Page title */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="font-display text-xl font-semibold text-foreground">
            {title}
          </h1>
        )}
      </div>

      {/* Center: Global Search */}
      <div className="flex-1 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <ViperInput
            variant="glass"
            placeholder="Search deals, contacts, or commands..."
            className="pl-10 pr-4"
          />
        </div>
      </div>

      {/* Right: Log Call + Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Log Call Button */}
        <ViperButton
          variant="outline"
          size="sm"
          onClick={() => setShowLogCall(true)}
          className="hidden sm:flex gap-2"
        >
          <Phone className="h-4 w-4" />
          Log Call
        </ViperButton>
        <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />
        
        {/* Team Chat */}
        <ChatPanel />
        
        {/* Notifications */}
        <NotificationBell />

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-accent">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="h-8 w-8 rounded-full object-cover border border-primary/30"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                  <span className="text-sm font-display font-semibold text-primary">
                    {getInitials()}
                  </span>
                </div>
              )}
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">
                  {displayName}
                </span>
                <span className="text-xs text-muted-foreground">
                  {roleLabel}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-card border-border z-50"
          >
            <div className="px-3 py-2 border-b border-border">
              <p className="text-sm font-medium text-foreground">{displayName}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
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
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}