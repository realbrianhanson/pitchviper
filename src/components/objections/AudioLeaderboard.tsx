import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ViperCard, ViperCardContent } from '@/components/ui/viper-card';
import { useAudioTraining, TrainingMode } from '@/hooks/useAudioTraining';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Medal, Award, Timer, Target, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorialLoading } from '@/components/ui/editorial-skeleton';
import { EditorialEmpty } from '@/components/ui/editorial-empty';

interface AudioLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LeaderboardEntry {
  id: string;
  user_id: string;
  mode: TrainingMode;
  objections_handled: number;
  correct_responses: number;
  total_score: number;
  duration_seconds: number;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export function AudioLeaderboard({ isOpen, onClose }: AudioLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | TrainingMode>('all');

  useEffect(() => {
    if (isOpen) {
      fetchLeaderboard();
    }
  }, [isOpen, activeTab]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audio_training_scores' as any)
        .select('*')
        .order('total_score', { ascending: false })
        .limit(20);

      if (activeTab !== 'all') {
        query = query.eq('mode', activeTab);
      }

      const { data, error } = await query as any;
      if (error) throw error;

      // Fetch profiles for users
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((d: LeaderboardEntry) => d.user_id))] as string[];
        const { data: profiles } = await supabase
          .from('team_profiles_safe')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const entriesWithProfiles = data.map((entry: LeaderboardEntry) => ({
          ...entry,
          profile: profiles?.find(p => p.user_id === entry.user_id),
        }));

        setEntries(entriesWithProfiles);
      } else {
        setEntries([]);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center text-muted-foreground">#{rank}</span>;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeIcon = (mode: TrainingMode) => {
    switch (mode) {
      case 'practice':
        return <Target className="h-4 w-4" />;
      case 'challenge':
        return <Trophy className="h-4 w-4" />;
      case 'random_fire':
        return <Zap className="h-4 w-4" />;
    }
  };

  const getModeColor = (mode: TrainingMode) => {
    switch (mode) {
      case 'practice':
        return 'bg-green-500/20 text-green-500';
      case 'challenge':
        return 'bg-yellow-500/20 text-yellow-500';
      case 'random_fire':
        return 'bg-red-500/20 text-red-500';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Audio Challenge Leaderboard
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
            <TabsTrigger value="challenge">Challenge</TabsTrigger>
            <TabsTrigger value="random_fire">Random Fire</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            {loading ? (
              <EditorialLoading label="Compiling Rankings" />
            ) : entries.length === 0 ? (
              <EditorialEmpty
                eyebrow="Leaderboard"
                title="No scores yet — be first"
                icon={<Trophy className="h-10 w-10" strokeWidth={1.25} />}
              />
            ) : (
              <div className="space-y-2">
                {entries.map((entry, index) => (
                  <ViperCard 
                    key={entry.id} 
                    variant="glass"
                    className={cn(
                      index < 3 && "border-primary/30"
                    )}
                  >
                    <ViperCardContent className="flex items-center gap-4 p-4">
                      <div className="flex items-center justify-center w-8">
                        {getRankIcon(index + 1)}
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {entry.profile?.full_name || 'Unknown User'}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs capitalize", getModeColor(entry.mode))}
                          >
                            {getModeIcon(entry.mode)}
                            <span className="ml-1">{entry.mode.replace('_', ' ')}</span>
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>{entry.objections_handled} objections</span>
                          <span>{entry.correct_responses} correct</span>
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {formatDuration(entry.duration_seconds)}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {entry.total_score}
                        </p>
                        <p className="text-xs text-muted-foreground">points</p>
                      </div>
                    </ViperCardContent>
                  </ViperCard>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
