import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { team_id } = await req.json();

    // Get team members
    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('user_id, full_name, current_level, xp_points, current_streak')
      .eq('team_id', team_id);

    if (!teamMembers || teamMembers.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        insights: {
          team_trend: 'No team data available yet.',
          coaching_opportunity: null,
          skill_gap: null,
          quota_prediction: null
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get last 7 days of calls
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const userIds = teamMembers.map(m => m.user_id);
    
    const { data: recentCalls } = await supabase
      .from('calls')
      .select('user_id, outcome, deal_value, struggled_objections, created_at')
      .in('user_id', userIds)
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get daily stats for trend analysis
    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .in('user_id', userIds)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

    // Aggregate data for AI analysis
    const teamStats = {
      total_members: teamMembers.length,
      members: teamMembers.map(m => ({
        name: m.full_name,
        level: m.current_level,
        streak: m.current_streak,
        calls_this_week: recentCalls?.filter(c => c.user_id === m.user_id).length || 0,
        deals_closed: recentCalls?.filter(c => c.user_id === m.user_id && c.deal_value).length || 0,
        struggled_objections: recentCalls
          ?.filter(c => c.user_id === m.user_id && c.struggled_objections)
          .flatMap(c => c.struggled_objections || []) || []
      })),
      total_calls_this_week: recentCalls?.length || 0,
      total_deals: recentCalls?.filter(c => c.deal_value).length || 0,
      total_revenue: recentCalls?.reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0) || 0,
      common_objections: {} as Record<string, number>
    };

    // Count common struggled objections
    recentCalls?.forEach(call => {
      call.struggled_objections?.forEach((obj: string) => {
        teamStats.common_objections[obj] = (teamStats.common_objections[obj] || 0) + 1;
      });
    });

    // Daily trend
    const dailyTrend = (dailyStats || []).reduce((acc, stat: any) => {
      acc[stat.date] = acc[stat.date] || { calls: 0, deals: 0, revenue: 0 };
      acc[stat.date].calls += stat.calls_made + stat.calls_received;
      acc[stat.date].deals += stat.deals_closed;
      acc[stat.date].revenue += Number(stat.revenue_closed);
      return acc;
    }, {} as Record<string, { calls: number; deals: number; revenue: number }>);

    const prompt = `You are a sales manager AI assistant. Analyze this team's performance data and provide actionable insights.

TEAM DATA (Last 7 Days):
- Team Size: ${teamStats.total_members} reps
- Total Calls: ${teamStats.total_calls_this_week}
- Deals Closed: ${teamStats.total_deals}
- Revenue: $${teamStats.total_revenue.toLocaleString()}

INDIVIDUAL PERFORMANCE:
${teamStats.members.map(m => `- ${m.name}: ${m.calls_this_week} calls, ${m.deals_closed} deals, ${m.streak} day streak, Level ${m.level}`).join('\n')}

COMMON STRUGGLED OBJECTIONS:
${Object.entries(teamStats.common_objections).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([obj, count]) => `- "${obj}": ${count} occurrences`).join('\n') || 'None recorded'}

DAILY TREND:
${Object.entries(dailyTrend || {}).map(([date, data]) => `- ${date}: ${data.calls} calls, ${data.deals} deals, $${data.revenue}`).join('\n') || 'No daily data'}

Provide a JSON response with these exact fields:
{
  "team_trend": "One sentence about overall team trajectory this week (improving/declining/steady and why)",
  "coaching_opportunity": {
    "rep_name": "Name of rep who would benefit most from coaching",
    "reason": "Specific, actionable reason why (1-2 sentences)",
    "suggested_focus": "What to focus on in coaching session"
  },
  "skill_gap": {
    "gap": "Specific skill gap detected across team",
    "affected_count": number of reps affected,
    "recommendation": "How to address this gap"
  },
  "quota_prediction": {
    "percentage": estimated % likelihood of hitting monthly target (0-100),
    "confidence": "high/medium/low",
    "factors": "Key factors influencing this prediction"
  }
}

Be specific, actionable, and data-driven. If there's insufficient data for a field, return null for that field.`;

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
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const insightsText = aiData.choices?.[0]?.message?.content || '{}';
    
    let insights;
    try {
      insights = JSON.parse(insightsText);
    } catch {
      insights = {
        team_trend: 'Unable to analyze team data at this time.',
        coaching_opportunity: null,
        skill_gap: null,
        quota_prediction: null
      };
    }

    return new Response(JSON.stringify({
      success: true,
      insights,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating manager insights:', error);
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