import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Flame, MessageSquare, ArrowUpRight } from "lucide-react";
import { TeamMember } from "@/hooks/useManagerDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PerformanceSnapshotProps {
  needsAttention: TeamMember[];
  onFire: TeamMember[];
  coachingDue: TeamMember[];
}

type ModalType = "attention" | "fire" | "coaching" | null;

function cleanName(name: string): string {
  return name.replace(/https?:\/\/\S+/gi, "").replace(/\s+/g, " ").trim();
}

function initials(name: string): string {
  return cleanName(name).split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

export function PerformanceSnapshot({ needsAttention, onFire, coachingDue }: PerformanceSnapshotProps) {
  const [modalType, setModalType] = useState<ModalType>(null);

  const tiles = [
    {
      key: "attention" as ModalType,
      icon: AlertTriangle,
      label: "Needs attention",
      caption: "below target",
      count: needsAttention.length,
      iconBg: "bg-destructive/10 text-destructive",
      tint: "hover:bg-destructive/5",
    },
    {
      key: "fire" as ModalType,
      icon: Flame,
      label: "On fire",
      caption: "exceeding target",
      count: onFire.length,
      iconBg: "bg-success/10 text-success",
      tint: "hover:bg-success/5",
    },
    {
      key: "coaching" as ModalType,
      icon: MessageSquare,
      label: "Coaching due",
      caption: "idle 7+ days",
      count: coachingDue.length,
      iconBg: "bg-warning/10 text-warning",
      tint: "hover:bg-warning/5",
    },
  ];

  const modalData = (() => {
    switch (modalType) {
      case "attention":
        return {
          title: "Needs attention",
          description: "Reps trending below their targets today.",
          members: needsAttention,
        };
      case "fire":
        return {
          title: "On fire",
          description: "Reps exceeding their targets today.",
          members: onFire,
        };
      case "coaching":
        return {
          title: "Coaching due",
          description: "Reps who haven't had a coaching touchpoint in 7+ days.",
          members: coachingDue,
        };
      default:
        return null;
    }
  })();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => t.count > 0 && setModalType(t.key)}
              className={cn(
                "text-left rounded-[12px] border border-border bg-card p-5 shadow-sm transition-colors group",
                t.count > 0 ? t.tint : "cursor-default"
              )}
              disabled={t.count === 0}
            >
              <div className="flex items-start justify-between mb-4">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-md",
                    t.iconBg
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                {t.count > 0 && (
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                )}
              </div>
              <p className="text-[32px] font-semibold leading-none tabular-nums text-foreground">
                {t.count}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                <span className="text-foreground/80 font-medium">{t.label}</span>
                <span className="text-muted-foreground"> · {t.caption}</span>
              </p>
            </button>
          );
        })}
      </div>

      <Dialog open={!!modalType} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalData?.title}</DialogTitle>
            <DialogDescription>{modalData?.description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {modalData?.members.map((member) => {
              const name = cleanName(member.full_name);
              return (
                <div
                  key={member.user_id}
                  className="flex items-center gap-3 p-3 rounded-[10px] border border-border bg-card"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url || undefined} alt={name} />
                    <AvatarFallback className="text-xs">{initials(name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {member.today_calls} calls · {member.today_appointments} appts · ${member.today_revenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            {modalData?.members.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">
                No members in this category
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
