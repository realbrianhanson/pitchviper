import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { ViperBadge } from "@/components/ui/viper-badge";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TeamMember {
  id: string;
  name: string;
  avatarUrl?: string;
  value: number;
  metric: string;
  rank: number;
}

interface TeamPulseProps {
  members: TeamMember[];
  teamName: string | null;
}

const rankColors = [
  "bg-gradient-to-r from-yellow-500 to-amber-500 text-white", // 1st
  "bg-gradient-to-r from-gray-400 to-gray-500 text-white", // 2nd
  "bg-gradient-to-r from-amber-700 to-amber-800 text-white", // 3rd
];

const podiumHeights = [28, 20, 16]; // 1st, 2nd, 3rd

export function TeamPulse({ members, teamName }: TeamPulseProps) {
  if (!teamName) {
    return (
      <ViperCard variant="glass">
        <ViperCardContent className="py-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground">Join a team to see the Team Pulse</p>
        </ViperCardContent>
      </ViperCard>
    );
  }

  const renderPodiumMember = (member: TeamMember | undefined, index: number, order: number) => {
    if (!member) return null;
    
    const isFirst = index === 0;
    const height = podiumHeights[index];
    const avatarSize = isFirst ? "h-16 w-16" : "h-12 w-12";
    const podiumWidth = isFirst ? "w-20" : "w-16";
    const rankSize = isFirst ? "text-3xl" : "text-2xl";

    return (
      <motion.div
        key={member.id}
        className="flex flex-col items-center"
        style={{ marginBottom: isFirst ? -16 : 0 }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 24,
          delay: order * 0.15 + 0.2,
        }}
      >
        <motion.div
          className="relative mb-2"
          whileHover={{ scale: 1.1 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {isFirst && (
            <motion.div
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-10"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 500 }}
            >
              <span className="text-xl">👑</span>
            </motion.div>
          )}
          {member.avatarUrl ? (
            <img
              src={member.avatarUrl}
              alt={member.name}
              className={cn(
                avatarSize,
                "rounded-full object-cover border-2",
                isFirst ? "border-yellow-400 shadow-glow-sm" : index === 1 ? "border-gray-400" : "border-amber-700"
              )}
            />
          ) : (
            <div className={cn(
              avatarSize,
              "rounded-full flex items-center justify-center font-bold",
              isFirst 
                ? "bg-yellow-500/20 text-yellow-500 text-xl" 
                : index === 1 
                  ? "bg-gray-500/20 text-gray-400 text-lg" 
                  : "bg-amber-700/20 text-amber-700 text-lg"
            )}>
              {member.name.charAt(0)}
            </div>
          )}
        </motion.div>
        
        {/* Animated Podium */}
        <motion.div
          className={cn(podiumWidth, "rounded-t-lg flex flex-col items-center justify-start pt-2", rankColors[index])}
          initial={{ height: 0 }}
          animate={{ height: height * 4 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: order * 0.15 + 0.3,
          }}
        >
          <motion.span
            className={cn(rankSize, "font-bold")}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: order * 0.15 + 0.5, type: "spring", stiffness: 500 }}
          >
            {index + 1}
          </motion.span>
        </motion.div>
        
        <motion.p
          className="text-xs text-muted-foreground mt-2 text-center truncate max-w-[80px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: order * 0.15 + 0.6 }}
        >
          {member.name.split(" ")[0]}
        </motion.p>
        <motion.p
          className="text-xs font-medium text-foreground"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: order * 0.15 + 0.7, type: "spring", stiffness: 400 }}
        >
          {member.value}
        </motion.p>
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24, delay: 0.4 }}
    >
      <ViperCard variant="glass">
        <ViperCardHeader>
          <div className="flex items-center justify-between">
            <ViperCardTitle className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, delay: 0.8 }}
              >
                <Trophy className="h-5 w-5 text-warning" />
              </motion.div>
              Team Pulse
            </ViperCardTitle>
            <ViperBadge variant="glass">{teamName}</ViperBadge>
          </div>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            {renderPodiumMember(members[1], 1, 1)}
            {/* 1st Place */}
            {renderPodiumMember(members[0], 0, 0)}
            {/* 3rd Place */}
            {renderPodiumMember(members[2], 2, 2)}
          </div>
          <motion.p
            className="text-xs text-center text-muted-foreground mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Today's {members[0]?.metric || "performance"}
          </motion.p>
        </ViperCardContent>
      </ViperCard>
    </motion.div>
  );
}