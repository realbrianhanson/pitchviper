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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const alowareToken = Deno.env.get('ALOWARE_API_TOKEN');

  // Get user from auth header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ success: false, error: 'Not authenticated' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } }
  });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid authentication' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { phoneNumber, message, contactName, dealId } = await req.json();

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone number and message are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile for Aloware user ID and team
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('aloware_user_id, team_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.aloware_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aloware account not connected. Please configure your Aloware User ID in settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!alowareToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Aloware API token not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send SMS via Aloware API
    console.log('Sending SMS via Aloware:', { to: phoneNumber, userId: profile.aloware_user_id });

    const alowareResponse = await fetch('https://app.aloware.com/api/v1/webhook/sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_token: alowareToken,
        user_id: profile.aloware_user_id,
        to: phoneNumber,
        message: message,
      }),
    });

    const alowareData = await alowareResponse.json();
    console.log('Aloware SMS response:', alowareData);

    if (!alowareResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: alowareData.message || 'Failed to send SMS via Aloware' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log SMS in database
    const { data: smsRecord, error: insertError } = await supabase
      .from('sms_messages')
      .insert({
        user_id: user.id,
        team_id: profile.team_id,
        deal_id: dealId || null,
        contact_phone: phoneNumber,
        contact_name: contactName || null,
        message: message,
        direction: 'outbound',
        aloware_message_id: alowareData.id || alowareData.message_id || null,
        status: 'sent',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to log SMS:', insertError);
      // Don't fail the request, SMS was sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: smsRecord?.id,
        alowareMessageId: alowareData.id || alowareData.message_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('SMS sending error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
