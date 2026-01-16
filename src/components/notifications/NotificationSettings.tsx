import { Bell, Mail, Volume2 } from 'lucide-react';
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from '@/components/ui/viper-card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotifications, type NotificationType } from '@/hooks/useNotifications';

const NOTIFICATION_CATEGORIES = [
  {
    name: 'Achievements',
    types: ['badge_earned', 'level_up', 'streak_milestone'] as NotificationType[],
  },
  {
    name: 'Activity',
    types: ['deal_closed', 'sos_alert', 'mentioned'] as NotificationType[],
  },
  {
    name: 'Coaching',
    types: ['coaching_notes', 'training_assigned', 'roleplay_feedback'] as NotificationType[],
  },
  {
    name: 'Reminders',
    types: ['followup_due', 'challenge_reminder', 'deal_cold'] as NotificationType[],
  },
  {
    name: 'Competitions',
    types: ['competition_starting', 'competition_ending', 'leaderboard_overtaken', 'leaderboard_leading'] as NotificationType[],
  },
];

export function NotificationSettings() {
  const { getPreference, updatePreference, NOTIFICATION_TYPE_INFO, soundEnabled, setSoundEnabled } = useNotifications();

  return (
    <div className="space-y-6">
      {/* Global Sound Toggle */}
      <ViperCard>
        <ViperCardHeader>
          <ViperCardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Sound Settings
          </ViperCardTitle>
        </ViperCardHeader>
        <ViperCardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="global-sound" className="flex items-center gap-2">
              <span>Notification sounds</span>
            </Label>
            <Switch
              id="global-sound"
              checked={soundEnabled}
              onCheckedChange={setSoundEnabled}
            />
          </div>
        </ViperCardContent>
      </ViperCard>

      {/* Category-based settings */}
      {NOTIFICATION_CATEGORIES.map((category) => (
        <ViperCard key={category.name}>
          <ViperCardHeader>
            <ViperCardTitle>{category.name}</ViperCardTitle>
          </ViperCardHeader>
          <ViperCardContent className="space-y-4">
            {category.types.map((type, index) => {
              const info = NOTIFICATION_TYPE_INFO[type];
              const pref = getPreference(type);

              return (
                <div key={type}>
                  {index > 0 && <Separator className="my-4" />}
                  <div className="space-y-3">
                    <p className="font-medium text-sm">{info.label}</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${type}-app`} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Bell className="h-3 w-3" />
                          In-App
                        </Label>
                        <Switch
                          id={`${type}-app`}
                          checked={pref.in_app_enabled}
                          onCheckedChange={(checked) =>
                            updatePreference.mutate({
                              notificationType: type,
                              field: 'in_app_enabled',
                              value: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${type}-email`} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          Email
                        </Label>
                        <Switch
                          id={`${type}-email`}
                          checked={pref.email_enabled}
                          onCheckedChange={(checked) =>
                            updatePreference.mutate({
                              notificationType: type,
                              field: 'email_enabled',
                              value: checked,
                            })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${type}-sound`} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Volume2 className="h-3 w-3" />
                          Sound
                        </Label>
                        <Switch
                          id={`${type}-sound`}
                          checked={pref.sound_enabled}
                          onCheckedChange={(checked) =>
                            updatePreference.mutate({
                              notificationType: type,
                              field: 'sound_enabled',
                              value: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </ViperCardContent>
        </ViperCard>
      ))}
    </div>
  );
}
