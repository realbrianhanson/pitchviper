import { useState } from "react";
import { Link } from "react-router-dom";
import { Swords, Phone, GitBranch, Trophy } from "lucide-react";
import { LogCallModal } from "@/components/calls/LogCallModal";
import { motion } from "framer-motion";
import { EditorialSkeleton } from "@/components/ui/editorial-skeleton";

interface FollowUp {
  id: string;
  company: string;
  contact: string;
  time: string;
  type: string;
}

interface QuickActionsProps {
  followUps: FollowUp[];
  followUpsLoading?: boolean;
  followUpsError?: string | null;
}

const quickActionButtons = [
  { to: "/roleplay", icon: Swords, label: "Roleplay", hotkey: "⌘R" },
  { to: null, icon: Phone, label: "Log call", action: "logCall", hotkey: "⌘L" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline", hotkey: "⌘P" },
  { to: "/leaderboards", icon: Trophy, label: "Leaderboard", hotkey: "⌘B" },
];

function FollowUpSkeleton() {
  return (
    <div className="space-y-2 py-2">
      <EditorialSkeleton className="h-3 w-16" />
      <div className="flex items-center justify-between">
        <EditorialSkeleton className="h-4 w-28" />
        <EditorialSkeleton className="h-4 w-12" />
      </div>
    </div>
  );
}

export function QuickActions({ followUps, followUpsLoading = false, followUpsError = null }: QuickActionsProps) {
  const [showLogCall, setShowLogCall] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[12px] border border-border bg-card p-6 shadow-sm h-full flex flex-col"
    >
      <h3 className="text-base font-semibold text-foreground mb-4">Quick actions</h3>

      <div className="grid grid-cols-2 gap-2">
        {quickActionButtons.map((b) => {
          const Icon = b.icon;
          const content = (
            <button
              type="button"
              onClick={b.action === "logCall" ? () => setShowLogCall(true) : undefined}
              className="w-full h-full flex flex-col items-start gap-2 rounded-[10px] border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent min-h-[76px]"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <div className="flex items-center justify-between w-full">
                <span className="text-sm font-medium text-foreground">{b.label}</span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">{b.hotkey}</span>
              </div>
            </button>
          );
          return b.to ? (
            <Link key={b.label} to={b.to} className="block">{content}</Link>
          ) : (
            <div key={b.label}>{content}</div>
          );
        })}
      </div>

      <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />

      <div className="mt-6 pt-6 border-t border-border flex-1">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-foreground">Upcoming follow-ups</h4>
        </div>
        {followUpsLoading ? (
          <div className="divide-y divide-border">
            <FollowUpSkeleton />
            <FollowUpSkeleton />
            <FollowUpSkeleton />
          </div>
        ) : followUpsError ? (
          <div className="py-3">
            <p className="text-sm font-medium text-foreground mb-1">Unable to load</p>
            <p className="text-xs text-muted-foreground">{followUpsError}</p>
          </div>
        ) : followUps.length === 0 ? (
          <p className="text-sm text-muted-foreground py-3">No scheduled follow-ups</p>
        ) : (
          <div className="divide-y divide-border">
            {followUps.slice(0, 3).map((f) => (
              <div key={f.id} className="py-3 group cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                    {f.company}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums shrink-0 ml-2">{f.time}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                  {f.contact} · {f.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
