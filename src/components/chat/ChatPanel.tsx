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
import { EditorialEmpty } from "@/components/ui/editorial-empty";

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
            <button className="relative p-2 hover:text-primary transition-colors rounded-none" aria-label="Open team chat">
              <MessageCircle className="h-4 w-4" strokeWidth={1.5} />
            </button>
          )}
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[440px] p-0 flex flex-col rounded-none border-l border-border">
          <SheetHeader className="px-5 py-4 border-b border-border space-y-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground text-left">— The Floor</p>
            <SheetTitle className="font-display italic text-2xl leading-none text-left flex items-center gap-2">
              Team Chat
            </SheetTitle>
          </SheetHeader>

          {hasNoTeam ? (
            <div className="flex-1 flex items-center justify-center p-6">
              <EditorialEmpty
                eyebrow="The Floor"
                title="No team yet"
                description="Join or create a team to start chatting with your colleagues."
                icon={<Users className="h-10 w-10" strokeWidth={1.25} />}
                className="border-none"
              />
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
              <div className="flex border-b border-border overflow-x-auto bg-background">
                {channels.map((channel) => {
                  const Icon = CHANNEL_ICONS[channel.channel_type] || Hash;
                  const isActive = activeChannel?.id === channel.id;

                  return (
                    <button
                      key={channel.id}
                      onClick={() => setActiveChannel(channel)}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors whitespace-nowrap border-b-2",
                        isActive
                          ? "text-primary border-primary"
                          : "text-muted-foreground hover:text-foreground border-transparent"
                      )}
                    >
                      <Icon className={cn(
                        "h-3.5 w-3.5",
                        channel.channel_type === "wins" && "text-amber-500",
                        channel.channel_type === "help" && "text-blue-500"
                      )} strokeWidth={1.5} />
                      #{channel.name}
                    </button>
                  );
                })}
              </div>

              {/* Messages area */}
              <ScrollArea className="flex-1">
                <div className="p-2">
                  {messages.length === 0 ? (
                    <EditorialEmpty
                      eyebrow={activeChannel ? `#${activeChannel.name}` : "Channel"}
                      title="Break the silence"
                      description="No messages yet — say something."
                      icon={<MessageCircle className="h-8 w-8" strokeWidth={1.25} />}
                      size="sm"
                      className="border-none"
                    />
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
