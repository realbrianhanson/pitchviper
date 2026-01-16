import { useState } from "react";
import { Link } from "react-router-dom";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { Swords, Phone, GitBranch, Trophy, Clock, ArrowRight } from "lucide-react";
import { LogCallModal } from "@/components/calls/LogCallModal";

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

export function QuickActions({ followUps }: QuickActionsProps) {
  const [showLogCall, setShowLogCall] = useState(false);
  return (
    <div className="space-y-4">
      {/* Quick Action Buttons */}
      <ViperCard variant="glass">
        <ViperCardHeader>
          <ViperCardTitle>Quick Actions</ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent className="grid grid-cols-2 gap-3">
          <Link to="/roleplay">
            <ViperButton variant="outline" className="w-full justify-start gap-2 h-12">
              <Swords className="h-4 w-4 text-primary" />
              Start Roleplay
            </ViperButton>
          </Link>
          <ViperButton 
            variant="outline" 
            className="w-full justify-start gap-2 h-12"
            onClick={() => setShowLogCall(true)}
          >
            <Phone className="h-4 w-4 text-success" />
            Log a Call
          </ViperButton>
          <LogCallModal open={showLogCall} onOpenChange={setShowLogCall} />
          <Link to="/pipeline">
            <ViperButton variant="outline" className="w-full justify-start gap-2 h-12">
              <GitBranch className="h-4 w-4 text-warning" />
              View Pipeline
            </ViperButton>
          </Link>
          <Link to="/leaderboards">
            <ViperButton variant="outline" className="w-full justify-start gap-2 h-12">
              <Trophy className="h-4 w-4 text-magenta" />
              Leaderboard
            </ViperButton>
          </Link>
        </ViperCardContent>
      </ViperCard>

      {/* Upcoming Follow-ups */}
      <ViperCard variant="default">
        <ViperCardHeader>
          <div className="flex items-center justify-between">
            <ViperCardTitle className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Upcoming Follow-ups
            </ViperCardTitle>
          </div>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="space-y-3">
            {followUps.slice(0, 3).map((followUp) => (
              <div
                key={followUp.id}
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
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </ViperCardContent>
      </ViperCard>
    </div>
  );
}