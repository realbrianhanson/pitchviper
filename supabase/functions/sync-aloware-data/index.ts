import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Aloware uses /api/v1/webhook/ endpoints for their API
const ALOWARE_API_BASE = "https://app.aloware.com/api/v1/webhook";

interface AlowareUser {
  id: number;
  name: string;
  email: string;
  phone_number?: string;
  role?: string;
  avatar_url?: string;
  created_at?: string;
}

interface AlowareCall {
  id: number;
  user_id: number;
  contact_id?: number;
  contact_name?: string;
  contact_phone_number?: string;
  company_name?: string;
  direction: string;
  duration_seconds: number;
  disposition?: string;
  outcome?: string;
  recording_url?: string;
  transcription?: string;
  notes?: string;
  created_at: string;
}

interface AlowareContact {
  id: number;
  name: string;
  phone_number?: string;
  email?: string;
  company_name?: string;
  notes?: string;
  created_at: string;
  user_id?: number;
}

async function fetchAlowareData(endpoint: string, apiToken: string, params: Record<string, string> = {}) {
  const url = new URL(`${ALOWARE_API_BASE}${endpoint}`);
  url.searchParams.append("api_token", apiToken);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.append(key, value);
  }

  console.log(`Fetching from Aloware: ${endpoint}`);
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  const responseText = await response.text();
  
  // Check if response is HTML (error page)
  if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
    console.error('Aloware returned HTML instead of JSON');
    throw new Error('Invalid Aloware API response - check API token');
  }

  if (!response.ok) {
    console.error(`Aloware API error: ${response.status} - ${responseText}`);
    throw new Error(`Aloware API error: ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.error('Failed to parse Aloware response:', responseText.substring(0, 200));
    throw new Error('Invalid JSON response from Aloware');
  }
}

async function syncUsers(supabase: any, apiToken: string, teamId: string) {
  console.log("Syncing Aloware users...");
  
  try {
    const usersData = await fetchAlowareData("/users", apiToken);
    const users: AlowareUser[] = usersData.data || usersData || [];
    
    let synced = 0;
    let skipped = 0;

    for (const user of users) {
      // Check if profile with this aloware_user_id exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, user_id")
        .eq("aloware_user_id", user.id.toString())
        .single();

      if (existingProfile) {
        // Update existing profile
        await supabase
          .from("profiles")
          .update({
            full_name: user.name,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingProfile.id);
        synced++;
      } else {
        // Check if there's a profile with matching email that doesn't have aloware_user_id
        const { data: matchingProfile } = await supabase
          .from("profiles")
          .select("id, user_id")
          .eq("team_id", teamId)
          .is("aloware_user_id", null)
          .limit(100);

        // For now, log unmatched users - they'll need to be linked manually or via email match
        console.log(`Aloware user ${user.name} (${user.email}) not linked to any profile`);
        skipped++;
      }
    }

    console.log(`Users sync complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped, total: users.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error syncing users:", error);
    return { synced: 0, skipped: 0, total: 0, error: errorMessage };
  }
}

