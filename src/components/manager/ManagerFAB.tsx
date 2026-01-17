import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, 
  Users, 
  Activity, 
  Megaphone, 
  Trophy, 
  X,
  MessageCircle
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
  const [isOpen, setIsOpen] = useState(false);

  // Only show for managers on mobile
  if (!isManager || !isMobile) return null;

  const actions = [
    {
      icon: Users,
      label: "Quick Coach",
      color: "bg-primary",
      onClick: () => navigate("/coaching")
    },
    {
      icon: Activity,
      label: "Team Pulse",
      color: "bg-blue-500",
      onClick: () => navigate("/war-room")
    },
    {
      icon: Megaphone,
      label: "Send Broadcast",
      color: "bg-amber-500",
      onClick: onSendBroadcast
    },
    {
      icon: Trophy,
      label: "Start Competition",
      color: "bg-green-500",
      onClick: onStartCompetition || (() => navigate("/competitions"))
    }
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action buttons */}
        {isOpen && (
          <div className="flex flex-col-reverse gap-3 mb-2 animate-in slide-in-from-bottom-5 duration-200">
            {actions.map((action, index) => (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick?.();
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 rounded-full pl-4 pr-5 py-3 shadow-lg",
                  "transition-all duration-200 hover:scale-105",
                  action.color,
                  "text-white"
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                <action.icon className="h-5 w-5" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Main FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full shadow-xl",
            "transition-all duration-300 transform",
            isOpen 
              ? "bg-muted rotate-45" 
              : "bg-primary hover:bg-primary/90"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <Plus className="h-6 w-6 text-primary-foreground" />
          )}
        </button>
      </div>
    </>
  );
}
