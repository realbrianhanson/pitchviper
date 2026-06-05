import { useState } from "react";
import { Link } from "react-router-dom";
import { Swords, Phone, GitBranch, Trophy } from "lucide-react";
import { LogCallModal } from "@/components/calls/LogCallModal";
import { motion } from "framer-motion";

interface FollowUp {
  id: string;
  company: string;
  contact: string;
  time: string;
  type: string;
}

interface QuickActionsProps {
  followUps: FollowUp[];
}

const quickActionButtons = [
  { to: "/roleplay", icon: Swords, label: "Roleplay Arena", verb: "Start", hotkey: "⌘R" },
  { to: null, icon: Phone, label: "Log Session", verb: "Open", action: "logCall", hotkey: "⌘L" },
  { to: "/pipeline", icon: GitBranch, label: "Pipeline Map", verb: "View", hotkey: "⌘P" },
  { to: "/leaderboards", icon: Trophy, label: "Leaderboard", verb: "Open", hotkey: "⌘B" },
];

export function QuickActions({ followUps }: QuickActionsProps) {
  const [showLogCall, setShowLogCall] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-px bg-border border border-border"
    >
      {/* Quick Actions */}
      <div className="bento-tile bg-background">
        <div className="eyebrow font-bold mb-6">Quick Actions</div>
        <div className="space-y-px">
          {quickActionButtons.map((b) => {
            const Inner = (
              <button
                onClick={b.action === "logCall" ? () => setShowLogCall(true) : undefined}
                className="w-full flex justify-between items-center py-3 border-b border-border last:border-b-0 hover:text-primary transition-colors group"
              >
                <span className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-[10px] text-primary uppercase tracking-[0.15em] group-hover:translate-x-1 transition-transform">
                    → {b.verb}
                  </span>
                  {b.label}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground/40">{b.hotkey}</span>
              </button>
            );
            return b.to ? (
              <Link key={b.label} to={b.to} className="block">{Inner}</Link>
            ) : (
              <div key={b.label}>{Inner}</div>
            );
          })}
        </div>
        <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />
      </div>

      {/* Follow-ups */}
      <div className="bento-tile">
        <div className="eyebrow font-bold mb-6">Urgent Follow-ups</div>
        {followUps.length === 0 ? (
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/50 py-4">
            No scheduled follow-ups
          </div>
        ) : (
          <div className="space-y-6">
            {followUps.slice(0, 3).map((f, i) => (
              <div key={f.id} className="group cursor-pointer">
                <div className={`font-mono text-[10px] uppercase tracking-[0.15em] mb-1 ${i === 0 ? "text-destructive italic" : "text-muted-foreground/50"}`}>
                  {i === 0 ? "Next Up" : `In ${(i + 1) * 45} min`}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm group-hover:text-primary transition-colors">{f.company}</div>
                  <div className="font-mono text-xs text-primary tabular-nums">{f.time}</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground/50 mt-1">
                  {f.contact} • {f.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
