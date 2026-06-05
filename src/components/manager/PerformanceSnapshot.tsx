import { useState } from "react";
import { AlertTriangle, Flame, MessageSquare, ArrowUpRight } from "lucide-react";
import { TeamMember } from "@/hooks/useManagerDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PerformanceSnapshotProps {
  needsAttention: TeamMember[];
  onFire: TeamMember[];
  coachingDue: TeamMember[];
}

type ModalType = "attention" | "fire" | "coaching" | null;

export function PerformanceSnapshot({ needsAttention, onFire, coachingDue }: PerformanceSnapshotProps) {
  const [modalType, setModalType] = useState<ModalType>(null);

  const tiles = [
    {
      key: "attention" as ModalType,
      icon: AlertTriangle,
      label: "Needs Attention",
      caption: "below target",
      count: needsAttention.length,
      tone: "text-destructive",
      rule: "bg-destructive",
    },
    {
      key: "fire" as ModalType,
      icon: Flame,
      label: "On Fire",
      caption: "exceeding target",
      count: onFire.length,
      tone: "text-success",
      rule: "bg-success",
    },
    {
      key: "coaching" as ModalType,
      icon: MessageSquare,
      label: "Coaching Due",
      caption: "idle 7+ days",
      count: coachingDue.length,
      tone: "text-warning",
      rule: "bg-warning",
    },
  ];

  const modalData = (() => {
    switch (modalType) {
      case "attention": return { title: "Needs Attention", members: needsAttention, tone: "text-destructive" };
      case "fire": return { title: "On Fire", members: onFire, tone: "text-success" };
      case "coaching": return { title: "Coaching Due", members: coachingDue, tone: "text-warning" };
      default: return null;
    }
  })();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
        {tiles.map((t) => (
          <button
            key={t.key}
            onClick={() => t.count > 0 && setModalType(t.key)}
            className="text-left bg-background p-6 hover:bg-card transition-colors group relative"
          >
            <div className={cn("absolute left-0 top-0 bottom-0 w-[2px]", t.rule)} />
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <t.icon className={cn("h-3.5 w-3.5", t.tone)} strokeWidth={1.5} />
                <span className={cn("font-mono text-[10px] uppercase tracking-[0.2em]", t.tone)}>
                  {t.label}
                </span>
              </div>
              {t.count > 0 && (
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" strokeWidth={1.5} />
              )}
            </div>
            <p className={cn("font-display italic text-5xl leading-none tabular-nums", t.tone)}>
              {t.count}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-3">
              reps {t.caption}
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!modalType} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={cn("font-display italic text-2xl", modalData?.tone)}>
              {modalData?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {modalData?.members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-3 bg-muted/30 border border-border"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.full_name.split(" ").map((n) => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-base truncate">{member.full_name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                    {member.today_calls} calls · {member.today_appointments} appts · ${member.today_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {modalData?.members.length === 0 && (
              <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground py-6">
                No members in this category
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
