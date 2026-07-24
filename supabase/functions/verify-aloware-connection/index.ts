import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alowareToken = Deno.env.get('ALOWARE_API_TOKEN');

    if (!alowareToken) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Aloware API token not configured. Please add ALOWARE_API_TOKEN to secrets.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, alowareUserId, profileId } = await req.json();

    if (action === 'verify') {
      // Call Aloware API to verify the token and get users
      // Aloware webhook API uses /api/v1/webhook/users endpoint
      const alowareUrl = new URL('https://app.aloware.com/api/v1/webhook/users');
      alowareUrl.searchParams.append('api_token', alowareToken);
      
      console.log('Calling Aloware API:', alowareUrl.toString().replace(alowareToken, '[REDACTED]'));
      
      const alowareResponse = await fetch(alowareUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await alowareResponse.text();
      
      // Check if response is HTML (error page)
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        console.error('Aloware returned HTML instead of JSON - likely invalid API token or endpoint');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid Aloware API token or the API endpoint has changed. Please verify your token.' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (!alowareResponse.ok) {
        console.error('Aloware API error:', responseText);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Aloware API error: ${alowareResponse.status}` 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      let alowareUsers;
      try {
        alowareUsers = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse Aloware response:', responseText.substring(0, 200));
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Invalid response from Aloware API' 
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      // On a genuine successful verification by team management, stamp
      // company_settings so the setup wizard reflects a real Aloware connection.
      try {
        const { data: isMgmt } = await supabase.rpc('has_management_role', { _user_id: user.id });
        if (isMgmt) {
          const { data: callerProfile } = await supabase
            .from('profiles').select('team_id').eq('user_id', user.id).maybeSingle();
          if (callerProfile?.team_id) {
            const nowIso = new Date().toISOString();
            const { data: existing } = await supabase
              .from('company_settings')
              .select('id, crm_connected_at')
              .eq('team_id', callerProfile.team_id)
              .maybeSingle();
            if (existing?.id) {
              await supabase.from('company_settings').update({
                crm_provider: 'aloware',
                crm_connected_at: existing.crm_connected_at ?? nowIso,
              }).eq('id', existing.id);
            } else {
              await supabase.from('company_settings').insert({
                team_id: callerProfile.team_id,
                crm_provider: 'aloware',
                crm_connected_at: nowIso,
              });
            }
          }
        }
      } catch (stampErr) {
        console.warn('verify-aloware-connection could not stamp company_settings', stampErr);
      }

      return new Response(
        JSON.stringify({
          success: true,
          users: alowareUsers.data || alowareUsers,
          message: 'Successfully connected to Aloware'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'link-user') {
      // Link the current user to an Aloware user ID
      if (!alowareUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Aloware User ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ aloware_user_id: alowareUserId })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to link Aloware user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Successfully linked Aloware user' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get-status') {
      // Get the current user's Aloware connection status
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('aloware_user_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to get profile' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get last sync timestamp
      const { data: lastSync } = await supabase
        .from('aloware_sync_log')
        .select('created_at')
        .eq('processed', true)
        .order('created_at', { ascending: false })
        .limit(1);

      return new Response(
        JSON.stringify({ 
          success: true, 
          connected: !!profile?.aloware_user_id,
          alowareUserId: profile?.aloware_user_id,
          lastSyncAt: lastSync?.[0]?.created_at || null
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'sync-team') {
      // Only owner / admin / manager can sync team members
      const { data: isMgmt } = await supabase.rpc('has_management_role', { _user_id: user.id });
      if (!isMgmt) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only team management can sync team members' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get Aloware users using webhook API endpoint
      const alowareUrl = new URL('https://app.aloware.com/api/v1/webhook/users');
      alowareUrl.searchParams.append('api_token', alowareToken);
      
      console.log('Syncing team - calling Aloware API');
      
      const alowareResponse = await fetch(alowareUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await alowareResponse.text();
      
      if (!alowareResponse.ok || responseText.startsWith('<!DOCTYPE')) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to fetch Aloware users - check API token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let alowareUsers;
      try {
        alowareUsers = JSON.parse(responseText);
      } catch {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid response from Aloware' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const users = alowareUsers.data || alowareUsers;

      // Get all team profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, aloware_user_id');

      // Try to auto-match by comparing names (simplified matching)
      const matchResults = [];
      for (const profile of profiles || []) {
        const matchedAlowareUser = users.find((au: any) => 
          au.name?.toLowerCase() === profile.full_name?.toLowerCase() ||
          au.email?.toLowerCase() === profile.full_name?.toLowerCase()
        );

        matchResults.push({
          profileId: profile.id,
          profileName: profile.full_name,
          currentAlowareId: profile.aloware_user_id,
          suggestedAlowareUser: matchedAlowareUser || null,
        });
      }

      // Log the sync attempt
      await supabase.from('aloware_sync_log').insert({
        event_type: 'team_sync',
        payload: { 
          alowareUsersCount: users.length, 
          profilesCount: profiles?.length || 0,
          matchesFound: matchResults.filter(m => m.suggestedAlowareUser).length
        },
        processed: true,
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          alowareUsers: users,
          matchResults,
          message: `Found ${users.length} Aloware users` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'map-user') {
      // Only owner / admin / manager can map profiles
      const { data: isMgmt } = await supabase.rpc('has_management_role', { _user_id: user.id });
      if (!isMgmt) {
        return new Response(
          JSON.stringify({ success: false, error: 'Only team management can map users' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!profileId || !alowareUserId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Profile ID and Aloware User ID are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // The target profile must live on the caller's team.
      const { data: callerProfile } = await supabase
        .from('profiles').select('team_id').eq('user_id', user.id).maybeSingle();
      const { data: targetProfile } = await supabase
        .from('profiles').select('team_id').eq('id', profileId).maybeSingle();
      if (!callerProfile?.team_id || callerProfile.team_id !== targetProfile?.team_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'Forbidden' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ aloware_user_id: alowareUserId })
        .eq('id', profileId);

      if (updateError) {
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to map user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User mapped successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in verify-aloware-connection:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
