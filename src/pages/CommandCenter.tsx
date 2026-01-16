import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperStat } from "@/components/ui/viper-stat";
import { ViperBadge } from "@/components/ui/viper-badge";
import { DollarSign, Target, TrendingUp, Users, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  xp_points: number;
  current_level: number;
  current_streak: number;
}

export default function CommandCenter() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, title, xp_points, current_level, current_streak")
        .eq("user_id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }
    };

    loadProfile();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout title="Command Center">
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Banner */}
        <ViperCard variant="glow" className="relative overflow-hidden">
          <ViperCardContent className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    className="h-16 w-16 rounded-full object-cover border-2 border-primary shadow-glow-sm"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                    <span className="text-2xl font-display font-bold text-primary">
                      {firstName.charAt(0)}
                    </span>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground mb-1">Welcome back,</p>
                  <h2 className="text-3xl font-display font-bold text-foreground">
                    {firstName}
                  </h2>
                  {profile?.title && (
                    <p className="text-sm text-muted-foreground mt-1">{profile.title}</p>
                  )}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-3">
                <ViperBadge variant="default">
                  Level {profile?.current_level || 1}
                </ViperBadge>
                <ViperBadge variant="success" glow>
                  {profile?.xp_points || 0} XP
                </ViperBadge>
                {(profile?.current_streak || 0) > 0 && (
                  <ViperBadge variant="magenta">
                    🔥 {profile?.current_streak} day streak
                  </ViperBadge>
                )}
              </div>
            </div>
          </ViperCardContent>
        </ViperCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ViperStat
            label="Revenue MTD"
            value="$127,450"
            change={18.2}
            changeLabel="vs last month"
            icon={<DollarSign className="h-5 w-5" />}
            variant="glow"
          />
          <ViperStat
            label="Deals Closed"
            value="23"
            change={12}
            changeLabel="this month"
            icon={<Target className="h-5 w-5" />}
          />
          <ViperStat
            label="Win Rate"
            value="68%"
            change={5.3}
            changeLabel="improvement"
            icon={<TrendingUp className="h-5 w-5" />}
            variant="glass"
          />
          <ViperStat
            label="Active Deals"
            value="47"
            change={-2}
            changeLabel="in pipeline"
            icon={<Users className="h-5 w-5" />}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ViperCard variant="glass" hover="lift" className="lg:col-span-2">
            <ViperCardHeader>
              <ViperCardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Today's Priorities
              </ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <div className="space-y-3">
                {[
                  { task: "Follow up with Acme Corp", priority: "high", time: "10:00 AM" },
                  { task: "Demo prep for TechStart", priority: "medium", time: "2:00 PM" },
                  { task: "Send proposal to GlobalTech", priority: "high", time: "4:00 PM" },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${item.priority === "high" ? "bg-magenta" : "bg-warning"}`} />
                      <span className="text-foreground">{item.task}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{item.time}</span>
                  </div>
                ))}
              </div>
            </ViperCardContent>
          </ViperCard>

          <ViperCard variant="default" hover="glow">
            <ViperCardHeader>
              <ViperCardTitle>Leaderboard Position</ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <div className="text-center">
                <p className="text-6xl font-display font-bold text-gradient">#3</p>
                <p className="text-muted-foreground mt-2">Out of 24 reps</p>
                <p className="text-sm text-success mt-4">↑ 2 positions this week</p>
              </div>
            </ViperCardContent>
          </ViperCard>
        </div>
      </div>
    </AppLayout>
  );
}