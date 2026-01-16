import { useState } from "react";
import { AlertTriangle, Flame, MessageSquare, ChevronRight } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { TeamMember } from "@/hooks/useManagerDashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PerformanceSnapshotProps {
  needsAttention: TeamMember[];
  onFire: TeamMember[];
  coachingDue: TeamMember[];
}

type ModalType = 'attention' | 'fire' | 'coaching' | null;

export function PerformanceSnapshot({ needsAttention, onFire, coachingDue }: PerformanceSnapshotProps) {
  const [modalType, setModalType] = useState<ModalType>(null);

  const getModalData = () => {
    switch (modalType) {
      case 'attention':
        return { title: 'Needs Attention', members: needsAttention, color: 'text-destructive' };
      case 'fire':
        return { title: 'On Fire 🔥', members: onFire, color: 'text-success' };
      case 'coaching':
        return { title: 'Coaching Due', members: coachingDue, color: 'text-warning' };
      default:
        return null;
    }
  };

  const modalData = getModalData();

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Needs Attention */}
        <button
          onClick={() => needsAttention.length > 0 && setModalType('attention')}
          className={cn(
            "text-left bg-destructive/10 border border-destructive/20 rounded-xl p-4 transition-all",
            needsAttention.length > 0 && "hover:bg-destructive/15 cursor-pointer"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">Needs Attention</span>
            </div>
            {needsAttention.length > 0 && <ChevronRight className="h-4 w-4 text-destructive" />}
          </div>
          <p className="text-3xl font-display font-bold text-destructive">
            {needsAttention.length}
          </p>
          <p className="text-sm text-destructive/70">reps below target</p>
        </button>

        {/* On Fire */}
        <button
          onClick={() => onFire.length > 0 && setModalType('fire')}
          className={cn(
            "text-left bg-success/10 border border-success/20 rounded-xl p-4 transition-all",
            onFire.length > 0 && "hover:bg-success/15 cursor-pointer"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-success" />
              <span className="font-semibold text-success">On Fire</span>
            </div>
            {onFire.length > 0 && <ChevronRight className="h-4 w-4 text-success" />}
          </div>
          <p className="text-3xl font-display font-bold text-success">
            {onFire.length}
          </p>
          <p className="text-sm text-success/70">reps exceeding target</p>
        </button>

        {/* Coaching Due */}
        <button
          onClick={() => coachingDue.length > 0 && setModalType('coaching')}
          className={cn(
            "text-left bg-warning/10 border border-warning/20 rounded-xl p-4 transition-all",
            coachingDue.length > 0 && "hover:bg-warning/15 cursor-pointer"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-warning" />
              <span className="font-semibold text-warning">Coaching Due</span>
            </div>
            {coachingDue.length > 0 && <ChevronRight className="h-4 w-4 text-warning" />}
          </div>
          <p className="text-3xl font-display font-bold text-warning">
            {coachingDue.length}
          </p>
          <p className="text-sm text-warning/70">reps not coached in 7+ days</p>
        </button>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!modalType} onOpenChange={() => setModalType(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={modalData?.color}>{modalData?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {modalData?.members.map(member => (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={member.avatar_url || undefined} />
                  <AvatarFallback>
                    {member.full_name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{member.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {member.today_calls} calls • {member.today_appointments} appts • ${member.today_revenue.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
            {modalData?.members.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No team members in this category.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}