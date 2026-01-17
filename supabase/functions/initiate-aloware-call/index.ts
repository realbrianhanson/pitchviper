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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const alowareToken = Deno.env.get('ALOWARE_API_TOKEN');

    if (!alowareToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aloware API token not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { contactPhoneNumber, linePhoneNumber, contactName, companyName, dealId } = await req.json();

    if (!contactPhoneNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Contact phone number is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Aloware ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('aloware_user_id, team_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.aloware_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Your Aloware account is not linked. Please configure it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initiate two-legged call via Aloware API
    const alowareResponse = await fetch('https://app.aloware.com/api/v1/webhook/two-legged-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_token: alowareToken,
        user_id: profile.aloware_user_id,
        contact_phone_number: contactPhoneNumber,
        line_phone_number: linePhoneNumber || undefined,
      }),
    });

    const alowareResult = await alowareResponse.json();

    if (!alowareResponse.ok) {
      console.error('Aloware API error:', alowareResult);
      
      // Log the error
      await supabase.from('aloware_sync_log').insert({
        event_type: 'call_initiation_failed',
        payload: { 
          contactPhoneNumber, 
          linePhoneNumber, 
          error: alowareResult 
        },
        processed: false,
        error_message: JSON.stringify(alowareResult),
      });

      return new Response(
        JSON.stringify({ success: false, error: alowareResult.message || 'Failed to initiate call' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update user status to on_call
    await supabase.rpc('update_user_status', {
      p_user_id: user.id,
      p_status: 'on_call',
      p_call_started_at: new Date().toISOString(),
    });

    // Create a pending call record
    const { data: callRecord, error: callError } = await supabase
      .from('calls')
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        contact_name: contactName || 'Unknown',
        company_name: companyName || null,
        phone_number: contactPhoneNumber,
        direction: 'outbound',
        outcome: 'connected',
        duration_seconds: 0,
        aloware_call_id: alowareResult.call_id || alowareResult.id || null,
        is_synced_from_aloware: false,
      })
      .select()
      .single();

    if (callError) {
      console.error('Error creating call record:', callError);
    }

    // Log successful initiation
    await supabase.from('aloware_sync_log').insert({
      event_type: 'call_initiated',
      payload: { 
        contactPhoneNumber, 
        linePhoneNumber,
        contactName,
        callId: callRecord?.id,
        alowareCallId: alowareResult.call_id || alowareResult.id,
      },
      processed: true,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Call initiated successfully',
        callId: callRecord?.id,
        alowareCallId: alowareResult.call_id || alowareResult.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in initiate-aloware-call:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
