import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "@/hooks/use-toast";

export type MetricType = 'calls' | 'appointments' | 'revenue' | 'deals' | 'roleplay' | 'custom';
export type CompetitionStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Competition {
  id: string;
  team_id: string | null;
  name: string;
  description: string;
  metric_type: MetricType;
  start_date: string;
  end_date: string;
  prize_description: string | null;
  prize_value: number | null;
  number_of_winners: number;
  qualifying_threshold: number | null;
  created_by: string;
  status: CompetitionStatus;
  created_at: string;
}

export interface CompetitionParticipant {
  id: string;
  competition_id: string;
  user_id: string;
  current_value: number;
  rank: number | null;
  joined_at: string;
  updated_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
    current_level: number;
  };
}

export interface CompetitionActivity {
  id: string;
  competition_id: string;
  user_id: string;
  activity_type: string;
  previous_rank: number | null;
  new_rank: number | null;
  value_change: number | null;
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface CreateCompetitionData {
  name: string;
  description: string;
  metric_type: MetricType;
  start_date: string;
  end_date: string;
  prize_description?: string;
  prize_value?: number;
  number_of_winners: number;
  qualifying_threshold?: number;
  participant_ids?: string[];
}

export function useCompetitions() {
  const { user, profile } = useAuth();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [activeCompetitions, setActiveCompetitions] = useState<Competition[]>([]);
  const [pastCompetitions, setPastCompetitions] = useState<Competition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCompetitions = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('competitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const comps = (data || []) as Competition[];
      setCompetitions(comps);
      setActiveCompetitions(comps.filter(c => c.status === 'active' || c.status === 'upcoming'));
      setPastCompetitions(comps.filter(c => c.status === 'completed' || c.status === 'cancelled'));
    } catch (error) {
      console.error('Error fetching competitions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createCompetition = async (data: CreateCompetitionData) => {
    if (!user || !profile?.team_id) {
      toast({ title: 'Error', description: 'You must be logged in with a team', variant: 'destructive' });
      return null;
    }

    try {
      const startDate = new Date(data.start_date);
      const now = new Date();
      const status: CompetitionStatus = startDate <= now ? 'active' : 'upcoming';

      const { data: competition, error } = await supabase
        .from('competitions')
        .insert({
          team_id: profile.team_id,
          name: data.name,
          description: data.description,
          metric_type: data.metric_type,
          start_date: data.start_date,
          end_date: data.end_date,
          prize_description: data.prize_description || null,
          prize_value: data.prize_value || null,
          number_of_winners: data.number_of_winners,
          qualifying_threshold: data.qualifying_threshold || null,
          created_by: user.id,
          status
        })
        .select()
        .single();

      if (error) throw error;

      // If specific participants, add them; otherwise add all team members
      if (data.participant_ids && data.participant_ids.length > 0) {
        const participantInserts = data.participant_ids.map(userId => ({
          competition_id: competition.id,
          user_id: userId
        }));

        await supabase.from('competition_participants').insert(participantInserts);
      } else {
        // Add all team members as participants
        const { data: teamMembers } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('team_id', profile.team_id);

        if (teamMembers) {
          const participantInserts = teamMembers.map(member => ({
            competition_id: competition.id,
            user_id: member.user_id
          }));

          await supabase.from('competition_participants').insert(participantInserts);
        }
      }

      toast({ title: '🏆 Competition Created!', description: `${data.name} is now live!` });
      fetchCompetitions();
      return competition as Competition;
    } catch (error) {
      console.error('Error creating competition:', error);
      toast({ title: 'Error', description: 'Could not create competition', variant: 'destructive' });
      return null;
    }
  };

  const updateCompetition = async (id: string, updates: Partial<Competition>) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Competition Updated', description: 'Changes saved successfully' });
      fetchCompetitions();
    } catch (error) {
      console.error('Error updating competition:', error);
      toast({ title: 'Error', description: 'Could not update competition', variant: 'destructive' });
    }
  };

  const endCompetition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: '🏁 Competition Ended', description: 'Final results are now available' });
      fetchCompetitions();
    } catch (error) {
      console.error('Error ending competition:', error);
      toast({ title: 'Error', description: 'Could not end competition', variant: 'destructive' });
    }
  };

  const cancelCompetition = async (id: string) => {
    try {
      const { error } = await supabase
        .from('competitions')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Competition Cancelled', description: 'The competition has been cancelled' });
      fetchCompetitions();
    } catch (error) {
      console.error('Error cancelling competition:', error);
      toast({ title: 'Error', description: 'Could not cancel competition', variant: 'destructive' });
    }
  };

  const getCompetitionStandings = async (competitionId: string): Promise<CompetitionParticipant[]> => {
    try {
      const { data: participants, error } = await supabase
        .from('competition_participants')
        .select('*')
        .eq('competition_id', competitionId)
        .order('current_value', { ascending: false });

      if (error) throw error;

      // Fetch profiles separately
      const userIds = (participants || []).map(p => p.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url, current_level')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (participants || []).map((p, index) => ({
        ...p,
        rank: index + 1,
        profile: profileMap.get(p.user_id)
      })) as CompetitionParticipant[];
    } catch (error) {
      console.error('Error fetching standings:', error);
      return [];
    }
  };

  const getCompetitionActivity = async (competitionId: string): Promise<CompetitionActivity[]> => {
    try {
      const { data, error } = await supabase
        .from('competition_activity')
        .select('*')
        .eq('competition_id', competitionId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(a => a.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map(a => ({
        ...a,
        profile: profileMap.get(a.user_id)
      })) as CompetitionActivity[];
    } catch (error) {
      console.error('Error fetching activity:', error);
      return [];
    }
  };

  useEffect(() => {
    if (user) {
      fetchCompetitions();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('competitions-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competitions' },
        () => fetchCompetitions()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'competition_participants' },
        () => fetchCompetitions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    competitions,
    activeCompetitions,
    pastCompetitions,
    isLoading,
    createCompetition,
    updateCompetition,
    endCompetition,
    cancelCompetition,
    getCompetitionStandings,
    getCompetitionActivity,
    refetch: fetchCompetitions
  };
}
