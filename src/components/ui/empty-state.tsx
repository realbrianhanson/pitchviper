import { ReactNode } from "react";
import { 
  Phone, 
  Briefcase, 
  Users, 
  Bell, 
  TrendingUp, 
  Trophy,
  BookOpen,
  Target,
  Plus,
  ArrowRight
} from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  type: 
    | "calls" 
    | "deals" 
    | "team" 
    | "notifications" 
    | "leaderboard"
    | "training"
    | "badges"
    | "activities"
    | "generic";
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const emptyStateConfigs = {
  calls: {
    icon: Phone,
    title: "No calls logged yet",
    description: "Start dialing and log your first call to track your progress and climb the leaderboard!",
    actionLabel: "Log Your First Call",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  deals: {
    icon: Briefcase,
    title: "Your pipeline is empty",
    description: "Add your first deal to start tracking your sales pipeline and get AI-powered coaching insights.",
    actionLabel: "Add Your First Deal",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  team: {
    icon: Users,
    title: "No team members yet",
    description: "Build your dream team! Share your team code to invite colleagues and start competing together.",
    actionLabel: "Invite Team Members",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  notifications: {
    icon: Bell,
    title: "All caught up! 🎉",
    description: "You've seen all your notifications. Keep crushing it and new updates will appear here.",
    actionLabel: undefined,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  leaderboard: {
    icon: Trophy,
    title: "Leaderboard loading...",
    description: "Start making calls and closing deals to appear on the leaderboard!",
    actionLabel: "View Dashboard",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  training: {
    icon: BookOpen,
    title: "No training modules yet",
    description: "Training content is being prepared. Check back soon for new learning opportunities!",
    actionLabel: undefined,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  badges: {
    icon: Target,
    title: "No badges earned yet",
    description: "Complete challenges, hit milestones, and log activities to earn your first badge!",
    actionLabel: "View Challenges",
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
  },
  activities: {
    icon: TrendingUp,
    title: "No recent activity",
    description: "Your activity feed will show up here as you log calls, close deals, and earn achievements.",
    actionLabel: undefined,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  generic: {
    icon: Target,
    title: "Nothing here yet",
    description: "This section will be populated as you use the app.",
    actionLabel: undefined,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

export function EmptyState({ 
  type, 
  title, 
  description, 
  actionLabel, 
  onAction,
  className 
}: EmptyStateProps) {
  const config = emptyStateConfigs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "flex flex-col items-center justify-center py-12 px-6 text-center",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className={cn(
          "p-4 rounded-full mb-4",
          config.bgColor
        )}
      >
        <Icon className={cn("h-8 w-8", config.color)} />
      </motion.div>

      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold text-foreground mb-2"
      >
        {title || config.title}
      </motion.h3>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground max-w-sm mb-6"
      >
        {description || config.description}
      </motion.p>

      {(actionLabel || config.actionLabel) && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <ViperButton onClick={onAction} className="gap-2">
            <Plus className="h-4 w-4" />
            {actionLabel || config.actionLabel}
          </ViperButton>
        </motion.div>
      )}
    </motion.div>
  );
}
