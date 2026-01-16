import { useState } from "react";
import { Search, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { ViperInput } from "@/components/ui/viper-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
  const [hasNotifications] = useState(true);
  const notificationCount = 3;

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

      {/* Right: Notifications + User */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button
          className={cn(
            "relative flex h-10 w-10 items-center justify-center rounded-lg transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-accent",
            hasNotifications && "text-foreground"
          )}
        >
          <Bell className="h-5 w-5" />
          {hasNotifications && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center">
              <span className="absolute h-full w-full animate-ping rounded-full bg-magenta/50" />
              <span className="relative flex h-4 w-4 items-center justify-center rounded-full bg-magenta text-[10px] font-bold text-magenta-foreground">
                {notificationCount}
              </span>
            </span>
          )}
        </button>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all duration-200 hover:bg-accent">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <span className="text-sm font-display font-semibold text-primary">
                  JD
                </span>
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-medium text-foreground">
                  John Doe
                </span>
                <span className="text-xs text-muted-foreground">
                  Sales Rep
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
              <p className="text-sm font-medium text-foreground">John Doe</p>
              <p className="text-xs text-muted-foreground">john@company.com</p>
            </div>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}