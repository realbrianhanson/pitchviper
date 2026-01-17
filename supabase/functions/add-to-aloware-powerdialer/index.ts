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

    const { contacts, position = 'bottom' } = await req.json();

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'At least one contact is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Aloware ID
    const { data: profile } = await supabase
      .from('profiles')
      .select('aloware_user_id')
      .eq('user_id', user.id)
      .single();

    if (!profile?.aloware_user_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Your Aloware account is not linked. Please configure it in Settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results = [];
    const errors = [];

    // Add each contact to the power dialer
    for (const contact of contacts) {
      try {
        const alowareResponse = await fetch('https://app.aloware.com/api/v1/contacts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${alowareToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            api_token: alowareToken,
            phone_number: contact.phoneNumber,
            name: contact.name || 'Unknown',
            company_name: contact.companyName || undefined,
            email: contact.email || undefined,
            add_to_powerdialer: true,
            powerdialer_position: position,
            user_id: profile.aloware_user_id,
          }),
        });

        const alowareResult = await alowareResponse.json();

        if (alowareResponse.ok) {
          results.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            success: true,
            alowareContactId: alowareResult.id,
          });
        } else {
          errors.push({
            phoneNumber: contact.phoneNumber,
            name: contact.name,
            error: alowareResult.message || 'Failed to add to power dialer',
          });
        }
      } catch (err) {
        errors.push({
          phoneNumber: contact.phoneNumber,
          name: contact.name,
          error: 'Network error',
        });
      }
    }

    // Log the operation
    await supabase.from('aloware_sync_log').insert({
      event_type: 'powerdialer_add',
      payload: { 
        contactsAdded: results.length,
        contactsFailed: errors.length,
        position,
      },
      processed: true,
      error_message: errors.length > 0 ? JSON.stringify(errors) : null,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Added ${results.length} contact(s) to power dialer`,
        added: results,
        failed: errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in add-to-aloware-powerdialer:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
