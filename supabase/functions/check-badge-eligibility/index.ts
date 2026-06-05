import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BadgeCheck {
  badgeId: string;
  badgeName: string;
  earned: boolean;
  xpReward: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { user_id, trigger_type } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get user's current stats
    const [
      { data: profile },
      { data: dailyStats },
      { data: allCalls },
      { data: allSessions },
      { data: userBadges },
      { data: allBadges }
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', user_id).single(),
      supabase.from('daily_stats').select('*').eq('user_id', user_id).eq('date', new Date().toISOString().split('T')[0]).single(),
      supabase.from('calls').select('*').eq('user_id', user_id),
      supabase.from('roleplay_sessions').select('*').eq('user_id', user_id).eq('status', 'completed'),
      supabase.from('user_badges').select('badge_id').eq('user_id', user_id),
      supabase.from('badges').select('*')
    ]);

    const earnedBadgeIds = new Set((userBadges || []).map(ub => ub.badge_id));
    const newlyEarnedBadges: BadgeCheck[] = [];

    // Calculate stats
    const lifetimeCalls = (allCalls || []).length;
    const todayCalls = dailyStats?.calls_made || 0;
    const lifetimeDeals = (allCalls || []).filter(c => c.disposition === 'Deal Closed').length;
    const todayDeals = dailyStats?.deals_closed || 0;
    const lifetimeRevenue = (allCalls || []).reduce((sum, c) => sum + (c.deal_value || 0), 0);
    const maxDealValue = Math.max(...(allCalls || []).map(c => c.deal_value || 0), 0);
    const currentStreak = profile?.current_streak || 0;
    const completedRoleplays = (allSessions || []).length;
    const maxRoleplayScore = Math.max(...(allSessions || []).map(s => s.score || 0), 0);

    // Check each badge
    for (const badge of (allBadges || [])) {
      if (earnedBadgeIds.has(badge.id)) continue;

      let earned = false;

      switch (badge.category) {
        case 'calls':
          if (badge.requirement_type === 'count') {
            if (badge.requirement_description.includes('one day')) {
              earned = todayCalls >= badge.requirement_value;
            } else {
              earned = lifetimeCalls >= badge.requirement_value;
            }
          }
          break;

        case 'closes':
          if (badge.requirement_type === 'count') {
            if (badge.requirement_description.includes('one day')) {
              earned = todayDeals >= badge.requirement_value;
            } else {
              earned = lifetimeDeals >= badge.requirement_value;
            }
          } else if (badge.requirement_type === 'score') {
            if (badge.requirement_description.includes('lifetime revenue')) {
              earned = lifetimeRevenue >= badge.requirement_value;
            } else {
              earned = maxDealValue >= badge.requirement_value;
            }
          }
          break;

        case 'streaks':
          if (badge.requirement_type === 'streak') {
            earned = currentStreak >= badge.requirement_value;
          }
          break;

        case 'roleplay':
          if (badge.requirement_type === 'count') {
            earned = completedRoleplays >= badge.requirement_value;
          } else if (badge.requirement_type === 'score') {
            earned = maxRoleplayScore >= badge.requirement_value;
          }
          break;

        case 'team':
          // Team badges require more complex checks - skip for now
          break;

        case 'training':
          // Training badges require training module completion tracking
          break;

        case 'special':
          // Special badges have custom logic
          if (badge.name === 'Early Adopter') {
            // Check if user signed up within first month
            const launchDate = new Date('2024-01-01');
            const signupDate = new Date(profile?.created_at || '');
            const oneMonthAfterLaunch = new Date(launchDate);
            oneMonthAfterLaunch.setMonth(oneMonthAfterLaunch.getMonth() + 1);
            earned = signupDate <= oneMonthAfterLaunch;
          }
          break;
      }

      if (earned) {
        // Award the badge
        const { error: insertError } = await supabase
          .from('user_badges')
          .insert({ user_id, badge_id: badge.id });

        if (!insertError) {
          // Update user XP
          await supabase
            .from('profiles')
            .update({ xp_points: (profile?.xp_points || 0) + badge.xp_reward })
            .eq('user_id', user_id);

          // Log activity
          await supabase.rpc('log_activity', {
            p_user_id: user_id,
            p_activity_type: 'badge_earned',
            p_metadata: { badge_id: badge.id, badge_name: badge.name, xp_reward: badge.xp_reward }
          });

          newlyEarnedBadges.push({
            badgeId: badge.id,
            badgeName: badge.name,
            earned: true,
            xpReward: badge.xp_reward
          });
        }
      }
    }

    // Check for level up
    let leveledUp = false;
    let newLevel = null;
    
    if (newlyEarnedBadges.length > 0) {
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('xp_points, current_level')
        .eq('user_id', user_id)
        .single();

      const { data: levels } = await supabase
        .from('levels')
        .select('*')
        .order('xp_required', { ascending: true });

      if (updatedProfile && levels) {
        const currentXp = updatedProfile.xp_points;
        const eligibleLevel = levels.filter(l => l.xp_required <= currentXp).pop();
        
        if (eligibleLevel && eligibleLevel.level_number > updatedProfile.current_level) {
          await supabase
            .from('profiles')
            .update({ current_level: eligibleLevel.level_number })
            .eq('user_id', user_id);

          await supabase.rpc('log_activity', {
            p_user_id: user_id,
            p_activity_type: 'level_up',
            p_metadata: { new_level: eligibleLevel.level_number, level_title: eligibleLevel.title }
          });

          leveledUp = true;
          newLevel = eligibleLevel;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        newBadges: newlyEarnedBadges,
        leveledUp,
        newLevel,
        totalNewXp: newlyEarnedBadges.reduce((sum, b) => sum + b.xpReward, 0)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Badge check error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
