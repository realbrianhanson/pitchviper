import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { DailyChallenge } from "@/components/dashboard/DailyChallenge";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { TeamPulse } from "@/components/dashboard/TeamPulse";
import { MotivationalQuote } from "@/components/dashboard/MotivationalQuote";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Calendar, Target, TrendingUp } from "lucide-react";

interface Profile {
  full_name: string;
  avatar_url: string | null;
  title: string | null;
  xp_points: number;
  current_level: number;
  current_streak: number;
  team_id: string | null;
}

interface Team {
  id: string;
  name: string;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatDate(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// Mock data - will be replaced with real data later
const mockActivities = [
  {
    id: "1",
    type: "deal" as const,
    description: "Closed deal with TechCorp Inc.",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    value: "$45,000",
  },
  {
    id: "2",
    type: "call" as const,
    description: "Completed discovery call with Acme Corp",
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: "3",
    type: "badge" as const,
    description: "Earned 'First Blood' badge for closing first deal of the day",
    timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    value: "+100 XP",
  },
  {
    id: "4",
    type: "appointment" as const,
    description: "Scheduled demo with GlobalTech for Friday",
    timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: "5",
    type: "call" as const,
    description: "Follow-up call with DataSmart completed",
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
  },
];

const mockFollowUps = [
  { id: "1", company: "Acme Corp", contact: "John Smith", time: "10:30 AM", type: "Follow-up" },
  { id: "2", company: "TechStart", contact: "Sarah Lee", time: "2:00 PM", type: "Demo" },
  { id: "3", company: "GlobalTech", contact: "Mike Chen", time: "4:30 PM", type: "Proposal Review" },
];

const mockTeamMembers = [
  { id: "1", name: "Sarah Johnson", value: 12, metric: "calls", rank: 1 },
  { id: "2", name: "Mike Chen", value: 10, metric: "calls", rank: 2 },
  { id: "3", name: "Alex Rivera", value: 8, metric: "calls", rank: 3 },
];

export default function CommandCenter() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [team, setTeam] = useState<Team | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, title, xp_points, current_level, current_streak, team_id")
        .eq("user_id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);

        // Load team if exists
        if (profileData.team_id) {
          const { data: teamData } = await supabase
            .from("teams")
            .select("id, name")
            .eq("id", profileData.team_id)
            .single();

          if (teamData) {
            setTeam(teamData);
          }
        }
      }
    };

    loadData();
  }, [user]);

  const firstName = profile?.full_name?.split(" ")[0] || "there";

  return (
    <AppLayout title="Command Center">
      <div className="space-y-6 animate-fade-in">
        {/* Top Section - Greeting */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">
              {getGreeting()}, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">{formatDate()}</p>
          </div>
        </div>

        {/* Daily Challenge & Streak */}
        <DailyChallenge
          challenge={{
            title: "Cold Call Champion",
            description: "Make 15 cold calls today to earn bonus XP and climb the leaderboard.",
            reward: 250,
            progress: 7,
            goal: 15,
          }}
          streak={profile?.current_streak || 0}
        />

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Calls Today"
            value={23}
            icon={Phone}
            comparison={{ value: 15, label: "vs yesterday" }}
            delay={0}
          />
          <MetricCard
            label="Appointments Set"
            value={5}
            icon={Calendar}
            progress={{ current: 5, goal: 8 }}
            delay={100}
          />
          <MetricCard
            label="Deals Closed"
            value={127450}
            format="currency"
            icon={Target}
            comparison={{ value: 23, label: "vs last week" }}
            delay={200}
          />
          <MetricCard
            label="Conversion Rate"
            value={68}
            format="percentage"
            icon={TrendingUp}
            comparison={{ value: 5, label: "improvement" }}
            delay={300}
          />
        </div>

        {/* Middle Section - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Activity Feed */}
          <div className="lg:col-span-2">
            <RecentActivity activities={mockActivities} />
          </div>

          {/* Right Column - Quick Actions & Follow-ups */}
          <div>
            <QuickActions followUps={mockFollowUps} />
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team Pulse */}
          <TeamPulse members={mockTeamMembers} teamName={team?.name || null} />

          {/* Motivational Quote */}
          <div className="flex flex-col justify-center">
            <MotivationalQuote />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}