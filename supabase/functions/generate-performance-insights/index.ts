import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rl = await enforceRateLimit(user.id, 'generate-performance-insights', { serviceClient: supabase });
    if (!rl.allowed) return rl.response!;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString();

    // Fetch user's call data
    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    // Fetch roleplay sessions
    const { data: roleplays } = await supabase
      .from('roleplay_sessions')
      .select('*, roleplay_scenarios(name)')
      .eq('user_id', user.id)
      .gte('started_at', startDate)
      .order('started_at', { ascending: false });

    // Fetch daily stats
    const { data: dailyStats } = await supabase
      .from('daily_stats')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate.split('T')[0])
      .order('date', { ascending: false });

    // Prepare analysis data
    const totalCalls = calls?.length || 0;
    const connectedCalls = calls?.filter(c => c.outcome === 'connected').length || 0;
    const connectRate = totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0';
    
    // Analyze call patterns by hour
    const hourlyConnects: Record<number, { total: number; connected: number }> = {};
    calls?.forEach(call => {
      const hour = new Date(call.created_at).getHours();
      if (!hourlyConnects[hour]) {
        hourlyConnects[hour] = { total: 0, connected: 0 };
      }
      hourlyConnects[hour].total++;
      if (call.outcome === 'connected') {
        hourlyConnects[hour].connected++;
      }
    });

    // Find best calling hour
    let bestHour = { hour: 10, rate: 0 };
    Object.entries(hourlyConnects).forEach(([hour, data]) => {
      if (data.total >= 3) { // Minimum threshold
        const rate = (data.connected / data.total) * 100;
        if (rate > bestHour.rate) {
          bestHour = { hour: parseInt(hour), rate };
        }
      }
    });

    // Analyze objections
    const objectionCounts: Record<string, number> = {};
    calls?.forEach(call => {
      if (call.struggled_objections && Array.isArray(call.struggled_objections)) {
        call.struggled_objections.forEach((obj: string) => {
          objectionCounts[obj] = (objectionCounts[obj] || 0) + 1;
        });
      }
    });
    const topObjection = Object.entries(objectionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

    // Analyze self-ratings
    const ratings = calls?.filter(c => c.self_rating).map(c => c.self_rating!) || [];
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) 
      : null;

    // Analyze roleplay scores
    const roleplayScores = roleplays?.filter(r => r.score).map(r => r.score!) || [];
    const avgRoleplayScore = roleplayScores.length > 0
      ? Math.round(roleplayScores.reduce((a, b) => a + b, 0) / roleplayScores.length)
      : null;

    // Analyze dispositions
    const dispositions: Record<string, number> = {};
    calls?.filter(c => c.disposition).forEach(call => {
      const disp = call.disposition as string;
      dispositions[disp] = (dispositions[disp] || 0) + 1;
    });

    // Calculate appointments and deals
    const appointmentsSet = dispositions['appointment_set'] || 0;
    const dealsClosed = dispositions['deal_closed'] || 0;

    // Calculate total revenue
    const totalRevenue = calls?.reduce((sum, c) => sum + (c.deal_value || 0), 0) || 0;

    // Build context for AI
    const analysisContext = `
User's Sales Performance Data (Last 30 Days):

CALL METRICS:
- Total Calls Made: ${totalCalls}
- Connected Calls: ${connectedCalls} (${connectRate}% connect rate)
- Appointments Set: ${appointmentsSet}
- Deals Closed: ${dealsClosed}
- Total Revenue: $${totalRevenue.toLocaleString()}
- Average Self-Rating: ${avgRating || 'N/A'}/5

CALL PATTERNS:
- Best Performing Hour: ${bestHour.hour}:00 with ${bestHour.rate.toFixed(0)}% connect rate
${Object.entries(hourlyConnects).length > 0 ? 
  `- Hours with most calls: ${Object.entries(hourlyConnects)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 3)
    .map(([h, d]) => `${h}:00 (${d.total} calls)`).join(', ')}` : ''}

OBJECTION HANDLING:
${topObjection ? `- Most struggled objection: "${topObjection}" (${objectionCounts[topObjection]} times)` : '- No objections logged'}
${Object.entries(objectionCounts).length > 1 ? 
  `- Other common objections: ${Object.entries(objectionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(1, 3)
    .map(([obj, count]) => `"${obj}" (${count})`).join(', ')}` : ''}

ROLEPLAY TRAINING:
- Sessions Completed: ${roleplays?.filter(r => r.status === 'completed').length || 0}
- Average Score: ${avgRoleplayScore ? `${avgRoleplayScore}/100` : 'N/A'}
${roleplayScores.length > 0 ? `- Best Score: ${Math.max(...roleplayScores)}/100` : ''}

DISPOSITION BREAKDOWN:
${Object.entries(dispositions)
  .sort((a, b) => b[1] - a[1])
  .map(([disp, count]) => `- ${disp.replace(/_/g, ' ')}: ${count}`)
  .join('\n') || '- No dispositions logged'}
`;

    // Call Lovable AI for insights
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert sales coach analyzing a sales rep's performance data. Generate personalized, actionable insights based on their metrics.

Your response must be a valid JSON object with this exact structure:
{
  "bigWin": {
    "title": "Short title (2-4 words)",
    "description": "Specific observation about what they're doing well (1-2 sentences)"
  },
  "growthArea": {
    "title": "Short title (2-4 words)",
    "description": "Specific skill to focus on with why and how (1-2 sentences)"
  },
  "patternDetected": {
    "title": "Short title (2-4 words)", 
    "description": "Data-driven insight from their patterns (1-2 sentences)"
  },
  "recommendedActions": [
    "Specific action 1 for this week",
    "Specific action 2 for this week",
    "Specific action 3 for this week"
  ]
}

Rules:
- Be specific and reference actual numbers from their data
- If data is limited, focus on encouraging action and building habits
- Keep insights actionable and motivating, not generic
- Reference specific hours, objections, or patterns when available`
          },
          {
            role: 'user',
            content: `Analyze this sales rep's performance and provide personalized coaching insights:\n\n${analysisContext}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error('Failed to generate insights');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let insights;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      insights = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Return default insights
      insights = {
        bigWin: {
          title: "Building Momentum",
          description: `You've made ${totalCalls} calls this month. Keep pushing to build your pipeline!`
        },
        growthArea: {
          title: "Consistency",
          description: "Focus on making calls consistently each day to build momentum and improve your skills."
        },
        patternDetected: {
          title: "Data Building",
          description: "Keep logging your calls and self-assessments to unlock more personalized insights."
        },
        recommendedActions: [
          "Set a daily call target and track it",
          "Practice handling your toughest objection in roleplay",
          "Review and improve your opening pitch"
        ]
      };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
