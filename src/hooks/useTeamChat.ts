import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type ChannelType = Database["public"]["Enums"]["channel_type"];
type MessageType = Database["public"]["Enums"]["message_type"];

interface ChatChannel {
  id: string;
  team_id: string;
  name: string;
  channel_type: ChannelType;
  is_active: boolean;
  created_at: string;
}

interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  message_type: MessageType;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  profiles?: {
    full_name: string;
    avatar_url: string | null;
  };
  reactions?: ChatReaction[];
}

interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  reaction: string;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
}

export function useTeamChat() {
  const { user, profile } = useAuth();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [activeChannel, setActiveChannel] = useState<ChatChannel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Fetch channels for user's team
  const fetchChannels = useCallback(async () => {
    if (!user || !profile?.team_id) return;

    const { data, error } = await supabase
      .from("chat_channels")
      .select("*")
      .eq("team_id", profile.team_id)
      .eq("is_active", true)
      .order("channel_type");

    if (error) {
      console.error("Error fetching channels:", error);
      return;
    }

    setChannels(data || []);
    
    // Set default channel to general
    if (data && data.length > 0 && !activeChannel) {
      const generalChannel = data.find(c => c.channel_type === "general");
      setActiveChannel(generalChannel || data[0]);
    }
  }, [user, profile?.team_id, activeChannel]);

  // Fetch messages for active channel
  const fetchMessages = useCallback(async () => {
    if (!activeChannel) return;

    // First fetch messages
    const { data: messagesData, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", activeChannel.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }

    if (!messagesData || messagesData.length === 0) {
      setMessages([]);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(messagesData.map(m => m.user_id))];
    
    // Fetch profiles for those users
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .in("user_id", userIds);

    // Create a map of user_id to profile
    const profilesMap = new Map(
      (profilesData || []).map(p => [p.user_id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    );

    // Fetch reactions for all messages
    const messageIds = messagesData.map(m => m.id);
    const { data: reactionsData } = await supabase
      .from("chat_reactions")
      .select("*")
      .in("message_id", messageIds);

    const messagesWithData = messagesData.map(msg => ({
      ...msg,
      metadata: (msg.metadata || {}) as Record<string, unknown>,
      profiles: profilesMap.get(msg.user_id),
      reactions: reactionsData?.filter(r => r.message_id === msg.id) || []
    }));

    setMessages(messagesWithData);
  }, [activeChannel]);

  // Fetch team members for @mentions
  const fetchTeamMembers = useCallback(async () => {
    if (!profile?.team_id) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, avatar_url")
      .eq("team_id", profile.team_id);

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    setTeamMembers(data || []);
  }, [profile?.team_id]);

  // Send a message
  const sendMessage = async (content: string, messageType: MessageType = "text", metadata: Record<string, unknown> = {}) => {
    if (!user || !activeChannel || !content.trim()) return;

    setIsSending(true);
    try {
      const { error } = await supabase
        .from("chat_messages")
        .insert([{
          channel_id: activeChannel.id,
          user_id: user.id,
          message_type: messageType,
          content: content.trim(),
          metadata: metadata as unknown as Record<string, never>
        }]);

      if (error) throw error;
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  // Send kudos
  const sendKudos = async (recipientId: string, kudosType: string, note?: string) => {
    if (!user || !profile?.team_id) return;

    // Find the general channel
    const generalChannel = channels.find(c => c.channel_type === "general");
    if (!generalChannel) {
      toast.error("General channel not found");
      return;
    }

    // Get recipient name
    const recipient = teamMembers.find(m => m.user_id === recipientId);
    if (!recipient) return;

    const content = `🏆 ${profile.full_name} gave kudos to ${recipient.full_name}: "${kudosType}"${note ? ` - ${note}` : ""}`;
    
    try {
      const kudosMetadata = {
        kudos_type: kudosType,
        recipient_id: recipientId,
        recipient_name: recipient.full_name,
        sender_name: profile.full_name,
        note
      };
      
      const { error } = await supabase
        .from("chat_messages")
        .insert([{
          channel_id: generalChannel.id,
          user_id: user.id,
          message_type: "kudos" as MessageType,
          content,
          metadata: kudosMetadata as unknown as Record<string, never>
        }]);

      if (error) throw error;

      // Create notification for recipient
      await supabase.functions.invoke("create-notification", {
        body: {
          user_id: recipientId,
          type: "mentioned",
          title: "You received kudos! 🏆",
          body: `${profile.full_name} gave you "${kudosType}" kudos${note ? `: ${note}` : ""}`,
          action_url: "/chat"
        }
      });

      toast.success("Kudos sent!");
    } catch (error) {
      console.error("Error sending kudos:", error);
      toast.error("Failed to send kudos");
    }
  };

  // Add reaction to message
  const addReaction = async (messageId: string, reaction: string) => {
    if (!user) return;

    try {
      // Check if reaction already exists
      const existingReaction = messages
        .find(m => m.id === messageId)
        ?.reactions?.find(r => r.user_id === user.id && r.reaction === reaction);

      if (existingReaction) {
        // Remove reaction
        await supabase
          .from("chat_reactions")
          .delete()
          .eq("id", existingReaction.id);
      } else {
        // Add reaction
        await supabase
          .from("chat_reactions")
          .insert([{
            message_id: messageId,
            user_id: user.id,
            reaction
          }]);
      }
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchChannels(), fetchTeamMembers()]);
      setIsLoading(false);
    };

    if (user && profile?.team_id) {
      loadData();
    }
  }, [user, profile?.team_id]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (activeChannel) {
      fetchMessages();
    }
  }, [activeChannel, fetchMessages]);

  // Real-time subscriptions
  useEffect(() => {
    if (!activeChannel) return;

    const messagesChannel = supabase
      .channel(`chat-messages-${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${activeChannel.id}`
        },
        async (payload) => {
          // Fetch the sender's profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("user_id", payload.new.user_id)
            .maybeSingle();

          const newMessage: ChatMessage = {
            id: payload.new.id,
            channel_id: payload.new.channel_id,
            user_id: payload.new.user_id,
            message_type: payload.new.message_type,
            content: payload.new.content,
            metadata: (payload.new.metadata || {}) as Record<string, unknown>,
            created_at: payload.new.created_at,
            profiles: profileData ? {
              full_name: profileData.full_name,
              avatar_url: profileData.avatar_url
            } : undefined,
            reactions: []
          };

          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    const reactionsChannel = supabase
      .channel(`chat-reactions-${activeChannel.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_reactions"
        },
        () => {
          // Refetch messages to get updated reactions
          fetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(reactionsChannel);
    };
  }, [activeChannel, fetchMessages]);

  return {
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
    refetchMessages: fetchMessages
  };
}
