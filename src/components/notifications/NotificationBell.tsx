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
import { EditorialLoading } from '@/components/ui/editorial-skeleton';
import { EditorialEmpty } from '@/components/ui/editorial-empty';

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  badge_earned: <Trophy className="h-4 w-4 text-primary" />,
  level_up: <Star className="h-4 w-4 text-primary" />,
  streak_milestone: <Flame className="h-4 w-4 text-warning" />,
  deal_closed: <DollarSign className="h-4 w-4 text-success" />,
  sos_alert: <AlertTriangle className="h-4 w-4 text-destructive" />,
  mentioned: <AtSign className="h-4 w-4 text-primary" />,
  coaching_notes: <BookOpen className="h-4 w-4 text-magenta" />,
  training_assigned: <GraduationCap className="h-4 w-4 text-primary" />,
  roleplay_feedback: <Gamepad2 className="h-4 w-4 text-magenta" />,
  followup_due: <Clock className="h-4 w-4 text-warning" />,
  challenge_reminder: <Target className="h-4 w-4 text-warning" />,
  deal_cold: <Snowflake className="h-4 w-4 text-muted-foreground" />,
  competition_starting: <Swords className="h-4 w-4 text-primary" />,
  competition_ending: <Flag className="h-4 w-4 text-warning" />,
  leaderboard_overtaken: <TrendingDown className="h-4 w-4 text-destructive" />,
  leaderboard_leading: <TrendingUp className="h-4 w-4 text-success" />,
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
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-none"
          aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        >
          <Bell className="h-4 w-4" strokeWidth={1.5} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] px-1 flex items-center justify-center font-mono text-[9px] tabular-nums bg-primary text-primary-foreground rounded-none border border-background">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 rounded-none border-border shadow-none" align="end">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">— Signals</span>
            <h3 className="font-display italic text-lg leading-none">Notifications</h3>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead.mutate()}
              className="font-mono text-[9px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'all' | 'unread')}>
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger
              value="all"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-[10px] uppercase tracking-[0.2em] py-2.5"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none font-mono text-[10px] uppercase tracking-[0.2em] py-2.5"
            >
              Unread ({unreadCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="m-0">
            <ScrollArea className="h-[400px]">
              {isLoading ? (
                <EditorialLoading label="Loading Signals" className="py-12" />
              ) : filteredNotifications.length === 0 ? (
                <EditorialEmpty
                  eyebrow="Inbox"
                  title={tab === 'unread' ? 'All caught up' : 'No signals yet'}
                  icon={<Bell className="h-8 w-8" strokeWidth={1.25} />}
                  size="sm"
                  className="border-none"
                />
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
                          aria-label={`Delete notification: ${notification.title}`}
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
