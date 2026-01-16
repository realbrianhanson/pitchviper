import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  Trophy,
  Flame,
  Star,
  DollarSign,
  AlertTriangle,
  AtSign,
  BookOpen,
  GraduationCap,
  Gamepad2,
  Clock,
  Target,
  Snowflake,
  Swords,
  Flag,
  TrendingDown,
  TrendingUp,
  Check,
  X,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNotifications, type Notification, type NotificationType } from '@/hooks/useNotifications';
import { cn } from '@/lib/utils';

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  badge_earned: <Trophy className="h-4 w-4 text-amber-400" />,
  level_up: <Star className="h-4 w-4 text-primary" />,
  streak_milestone: <Flame className="h-4 w-4 text-orange-400" />,
  deal_closed: <DollarSign className="h-4 w-4 text-emerald-400" />,
  sos_alert: <AlertTriangle className="h-4 w-4 text-red-400" />,
  mentioned: <AtSign className="h-4 w-4 text-blue-400" />,
  coaching_notes: <BookOpen className="h-4 w-4 text-purple-400" />,
  training_assigned: <GraduationCap className="h-4 w-4 text-cyan-400" />,
  roleplay_feedback: <Gamepad2 className="h-4 w-4 text-pink-400" />,
  followup_due: <Clock className="h-4 w-4 text-amber-400" />,
  challenge_reminder: <Target className="h-4 w-4 text-orange-400" />,
  deal_cold: <Snowflake className="h-4 w-4 text-blue-300" />,
  competition_starting: <Swords className="h-4 w-4 text-primary" />,
  competition_ending: <Flag className="h-4 w-4 text-amber-400" />,
  leaderboard_overtaken: <TrendingDown className="h-4 w-4 text-red-400" />,
  leaderboard_leading: <TrendingUp className="h-4 w-4 text-emerald-400" />,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications();

  const filteredNotifications = tab === 'unread'
    ? notifications.filter((n) => !n.is_read)
    : notifications;

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead.mutate(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => markAllAsRead.mutate()}
            >
              <Check className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
          <TabsList className="w-full rounded-none border-b">
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
            <TabsTrigger value="unread" className="flex-1">
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="m-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">
                    {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'p-3 hover:bg-muted/50 cursor-pointer transition-colors relative group',
                        !notification.is_read && 'bg-primary/5'
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Unread indicator */}
                        {!notification.is_read && (
                          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                        )}

                        {/* Icon */}
                        <div className="shrink-0 mt-0.5">
                          {NOTIFICATION_ICONS[notification.type]}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.body}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Delete button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification.mutate(notification.id);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
