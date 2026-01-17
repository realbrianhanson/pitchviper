import { useState } from "react";
import { Link } from "react-router-dom";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Swords, Phone, GitBranch, Trophy, Clock, ArrowRight } from "lucide-react";
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
  { to: "/roleplay", icon: Swords, label: "Start Roleplay", color: "text-primary" },
  { to: null, icon: Phone, label: "Log a Call", color: "text-success", action: "logCall" },
  { to: "/pipeline", icon: GitBranch, label: "View Pipeline", color: "text-warning" },
  { to: "/leaderboards", icon: Trophy, label: "Leaderboard", color: "text-magenta" },
];

export function QuickActions({ followUps }: QuickActionsProps) {
  const [showLogCall, setShowLogCall] = useState(false);
  
  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.35 }}
    >
      {/* Quick Action Buttons */}
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>Quick Actions</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="grid grid-cols-2 gap-3">
          {quickActionButtons.map((button, index) => {
            const Icon = button.icon;
            const ButtonContent = (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <ViperButton 
                  variant="outline" 
                  className="w-full justify-start gap-2 h-12"
                  onClick={button.action === "logCall" ? () => setShowLogCall(true) : undefined}
                >
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon className={`h-4 w-4 ${button.color}`} />
                  </motion.div>
                  {button.label}
                </ViperButton>
              </motion.div>
            );
            
            if (button.to) {
              return (
                <Link key={button.label} to={button.to}>
                  {ButtonContent}
                </Link>
              );
            }
            return <div key={button.label}>{ButtonContent}</div>;
          })}
          <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />
        </ViperCardContent>
      </ViperCard>

      {/* Upcoming Follow-ups */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <ViperCard variant="default">
          <ViperCardHeader>
            <div className="flex items-center justify-between">
              <ViperCardTitle className="flex items-center gap-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                >
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </motion.div>
                Upcoming Follow-ups
              </ViperCardTitle>
            </div>
          </ViperCardHeader>
          <ViperCardContent>
            <div className="space-y-3">
              {followUps.slice(0, 3).map((followUp, index) => (
                <motion.div
                  key={followUp.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ 
                    x: 4,
                    transition: { type: "spring", stiffness: 400, damping: 25 }
                  }}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border hover:border-primary/30 transition-colors cursor-pointer group"
                >
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {followUp.company}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {followUp.contact} • {followUp.type}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-primary font-medium">
                      {followUp.time}
                    </span>
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </ViperCardContent>
        </ViperCard>
      </motion.div>
    </motion.div>
  );
}