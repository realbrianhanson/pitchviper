import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, Flame, HandMetal, Trophy, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
}

interface ChatMessageProps {
  message: {
    id: string;
    user_id: string;
    message_type: "text" | "kudos" | "system";
    content: string;
    metadata: Record<string, unknown>;
    created_at: string;
    profiles?: {
      full_name: string;
      avatar_url: string | null;
    };
    reactions?: ChatReaction[];
  };
  onReact: (messageId: string, reaction: string) => void;
}

const REACTIONS = [
  { emoji: "👍", icon: ThumbsUp, label: "thumbs_up" },
  { emoji: "🔥", icon: Flame, label: "fire" },
  { emoji: "👏", icon: HandMetal, label: "clap" },
];

export function ChatMessage({ message, onReact }: ChatMessageProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);

  const isOwnMessage = message.user_id === user?.id;
  const isSystemMessage = message.message_type === "system";
  const isKudosMessage = message.message_type === "kudos";

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Group reactions by type
  const reactionCounts = message.reactions?.reduce((acc, r) => {
    acc[r.reaction] = (acc[r.reaction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const hasUserReacted = (reaction: string) => {
    return message.reactions?.some(r => r.user_id === user?.id && r.reaction === reaction);
  };

  if (isSystemMessage) {
    return (
      <div className="flex justify-center py-2">
        <div className="bg-primary/10 border border-primary/20 rounded-full px-4 py-2 text-sm text-primary">
          {message.content}
        </div>
      </div>
    );
  }

  if (isKudosMessage) {
    return (
      <div className="flex justify-center py-3">
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-lg px-6 py-4 max-w-md">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-amber-500/20">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <span className="font-display font-semibold text-amber-400">
              Kudos!
            </span>
          </div>
          <p className="text-sm text-foreground">{message.content}</p>
          {message.metadata?.note && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              "{message.metadata.note as string}"
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-3 py-2 px-3 hover:bg-accent/50 rounded-lg transition-colors",
        isOwnMessage && "flex-row-reverse"
      )}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      {/* Avatar */}
      {message.profiles?.avatar_url ? (
        <img
          src={message.profiles.avatar_url}
          alt={message.profiles.full_name}
          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
        />
      ) : (
        <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-primary">
            {message.profiles?.full_name ? getInitials(message.profiles.full_name) : "?"}
          </span>
        </div>
      )}

      {/* Message content */}
      <div className={cn("flex-1 min-w-0", isOwnMessage && "text-right")}>
        <div className={cn("flex items-baseline gap-2", isOwnMessage && "justify-end")}>
          <span className="font-medium text-sm text-foreground">
            {message.profiles?.full_name || "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
        </div>
        
        <div className={cn(
          "mt-1 inline-block rounded-lg px-3 py-2 max-w-[80%]",
          isOwnMessage 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted text-foreground"
        )}>
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>

        {/* Reactions */}
        <div className={cn("flex items-center gap-1 mt-1", isOwnMessage && "justify-end")}>
          {Object.entries(reactionCounts).map(([reaction, count]) => (
            <button
              key={reaction}
              onClick={() => onReact(message.id, reaction)}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                hasUserReacted(reaction)
                  ? "bg-primary/20 text-primary"
                  : "bg-muted hover:bg-accent"
              )}
            >
              <span>{reaction}</span>
              <span>{count}</span>
            </button>
          ))}

          {/* Add reaction button */}
          {showReactions && (
            <div className="flex items-center gap-1 ml-1">
              {REACTIONS.map(({ emoji, label }) => (
                <button
                  key={label}
                  onClick={() => onReact(message.id, emoji)}
                  className={cn(
                    "p-1 rounded hover:bg-accent transition-colors text-sm",
                    hasUserReacted(emoji) && "bg-primary/20"
                  )}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
