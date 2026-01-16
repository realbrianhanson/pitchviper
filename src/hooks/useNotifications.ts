import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export type NotificationType =
  | 'badge_earned'
  | 'level_up'
  | 'streak_milestone'
  | 'deal_closed'
  | 'sos_alert'
  | 'mentioned'
  | 'coaching_notes'
  | 'training_assigned'
  | 'roleplay_feedback'
  | 'followup_due'
  | 'challenge_reminder'
  | 'deal_cold'
  | 'competition_starting'
  | 'competition_ending'
  | 'leaderboard_overtaken'
  | 'leaderboard_leading';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationPreference {
  id: string;
  user_id: string;
  notification_type: string;
  in_app_enabled: boolean;
  email_enabled: boolean;
  sound_enabled: boolean;
}

const NOTIFICATION_TYPE_INFO: Record<NotificationType, { category: string; label: string }> = {
  badge_earned: { category: 'Achievements', label: 'Badge Earned' },
  level_up: { category: 'Achievements', label: 'Level Up' },
  streak_milestone: { category: 'Achievements', label: 'Streak Milestone' },
  deal_closed: { category: 'Activity', label: 'Deal Closed' },
  sos_alert: { category: 'Activity', label: 'SOS Alert' },
  mentioned: { category: 'Activity', label: 'Mentioned' },
  coaching_notes: { category: 'Coaching', label: 'Coaching Notes' },
  training_assigned: { category: 'Coaching', label: 'Training Assigned' },
  roleplay_feedback: { category: 'Coaching', label: 'Roleplay Feedback' },
  followup_due: { category: 'Reminders', label: 'Follow-up Due' },
  challenge_reminder: { category: 'Reminders', label: 'Challenge Reminder' },
  deal_cold: { category: 'Reminders', label: 'Deal Going Cold' },
  competition_starting: { category: 'Competitions', label: 'Competition Starting' },
  competition_ending: { category: 'Competitions', label: 'Competition Ending' },
  leaderboard_overtaken: { category: 'Competitions', label: 'Overtaken on Leaderboard' },
  leaderboard_leading: { category: 'Competitions', label: 'Leading the Leaderboard' },
};

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
  });

  // Fetch preferences
  const { data: preferences = [] } = useQuery({
    queryKey: ['notification-preferences', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      return data as NotificationPreference[];
    },
    enabled: !!user?.id,
  });

  // Unread count
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Mark as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Mark all as read
  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('All notifications marked as read');
    },
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Update preference
  const updatePreference = useMutation({
    mutationFn: async ({
      notificationType,
      field,
      value,
    }: {
      notificationType: string;
      field: 'in_app_enabled' | 'email_enabled' | 'sound_enabled';
      value: boolean;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Try to update existing
      const { data: existing } = await supabase
        .from('user_notification_preferences')
        .select('id')
        .eq('user_id', user.id)
        .eq('notification_type', notificationType)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_notification_preferences')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_notification_preferences')
          .insert({
            user_id: user.id,
            notification_type: notificationType,
            [field]: value,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  // Get preference for a type
  const getPreference = useCallback(
    (notificationType: string) => {
      return preferences.find((p) => p.notification_type === notificationType) || {
        in_app_enabled: true,
        email_enabled: false,
        sound_enabled: true,
      };
    },
    [preferences]
  );

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Show toast
          toast(newNotification.title, {
            description: newNotification.body,
            action: newNotification.action_url
              ? {
                  label: 'View',
                  onClick: () => {
                    window.location.href = newNotification.action_url!;
                  },
                }
              : undefined,
          });

          // Play sound if enabled
          const pref = getPreference(newNotification.type);
          if (pref.sound_enabled && soundEnabled) {
            // Simple notification sound
            try {
              const audio = new Audio('/notification.mp3');
              audio.volume = 0.3;
              audio.play().catch(() => {});
            } catch {
              // Ignore audio errors
            }
          }

          // Invalidate query to refresh
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, getPreference, soundEnabled]);

  return {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreference,
    getPreference,
    soundEnabled,
    setSoundEnabled,
    NOTIFICATION_TYPE_INFO,
  };
}
