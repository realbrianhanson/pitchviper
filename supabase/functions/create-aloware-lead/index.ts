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

    const { 
      firstName,
      lastName, 
      fullName,
      email, 
      phone, 
      company, 
      title,
      notes,
      tags,
      dealId,
      assignToUser,
    } = await req.json();

    // Parse name if only fullName provided
    let parsedFirstName = firstName;
    let parsedLastName = lastName;
    if (!firstName && !lastName && fullName) {
      const nameParts = fullName.trim().split(' ');
      parsedFirstName = nameParts[0] || '';
      parsedLastName = nameParts.slice(1).join(' ') || '';
    }

    if (!phone && !email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone or email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's Aloware ID for assignment
    const { data: profile } = await supabase
      .from('profiles')
      .select('aloware_user_id, team_id')
      .eq('user_id', user.id)
      .single();

    // Build lead/contact payload for Aloware
    const leadPayload: Record<string, any> = {
      api_token: alowareToken,
      first_name: parsedFirstName,
      last_name: parsedLastName,
    };

    if (email) leadPayload.email = email;
    if (phone) leadPayload.phone_number = phone.replace(/\D/g, ''); // Clean phone
    if (company) leadPayload.company_name = company;
    if (title) leadPayload.title = title;
    if (notes) leadPayload.notes = notes;
    if (tags && tags.length > 0) leadPayload.tags = tags;
    
    // Assign to user's Aloware ID if available
    if (assignToUser && profile?.aloware_user_id) {
      leadPayload.user_id = profile.aloware_user_id;
    }

    console.log('Creating lead in Aloware:', { 
      firstName: parsedFirstName, 
      lastName: parsedLastName, 
      company,
      hasPhone: !!phone,
      hasEmail: !!email 
    });

    // Call Aloware Lead API
    const alowareResponse = await fetch('https://app.aloware.com/api/v1/webhook/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(leadPayload),
    });

    const responseText = await alowareResponse.text();

    // Check for HTML error
    if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
      console.error('Aloware returned HTML - API error');
      return new Response(
        JSON.stringify({ success: false, error: 'Aloware API error - check configuration' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse Aloware response:', responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid response from Aloware' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!alowareResponse.ok) {
      console.error('Aloware API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || result.error || 'Failed to create lead in Aloware' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const alowareContactId = result.id || result.data?.id;

    // Log the creation
    await supabase.from('aloware_sync_log').insert({
      event_type: 'lead_created',
      payload: {
        firstName: parsedFirstName,
        lastName: parsedLastName,
        company,
        email,
        phone,
        dealId,
        alowareContactId,
        createdBy: user.id,
      },
      processed: true,
    });

    console.log('Successfully created lead in Aloware:', alowareContactId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead created in Aloware',
        alowareContactId,
        contact: {
          id: alowareContactId,
          firstName: parsedFirstName,
          lastName: parsedLastName,
          fullName: `${parsedFirstName} ${parsedLastName}`.trim(),
          email,
          phone,
          company,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in create-aloware-lead:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
