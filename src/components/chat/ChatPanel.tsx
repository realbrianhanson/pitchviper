import { useEffect, useRef, useState } from "react";
import { X, Hash, Trophy, HelpCircle, Users, MessageCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useTeamChat } from "@/hooks/useTeamChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { GiveKudosModal } from "./GiveKudosModal";
import { useAuth } from "@/hooks/useAuth";

const CHANNEL_ICONS = {
  general: Hash,
  wins: Trophy,
  help: HelpCircle,
  custom: MessageCircle,
};

interface ChatPanelProps {
  trigger?: React.ReactNode;
}

export function ChatPanel({ trigger }: ChatPanelProps) {
  const { user, profile } = useAuth();
  const {
    channels,
    messages,
    teamMembers,
    activeChannel,
    setActiveChannel,
    isLoading,
    isSending,
    sendMessage,
    sendKudos,
    addReaction,
  } = useTeamChat();

  const [open, setOpen] = useState(false);
  const [showKudosModal, setShowKudosModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const hasNoTeam = !profile?.team_id;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <MessageCircle className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col">
          <SheetHeader className="px-4 py-3 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Chat
            </SheetTitle>
          </SheetHeader>

          {hasNoTeam ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center space-y-3">
                <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                <h3 className="font-semibold text-lg">No Team Yet</h3>
                <p className="text-sm text-muted-foreground">
                  Join or create a team to start chatting with your colleagues.
                </p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex-1 p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Channel tabs */}
              <div className="flex border-b border-border overflow-x-auto">
                {channels.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel.channel_type] || Hash;
                  const isActive = activeChannel?.id === channel.id;
                  
                  return (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                        isActive
                          ? "text-primary border-b-2 border-primary"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4",
                        channel.channel_type === "wins" && "text-amber-500",
                        channel.channel_type === "help" && "text-blue-500"
                      )} />
                      #{channel.name}
                    </button>
                  );
                })}
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <MessageCircle className="h-10 w-10 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground text-sm">
                        No messages yet. Start the conversation!
                      </p>
                    </div>
                  ) : (
                    <>
                      {messages.map((message) => (
                        <ChatMessage
                          key={message.id}
                          message={message}
                          onReact={addReaction}
                        />
                      ))}
                      <div ref={messagesEndRef} />
                    </>
                  )}
                </div>
              </ScrollArea>

              {/* Input area */}
              <ChatInput
                onSend={sendMessage}
                onOpenKudos={() => setShowKudosModal(true)}
                teamMembers={teamMembers}
                isSending={isSending}
                disabled={!activeChannel}
              />
            </>
          )}
        </SheetContent>
      </Sheet>

      <GiveKudosModal
        open={showKudosModal}
        onOpenChange={setShowKudosModal}
        teamMembers={teamMembers}
        onSendKudos={sendKudos}
        currentUserId={user?.id}
      />
    </>
  );
}
