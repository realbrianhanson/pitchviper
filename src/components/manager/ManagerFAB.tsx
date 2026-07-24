import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Plus,
  Users,
  Activity,
  Megaphone,
  Trophy,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";

interface ManagerFABProps {
  onSendBroadcast?: () => void;
  onStartCompetition?: () => void;
}

export function ManagerFAB({ onSendBroadcast, onStartCompetition }: ManagerFABProps) {
  const { isManager } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  if (!isManager || !isMobile || location.pathname === "/manager") return null;

  const actions = [
    {
      icon: Users,
      label: "Quick Coach",
      ariaLabel: "Open coaching console",
      onClick: () => navigate("/coaching"),
    },
    {
      icon: Activity,
      label: "Team Pulse",
      ariaLabel: "Open team pulse in war room",
      onClick: () => navigate("/war-room"),
    },
    {
      icon: Megaphone,
      label: "Send Broadcast",
      ariaLabel: "Send broadcast message to team",
      onClick: onSendBroadcast,
    },
    {
      icon: Trophy,
      label: "Start Competition",
      ariaLabel: "Start a new team competition",
      onClick: onStartCompetition || (() => navigate("/manager/competitions")),
    },
  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="fixed bottom-[72px] right-4 z-50 flex flex-col-reverse items-end gap-2">
        {isOpen && (
          <div className="flex flex-col-reverse gap-2 mb-1">
            {actions.map((action) => (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick?.();
                  setIsOpen(false);
                }}
                aria-label={action.ariaLabel}
                className={cn(
                  "flex items-center gap-2.5 px-3.5 py-2 rounded-lg border border-border bg-card",
                  "text-foreground text-[13px] hover:bg-accent transition-colors shadow-elev-sm"
                )}
              >
                <action.icon className="h-4 w-4 text-primary" strokeWidth={1.75} />
                <span className="whitespace-nowrap">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close manager quick actions" : "Open manager quick actions"}
          aria-expanded={isOpen}
          className={cn(
            "flex items-center justify-center w-12 h-12 rounded-xl border border-border shadow-elev-sm",
            "transition-colors",
            isOpen
              ? "bg-card text-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {isOpen ? (
            <X className="h-5 w-5" strokeWidth={1.75} />
          ) : (
            <Plus className="h-5 w-5" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </>
  );
}
