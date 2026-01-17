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

    const { phoneNumber, email, name, action } = await req.json();

    // Action: lookup - Search for a contact
    if (action === 'lookup' || !action) {
      if (!phoneNumber && !email && !name) {
        return new Response(
          JSON.stringify({ success: false, error: 'Phone number, email, or name is required for lookup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build query params for contact lookup
      const alowareUrl = new URL('https://app.aloware.com/api/v1/webhook/contacts');
      alowareUrl.searchParams.append('api_token', alowareToken);
      
      if (phoneNumber) {
        // Clean phone number - remove non-digits
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        alowareUrl.searchParams.append('phone_number', cleanPhone);
      }
      if (email) {
        alowareUrl.searchParams.append('email', email);
      }
      if (name) {
        alowareUrl.searchParams.append('search', name);
      }

      console.log('Looking up contact in Aloware:', { phoneNumber, email, name });

      const alowareResponse = await fetch(alowareUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      const responseText = await alowareResponse.text();

      // Check for HTML error response
      if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
        console.error('Aloware returned HTML - API error');
        return new Response(
          JSON.stringify({ success: false, error: 'Aloware API error - check token' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!alowareResponse.ok) {
        console.error('Aloware lookup error:', responseText);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to lookup contact' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let result;
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse Aloware response');
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid response from Aloware' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const contacts = result.data || result || [];
      
      // Transform to a cleaner format
      const formattedContacts = Array.isArray(contacts) ? contacts.map((c: any) => ({
        id: c.id,
        firstName: c.first_name || c.firstName,
        lastName: c.last_name || c.lastName,
        fullName: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        phone: c.phone_number || c.phone,
        company: c.company_name || c.company,
        title: c.title || c.job_title,
        tags: c.tags || [],
        createdAt: c.created_at,
        lastContactedAt: c.last_contacted_at,
        alowareId: c.id,
      })) : [];

      console.log(`Found ${formattedContacts.length} contacts`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          contacts: formattedContacts,
          count: formattedContacts.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: get-details - Get full contact details by ID
    if (action === 'get-details') {
      const { contactId } = await req.json();
      
      if (!contactId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Contact ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const alowareUrl = new URL(`https://app.aloware.com/api/v1/webhook/contacts/${contactId}`);
      alowareUrl.searchParams.append('api_token', alowareToken);

      const alowareResponse = await fetch(alowareUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!alowareResponse.ok) {
        return new Response(
          JSON.stringify({ success: false, error: 'Contact not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const contact = await alowareResponse.json();

      return new Response(
        JSON.stringify({ 
          success: true, 
          contact: {
            id: contact.id,
            firstName: contact.first_name,
            lastName: contact.last_name,
            fullName: contact.name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
            email: contact.email,
            phone: contact.phone_number || contact.phone,
            company: contact.company_name || contact.company,
            title: contact.title || contact.job_title,
            address: contact.address,
            city: contact.city,
            state: contact.state,
            tags: contact.tags || [],
            notes: contact.notes,
            customFields: contact.custom_fields || {},
            createdAt: contact.created_at,
            lastContactedAt: contact.last_contacted_at,
            callHistory: contact.calls || [],
            alowareId: contact.id,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in lookup-aloware-contact:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
