import { useState, useRef, useCallback } from "react";
import { Send, Smile, Award } from "lucide-react";
import { ViperButton } from "@/components/ui/viper-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

interface ChatInputProps {
  onSend: (message: string) => void;
  onOpenKudos: () => void;
  teamMembers: TeamMember[];
  isSending: boolean;
  disabled?: boolean;
}

const EMOJIS = ["😊", "👍", "🎉", "🔥", "💪", "👏", "🚀", "💯", "❤️", "😂", "🤔", "👀"];

export function ChatInput({ onSend, onOpenKudos, teamMembers, isSending, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (message.trim() && !isSending) {
      onSend(message);
      setMessage("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursor = e.target.selectionStart || 0;
    setMessage(value);
    setCursorPosition(cursor);

    // Check for @ mentions
    const textBeforeCursor = value.slice(0, cursor);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    
    if (atIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(atIndex + 1);
      if (!textAfterAt.includes(" ")) {
        setMentionFilter(textAfterAt.toLowerCase());
        setShowMentions(true);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = message.slice(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf("@");
    const textAfterCursor = message.slice(cursorPosition);
    
    const newMessage = 
      message.slice(0, atIndex) + 
      `@${member.full_name} ` + 
      textAfterCursor;
    
    setMessage(newMessage);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setMessage(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const filteredMembers = teamMembers.filter(m =>
    m.full_name.toLowerCase().includes(mentionFilter)
  );

  return (
    <div className="relative border-t border-border bg-card/50 p-3">
      {/* Mentions dropdown */}
      {showMentions && filteredMembers.length > 0 && (
        <div className="absolute bottom-full left-3 mb-2 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-64">
          {filteredMembers.map((member) => (
            <button
              key={member.user_id}
              onClick={() => insertMention(member)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-accent transition-colors text-left"
            >
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {member.full_name.charAt(0)}
                  </span>
                </div>
              )}
              <span className="text-sm text-foreground">{member.full_name}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Emoji picker */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            >
              <Smile className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-accent rounded transition-colors text-lg"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Kudos button */}
        <button
          type="button"
          onClick={onOpenKudos}
          className="p-2 rounded-lg hover:bg-accent transition-colors text-amber-500 hover:text-amber-400"
          title="Give Kudos"
        >
          <Award className="h-5 w-5" />
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (@ to mention)"
            disabled={disabled || isSending}
            rows={1}
            className={cn(
              "w-full resize-none rounded-lg border border-border bg-background px-4 py-2.5",
              "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary",
              "placeholder:text-muted-foreground text-sm",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "max-h-32 min-h-[42px]"
            )}
            style={{
              height: "auto",
              minHeight: "42px"
            }}
          />
        </div>

        {/* Send button */}
        <ViperButton
          size="sm"
          onClick={handleSend}
          disabled={!message.trim() || isSending || disabled}
          className="h-[42px] px-4"
        >
          <Send className="h-4 w-4" />
        </ViperButton>
      </div>
    </div>
  );
}