async function syncCalls(supabase: any, apiToken: string, teamId: string, daysBack: number = 30) {
  console.log(`Syncing Aloware calls from last ${daysBack} days...`);
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const callsData = await fetchAlowareData("/calls", apiToken, {
      start_date: startDate.toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      per_page: "500",
    });
    
    const calls: AlowareCall[] = callsData.data || callsData || [];
    
    let synced = 0;
    let skipped = 0;

    // Get all profiles with aloware_user_id for mapping
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, aloware_user_id")
      .eq("team_id", teamId)
      .not("aloware_user_id", "is", null);

    const alowareToUserMap = new Map(
      (profiles || []).map((p: any) => [p.aloware_user_id, p.user_id])
    );

    for (const call of calls) {
      // Check if call already synced
      const { data: existingCall } = await supabase
        .from("calls")
        .select("id")
        .eq("aloware_call_id", call.id.toString())
        .single();

      if (existingCall) {
        skipped++;
        continue;
      }

      // Find matching user
      const userId = alowareToUserMap.get(call.user_id?.toString());
      if (!userId) {
        console.log(`No matching user for Aloware user_id: ${call.user_id}`);
        skipped++;
        continue;
      }

      // Map disposition
      const dispositionMap: Record<string, string> = {
        "Appointment Set": "appointment_set",
        "Callback": "callback_scheduled",
        "Not Interested": "not_interested",
        "Deal Closed": "deal_closed",
        "Voicemail": "voicemail",
        "No Answer": "no_answer",
        "Wrong Number": "wrong_number",
        "Busy": "busy",
        "DNC": "dnc",
      };

      // Map outcome
      const outcomeMap: Record<string, string> = {
        "answered": "connected",
        "connected": "connected",
        "voicemail": "voicemail",
        "no_answer": "no_answer",
        "busy": "no_answer",
        "failed": "no_answer",
      };

      const { error } = await supabase.from("calls").insert({
        user_id: userId,
        team_id: teamId,
        aloware_call_id: call.id.toString(),
        contact_name: call.contact_name || "Unknown",
        phone_number: call.contact_phone_number,
        company_name: call.company_name,
        direction: call.direction === "inbound" ? "inbound" : "outbound",
        duration_seconds: call.duration_seconds || 0,
        outcome: outcomeMap[call.outcome?.toLowerCase() || ""] || "connected",
        disposition: dispositionMap[call.disposition || ""] || call.disposition,
        aloware_recording_url: call.recording_url,
        aloware_transcription: call.transcription,
        notes: call.notes,
        is_synced_from_aloware: true,
        created_at: call.created_at,
      });

      if (error) {
        console.error(`Error inserting call ${call.id}:`, error);
        skipped++;
      } else {
        synced++;
      }
    }

    console.log(`Calls sync complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped, total: calls.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error syncing calls:", error);
    return { synced: 0, skipped: 0, total: 0, error: errorMessage };
  }
}

async function syncContacts(supabase: any, apiToken: string, teamId: string, userId: string) {
  console.log("Syncing Aloware contacts as deals...");
  
  try {
    const contactsData = await fetchAlowareData("/contacts", apiToken, {
      per_page: "500",
    });
    
    const contacts: AlowareContact[] = contactsData.data || contactsData || [];
    
    let synced = 0;
    let skipped = 0;

    // Get profiles for user mapping
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, aloware_user_id")
      .eq("team_id", teamId)
      .not("aloware_user_id", "is", null);

    const alowareToUserMap = new Map(
      (profiles || []).map((p: any) => [p.aloware_user_id, p.user_id])
    );

    for (const contact of contacts) {
      // Check if deal with this phone already exists
      if (contact.phone_number) {
        const { data: existingDeal } = await supabase
          .from("deals")
          .select("id")
          .eq("contact_phone", contact.phone_number)
          .eq("team_id", teamId)
          .single();

        if (existingDeal) {
          skipped++;
          continue;
        }
      }

      // Determine which user to assign to
      const assignedUserId = contact.user_id 
        ? alowareToUserMap.get(contact.user_id.toString()) || userId
        : userId;

      const { error } = await supabase.from("deals").insert({
        user_id: assignedUserId,
        team_id: teamId,
        contact_name: contact.name || "Unknown Contact",
        contact_phone: contact.phone_number,
        contact_email: contact.email,
        company_name: contact.company_name || "Unknown Company",
        stage: "lead",
        deal_value: 0,
        deal_type: "new_business",
        source: "aloware_import",
        notes: contact.notes,
        created_at: contact.created_at,
      });

      if (error) {
        console.error(`Error inserting contact ${contact.id}:`, error);
        skipped++;
      } else {
        synced++;
      }
    }

    console.log(`Contacts sync complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped, total: contacts.length };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error syncing contacts:", error);
    return { synced: 0, skipped: 0, total: 0, error: errorMessage };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiToken = Deno.env.get("ALOWARE_API_TOKEN");
    if (!apiToken) {
      console.error("ALOWARE_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Aloware API token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { 
      syncType = "all", // "users" | "calls" | "contacts" | "all"
      teamId,
      userId,
      daysBack = 30,
    } = body;

    if (!teamId || !userId) {
      return new Response(
        JSON.stringify({ success: false, error: "teamId and userId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting Aloware sync: type=${syncType}, team=${teamId}`);

    const results: Record<string, any> = {};

    if (syncType === "all" || syncType === "users") {
      results.users = await syncUsers(supabase, apiToken, teamId);
    }

    if (syncType === "all" || syncType === "calls") {
      results.calls = await syncCalls(supabase, apiToken, teamId, daysBack);
    }

    if (syncType === "all" || syncType === "contacts") {
      results.contacts = await syncContacts(supabase, apiToken, teamId, userId);
    }

    // Log the sync
    await supabase.from("aloware_sync_log").insert({
      event_type: `sync_${syncType}`,
      payload: { teamId, userId, results },
      processed: true,
    });

    console.log("Aloware sync completed:", results);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in sync-aloware-data:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
