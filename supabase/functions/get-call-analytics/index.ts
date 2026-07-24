import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CallAnalyticsRequest {
  user_id?: string;
  team_id?: string;
  start_date: string;
  end_date: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authedUserId = userData.user.id;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { user_id, team_id, start_date, end_date }: CallAnalyticsRequest = await req.json();

    // Scope: a rep can only see their own data; team-scoped queries require manager role on that team
    if (team_id) {
      const { data: callerProfile } = await supabase
        .from('profiles').select('team_id').eq('user_id', authedUserId).maybeSingle();
      const { data: isManager } = await supabase.rpc('has_management_role', { _user_id: authedUserId });
      if (callerProfile?.team_id !== team_id || !isManager) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    } else if (user_id && user_id !== authedUserId) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const scopedUserId = user_id ?? authedUserId;

    // Build query based on whether we're filtering by user or team
    let query = supabase
      .from('calls')
      .select('*')
      .gte('created_at', start_date)
      .lte('created_at', end_date);

    if (team_id) {
      query = query.eq('team_id', team_id);
    } else {
      query = query.eq('user_id', scopedUserId);
    }

    const { data: calls, error } = await query;

    if (error) throw error;

    // Calculate previous period for comparison
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const periodLength = endDateObj.getTime() - startDateObj.getTime();
    const prevStartDate = new Date(startDateObj.getTime() - periodLength).toISOString();
    const prevEndDate = start_date;

    let prevQuery = supabase
      .from('calls')
      .select('*')
      .gte('created_at', prevStartDate)
      .lte('created_at', prevEndDate);

    if (team_id) {
      prevQuery = prevQuery.eq('team_id', team_id);
    } else {
      prevQuery = prevQuery.eq('user_id', scopedUserId);
    }

    const { data: prevCalls } = await prevQuery;

    // Calculate metrics
    const totalCalls = calls?.length || 0;
    const prevTotalCalls = prevCalls?.length || 0;
    
    const connectedCalls = calls?.filter(c => c.outcome === 'connected').length || 0;
    const prevConnectedCalls = prevCalls?.filter(c => c.outcome === 'connected').length || 0;
    
    const connectRate = totalCalls > 0 ? (connectedCalls / totalCalls) * 100 : 0;
    const prevConnectRate = prevTotalCalls > 0 ? (prevConnectedCalls / prevTotalCalls) * 100 : 0;
    
    const totalDuration = calls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
    const avgDuration = totalCalls > 0 ? totalDuration / totalCalls / 60 : 0; // in minutes
    const prevTotalDuration = prevCalls?.reduce((sum, c) => sum + (c.duration_seconds || 0), 0) || 0;
    const prevAvgDuration = prevTotalCalls > 0 ? prevTotalDuration / prevTotalCalls / 60 : 0;
    
    const appointmentsSet = calls?.filter(c => c.disposition === 'appointment_set').length || 0;
    const prevAppointmentsSet = prevCalls?.filter(c => c.disposition === 'appointment_set').length || 0;
    const appointmentsPerCall = connectedCalls > 0 ? appointmentsSet / connectedCalls : 0;
    const prevAppointmentsPerCall = prevConnectedCalls > 0 ? prevAppointmentsSet / prevConnectedCalls : 0;

    // Calls over time (group by date)
    const callsByDate: Record<string, { total: number; connected: number }> = {};
    calls?.forEach(call => {
      const date = call.created_at.split('T')[0];
      if (!callsByDate[date]) {
        callsByDate[date] = { total: 0, connected: 0 };
      }
      callsByDate[date].total++;
      if (call.outcome === 'connected') {
        callsByDate[date].connected++;
      }
    });

    const callsOverTime = Object.entries(callsByDate)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Call outcomes
    const outcomes = {
      connected: calls?.filter(c => c.outcome === 'connected').length || 0,
      voicemail: calls?.filter(c => c.outcome === 'voicemail').length || 0,
      no_answer: calls?.filter(c => c.outcome === 'no_answer').length || 0,
      wrong_number: calls?.filter(c => c.outcome === 'wrong_number').length || 0,
    };

    // Disposition breakdown (only for connected calls)
    const dispositions: Record<string, number> = {};
    calls?.filter(c => c.outcome === 'connected' && c.disposition).forEach(call => {
      const disp = call.disposition as string;
      dispositions[disp] = (dispositions[disp] || 0) + 1;
    });

    // Best calling times heatmap
    const heatmapData: Record<string, Record<number, { total: number; connected: number }>> = {
      'Monday': {}, 'Tuesday': {}, 'Wednesday': {}, 'Thursday': {}, 'Friday': {}, 'Saturday': {}, 'Sunday': {}
    };
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    calls?.forEach(call => {
      const date = new Date(call.created_at);
      const day = dayNames[date.getDay()];
      const hour = date.getHours();
      
      if (!heatmapData[day][hour]) {
        heatmapData[day][hour] = { total: 0, connected: 0 };
      }
      heatmapData[day][hour].total++;
      if (call.outcome === 'connected') {
        heatmapData[day][hour].connected++;
      }
    });

    // Convert heatmap to array format
    const heatmap = Object.entries(heatmapData).map(([day, hours]) => ({
      day,
      hours: Object.entries(hours).map(([hour, data]) => ({
        hour: parseInt(hour),
        total: data.total,
        connected: data.connected,
        connectRate: data.total > 0 ? (data.connected / data.total) * 100 : 0,
      })),
    }));

    // Objection frequency
    const objections: Record<string, number> = {};
    calls?.forEach(call => {
      if (call.struggled_objections && Array.isArray(call.struggled_objections)) {
        call.struggled_objections.forEach((obj: string) => {
          objections[obj] = (objections[obj] || 0) + 1;
        });
      }
    });

    const objectionFrequency = Object.entries(objections)
      .map(([objection, count]) => ({ objection, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top performers (if team_id provided)
    let topPerformers = null;
    if (team_id) {
      // Get all user stats for the team
      const userStats: Record<string, { 
        user_id: string; 
        total: number; 
        connected: number; 
        appointments: number;
      }> = {};

      calls?.forEach(call => {
        if (!userStats[call.user_id]) {
          userStats[call.user_id] = { user_id: call.user_id, total: 0, connected: 0, appointments: 0 };
        }
        userStats[call.user_id].total++;
        if (call.outcome === 'connected') {
          userStats[call.user_id].connected++;
        }
        if (call.disposition === 'appointment_set') {
          userStats[call.user_id].appointments++;
        }
      });

      const userIds = Object.keys(userStats);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', userIds);

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

        const usersWithStats = Object.values(userStats).map(stats => ({
          ...stats,
          profile: profileMap.get(stats.user_id),
          connectRate: stats.total > 0 ? (stats.connected / stats.total) * 100 : 0,
        }));

        topPerformers = {
          byConnectRate: usersWithStats
            .filter(u => u.total >= 5) // Minimum calls threshold
            .sort((a, b) => b.connectRate - a.connectRate)
            .slice(0, 3),
          byAppointments: usersWithStats
            .sort((a, b) => b.appointments - a.appointments)
            .slice(0, 3),
        };
      }
    }

    const response = {
      metrics: {
        totalCalls: { value: totalCalls, prevValue: prevTotalCalls },
        connectRate: { value: connectRate, prevValue: prevConnectRate },
        avgDuration: { value: avgDuration, prevValue: prevAvgDuration },
        appointmentsPerCall: { value: appointmentsPerCall, prevValue: prevAppointmentsPerCall },
      },
      callsOverTime,
      outcomes,
      dispositions,
      heatmap,
      objectionFrequency,
      topPerformers,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
