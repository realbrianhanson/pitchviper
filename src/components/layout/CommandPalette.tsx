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
  User,
  History,
  Heart,
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
import { useRoleplayData } from "@/hooks/useRoleplayData";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogCall?: () => void;
}

interface RecentAction {
  id: string;
  label: string;
  path?: string;
  action?: string;
  ts: number;
}

const RECENTS_KEY = "pv.command.recents";
const MAX_RECENTS = 5;

function loadRecents(): RecentAction[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushRecent(item: Omit<RecentAction, "ts">) {
  const next = [
    { ...item, ts: Date.now() },
    ...loadRecents().filter((r) => r.id !== item.id),
  ].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {}
}

export function CommandPalette({ open, onOpenChange, onLogCall }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { isManager, signOut } = useAuth();
  const { scenarios } = useRoleplayData();
  const [recents, setRecents] = useState<RecentAction[]>([]);

  useEffect(() => {
    if (open) setRecents(loadRecents());
  }, [open]);

  const go = (path: string, label: string, id?: string) => {
    pushRecent({ id: id || `nav:${path}`, label, path });
    onOpenChange(false);
    navigate(path);
  };

  const navItems = useMemo(
    () => [
      { label: "Command Center", path: "/", icon: LayoutDashboard },
      { label: "War Room", path: "/war-room", icon: Radio },
      { label: "Roleplay Arena", path: "/roleplay", icon: Swords },
      { label: "Call Intelligence", path: "/call-intelligence", icon: Brain },
      { label: "Objection Vault", path: "/objection-vault", icon: Shield },
      { label: "Open Pipeline", path: "/pipeline", icon: GitBranch },
      { label: "View Leaderboards", path: "/leaderboards", icon: Trophy },
      { label: "My Performance", path: "/performance", icon: TrendingUp },
      { label: "Achievements", path: "/achievements", icon: Award },
      { label: "Training Academy", path: "/training", icon: GraduationCap },
    ],
    []
  );

  const managerItems = useMemo(
    () => [
      { label: "Manager Dashboard", path: "/manager", icon: BarChart3 },
      { label: "Competitions", path: "/manager/competitions", icon: Gamepad2 },
      { label: "Coaching Console", path: "/coaching", icon: Users },
      { label: "Team Settings", path: "/team-settings", icon: Users },
    ],
    []
  );

  const runRecent = (r: RecentAction) => {
    if (r.path) {
      onOpenChange(false);
      navigate(r.path);
    } else if (r.action === "log-call" && onLogCall) {
      onOpenChange(false);
      onLogCall();
    } else if (r.action === "send-kudos") {
      go("/leaderboards", r.label, r.id);
    }
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command, jump to anything…" />
      <CommandList>
        <CommandEmpty>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Nothing matches that one
          </span>
        </CommandEmpty>

        {recents.length > 0 && (
          <>
            <CommandGroup heading="Recent">
              {recents.map((r) => (
                <CommandItem key={r.id} onSelect={() => runRecent(r)}>
                  <History className="mr-2 h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                  {r.label}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="Actions">
          {onLogCall && (
            <CommandItem
              onSelect={() => {
                pushRecent({ id: "act:log-call", label: "Log a call", action: "log-call" });
                onOpenChange(false);
                onLogCall();
              }}
            >
              <Phone className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
              Log a call
            </CommandItem>
          )}
          <CommandItem onSelect={() => go("/pipeline?new=1", "New deal", "act:new-deal")}>
            <Plus className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            New deal
          </CommandItem>
          <CommandItem onSelect={() => go("/roleplay", "Start a roleplay", "act:start-roleplay")}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            Start a roleplay
          </CommandItem>
          <CommandItem onSelect={() => go("/leaderboards", "Send kudos", "act:send-kudos")}>
            <Heart className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            Send kudos
          </CommandItem>
          <CommandItem onSelect={() => go("/pipeline", "Open pipeline", "act:open-pipeline")}>
            <GitBranch className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            Open pipeline
          </CommandItem>
          <CommandItem onSelect={() => go("/leaderboards", "View leaderboards", "act:view-leaderboards")}>
            <Trophy className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
            View leaderboards
          </CommandItem>
        </CommandGroup>

        {scenarios && scenarios.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Roleplay">
              {scenarios.slice(0, 8).map((s) => (
                <CommandItem
                  key={s.id}
                  onSelect={() =>
                    go(
                      `/roleplay/session?scenario=${s.id}`,
                      `Start roleplay: ${s.name}`,
                      `roleplay:${s.id}`,
                    )
                  }
                >
                  <Swords className="mr-2 h-4 w-4 text-primary" strokeWidth={1.5} />
                  Start roleplay: {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {navItems.map((item) => (
            <CommandItem key={item.path} onSelect={() => go(item.path, item.label)}>
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
                <CommandItem key={item.path} onSelect={() => go(item.path, item.label)}>
                  <item.icon className="mr-2 h-4 w-4" strokeWidth={1.5} />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        <CommandGroup heading="Account">
          <CommandItem onSelect={() => go("/performance", "Profile", "nav:profile")}>
            <User className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Profile
          </CommandItem>
          <CommandItem onSelect={() => go("/settings", "Settings", "nav:settings")}>
            <Cog className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Settings
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
