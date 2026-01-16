import { Award, Trophy, Activity } from "lucide-react";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { AchievementStats } from "@/components/achievements/AchievementStats";
import { BadgeGallery } from "@/components/achievements/BadgeGallery";
import { RecentAchievementsFeed } from "@/components/achievements/RecentAchievementsFeed";

export default function Achievements() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-3">
          <Award className="h-8 w-8 text-primary" />
          My Achievements
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your badges, milestones, and accomplishments
        </p>
      </div>

      {/* Stats Header */}
      <AchievementStats />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Badge Gallery */}
        <div className="lg:col-span-2">
          <ViperCard>
            <ViperCardHeader>
              <ViperCardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Badge Collection
              </ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <BadgeGallery />
            </ViperCardContent>
          </ViperCard>
        </div>

        {/* Recent Achievements Feed */}
        <div>
          <ViperCard>
            <ViperCardHeader>
              <ViperCardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Recent Team Achievements
              </ViperCardTitle>
            </ViperCardHeader>
            <ViperCardContent>
              <RecentAchievementsFeed />
            </ViperCardContent>
          </ViperCard>
        </div>
      </div>
    </div>
  );
}