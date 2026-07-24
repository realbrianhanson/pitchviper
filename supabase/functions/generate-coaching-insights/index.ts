import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const rl = await enforceRateLimit(userData.user.id, 'generate-coaching-insights', { serviceClient: supabase });
    const _ent = await requireTeamEntitlement(supabase, userData.user.id, "growth");
    if (!_ent.ok) return _ent.response;
    if (!rl.allowed) return rl.response!;

    const { rep_id } = await req.json();
    if (!rep_id) throw new Error('rep_id is required');

    // Caller must be the rep, or a manager on the same team
    if (rep_id !== userData.user.id) {
      const { data: isManager } = await authClient.rpc('has_management_role', { _user_id: userData.user.id });
      const { data: callerProfile } = await supabase.from('profiles').select('team_id').eq('user_id', userData.user.id).maybeSingle();
      const { data: repTeam } = await supabase.from('profiles').select('team_id').eq('user_id', rep_id).maybeSingle();
      if (!isManager || !callerProfile?.team_id || callerProfile.team_id !== repTeam?.team_id) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Get rep profile
    const { data: repProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', rep_id)
      .single();

    if (!repProfile) {
      throw new Error('Rep not found');
    }

    // Get team average stats for comparison
    const { data: teamProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('team_id', repProfile.team_id);

    const teamUserIds = teamProfiles?.map(p => p.user_id) || [];

    // Get last 30 days of calls for rep
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: repCalls } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', rep_id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    // Get team calls for comparison
    const { data: teamCalls } = await supabase
      .from('calls')
      .select('user_id, outcome, deal_value, struggled_objections')
      .in('user_id', teamUserIds)
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get rep's roleplay sessions
    const { data: roleplaySessions } = await supabase
      .from('roleplay_sessions')
      .select('*, roleplay_scenarios(name, difficulty)')
      .eq('user_id', rep_id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Get daily stats
    const { data: repDailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', rep_id)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false });

    // Calculate metrics
    const repCallCount = repCalls?.length || 0;
    const repConnectRate = repCalls?.length 
      ? (repCalls.filter(c => c.outcome === 'connected').length / repCalls.length * 100).toFixed(1)
      : 0;
    const repDeals = repCalls?.filter(c => c.deal_value).length || 0;
    const repRevenue = repCalls?.reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0) || 0;
    
    // Team averages
    const teamMemberCount = teamUserIds.length || 1;
    const teamAvgCalls = (teamCalls?.length || 0) / teamMemberCount;
    const teamConnectedCalls = teamCalls?.filter(c => c.outcome === 'connected').length || 0;
    const teamAvgConnectRate = teamCalls?.length 
      ? (teamConnectedCalls / teamCalls.length * 100).toFixed(1)
      : 0;

    // Struggled objections analysis
    const objectionCounts: Record<string, number> = {};
    repCalls?.forEach(call => {
      call.struggled_objections?.forEach((obj: string) => {
        objectionCounts[obj] = (objectionCounts[obj] || 0) + 1;
      });
    });
    const topObjections = Object.entries(objectionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Roleplay analysis
    const avgRoleplayScore = roleplaySessions?.length
      ? (roleplaySessions.reduce((sum, s) => sum + (s.score || 0), 0) / roleplaySessions.length).toFixed(1)
      : 'N/A';

    // Recent coaching sessions
    const { data: coachingSessions } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('rep_id', rep_id)
      .order('created_at', { ascending: false })
      .limit(3);

    const previousFocusAreas = coachingSessions?.flatMap(s => s.focus_areas || []) || [];

    const prompt = `You are an expert sales coach AI. Generate personalized coaching recommendations for this sales rep based on their performance data.

REP PROFILE:
- Name: ${repProfile.full_name}
- Level: ${repProfile.current_level}
- XP: ${repProfile.xp_points}
- Current Streak: ${repProfile.current_streak} days
- Hire Date: ${repProfile.hire_date || 'Unknown'}

LAST 30 DAYS PERFORMANCE:
- Total Calls: ${repCallCount} (Team avg: ${teamAvgCalls.toFixed(1)})
- Connect Rate: ${repConnectRate}% (Team avg: ${teamAvgConnectRate}%)
- Deals Closed: ${repDeals}
- Revenue: $${repRevenue.toLocaleString()}
- Average Roleplay Score: ${avgRoleplayScore}

STRUGGLED OBJECTIONS (frequency):
${topObjections.map(([obj, count]) => `- "${obj}": ${count} times`).join('\n') || 'No objections recorded'}

ROLEPLAY HISTORY:
${roleplaySessions?.slice(0, 5).map(s => `- ${(s.roleplay_scenarios as any)?.name || 'Unknown'}: Score ${s.score || 'N/A'}`).join('\n') || 'No roleplay sessions'}

PREVIOUS COACHING FOCUS AREAS:
${previousFocusAreas.slice(0, 5).join(', ') || 'None recorded'}

Based on this data, provide a JSON response with these exact fields:
{
  "focus_areas": [
    {
      "area": "Specific skill to work on",
      "reason": "Why this is important based on their data",
      "action": "Concrete action they can take"
    }
  ],
  "conversation_starters": [
    "Open-ended question to start coaching conversation",
    "Another question targeting specific behavior"
  ],
  "recognition_points": [
    "Something specific to praise based on their data"
  ],
  "suggested_roleplay": {
    "scenario_type": "Type of scenario that would help (e.g., 'objection handling', 'cold call opening')",
    "reason": "Why this roleplay would benefit them"
  },
  "performance_insights": {
    "trend": "improving/declining/steady",
    "key_strength": "Their strongest area",
    "biggest_opportunity": "Area with most room for improvement"
  },
  "patterns_detected": [
    "Any notable patterns in their performance data (e.g., 'Performance drops after 3pm')"
  ]
}

Be specific, data-driven, and actionable. Reference actual numbers from their performance.`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'API credits exhausted. Please add funds.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insightsText = aiData.choices?.[0]?.message?.content || '{}';
    
    let insights;
    try {
      insights = JSON.parse(insightsText);
    } catch {
      insights = {
        focus_areas: [{ area: 'Unable to generate insights', reason: 'Please try again', action: '' }],
        conversation_starters: [],
        recognition_points: [],
        suggested_roleplay: null,
        performance_insights: null,
        patterns_detected: []
      };
    }

    // Include raw stats for the UI
    const repStats = {
      calls_30d: repCallCount,
      connect_rate: Number(repConnectRate),
      deals_closed: repDeals,
      revenue: repRevenue,
      avg_roleplay_score: avgRoleplayScore !== 'N/A' ? Number(avgRoleplayScore) : null,
      team_avg_calls: teamAvgCalls,
      team_avg_connect_rate: Number(teamAvgConnectRate),
      daily_stats: repDailyStats
    };

    return new Response(JSON.stringify({
      success: true,
      insights,
      stats: repStats,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating coaching insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
