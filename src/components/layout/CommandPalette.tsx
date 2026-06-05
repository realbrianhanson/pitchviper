import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Radio,
  Swords,
  Brain,
  Shield,
  Trophy,
  TrendingUp,
  Award,
  GraduationCap,
  GitBranch,
  Cog,
  BarChart3,
  Gamepad2,
  Users,
  Phone,
  Plus,
  Sparkles,
  LogOut,
  Sun,
  Moon,
  User,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "next-themes";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogCall?: () => void;
}

export function CommandPalette({ open, onOpenChange, onLogCall }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { isManager, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const go = (path: string) => {
    onOpenChange(false);
    navigate(path);
  };

  const navItems = useMemo(
    () => [
      { label: "Command Center", path: "/", icon: LayoutDashboard, hint: "Home" },
      { label: "War Room", path: "/war-room", icon: Radio },
      { label: "Roleplay Arena", path: "/roleplay", icon: Swords },
      { label: "Call Intelligence", path: "/call-intelligence", icon: Brain },
      { label: "Objection Vault", path: "/objection-vault", icon: Shield },
      { label: "Leaderboards", path: "/leaderboards", icon: Trophy },
      { label: "My Performance", path: "/performance", icon: TrendingUp },
      { label: "Achievements", path: "/achievements", icon: Award },
      { label: "Training Academy", path: "/training", icon: GraduationCap },
      { label: "Deal Pipeline", path: "/pipeline", icon: GitBranch },
    ],
    []
  );

  const managerItems = useMemo(
    () => [
      { label: "Manager Dashboard", path: "/manager", icon: BarChart3 },
      { label: "Competitions", path: "/manager/competitions", icon: Gamepad2 },
      { label: "Team Settings", path: "/team-settings", icon: Users },
      { label: "Coaching Console", path: "/coaching", icon: Users },
    ],
    []
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or jump to a page..." />
      <CommandList>
        <CommandEmpty>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            No matches
          </span>
        </CommandEmpty>

        <CommandGroup heading="Actions">
          {onLogCall && (
            <CommandItem
              onSelect={() => {
                onOpenChange(false);
                onLogCall();
              }}
            >
              <Phone className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
              Log a call session
            </CommandItem>
          )}
          <CommandItem onSelect={() => go("/pipeline?new=1")}>
            <Plus className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            New deal
          </CommandItem>
          <CommandItem onSelect={() => go("/roleplay")}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            Start a roleplay
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem key={item.path} onSelect={() => go(item.path)}>
              <item.icon className="mr-2 h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {isManager && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Manager">
              {managerItems.map((item) => (
                <CommandItem key={item.path} onSelect={() => go(item.path)}>
                  <item.icon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go("/performance")}>
            <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => go("/settings")}>
            <Cog className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Settings
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setTheme(theme === "dark" ? "light" : "dark");
            }}
          >
            {theme === "dark" ? (
              <Sun className="mr-2 h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Moon className="mr-2 h-4 w-4" strokeWidth={1.5} />
            )}
            Toggle theme
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              onOpenChange(false);
              await signOut();
              navigate("/sign-in");
            }}
            className="text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Sign out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

/** Global keyboard hook — opens palette on ⌘K / Ctrl+K. */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { open, setOpen };
}
