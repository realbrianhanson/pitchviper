import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";
import { getTeamAlowareToken } from "../_shared/alowareIntegration.ts";


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

  // no PII logging
  
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  const responseText = await response.text();
  
  // Check if response is HTML (error page)
  if (responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html')) {
    // provider returned HTML error page
    throw new Error('Invalid Aloware API response - check API token');
  }

  if (!response.ok) {
    console.error(`aloware_api_status:${response.status}`);
    throw new Error(`Aloware API error: ${response.status}`);
  }

  try {
    return JSON.parse(responseText);
  } catch {
    console.error('aloware_parse_failed');
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
        // unlinked user (no PII log)
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
        // no matching sf user for aloware user_id (no PII log)
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
        console.error('call_insert_failed');
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

async function syncContacts(supabase: any, apiToken: string, teamId: string, userId: string, daysBack: number = 90) {
  // Aloware doesn't have a bulk GET /contacts endpoint - only individual lookup by phone
  // Instead, we extract contacts from synced call data
  console.log("Extracting contacts from call history as deals...");
  
  try {
    // First sync calls to ensure we have recent data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    
    const callsData = await fetchAlowareData("/calls", apiToken, {
      start_date: startDate.toISOString().split("T")[0],
      end_date: new Date().toISOString().split("T")[0],
      per_page: "500",
    });
    
    const calls: AlowareCall[] = callsData.data || callsData || [];
    console.log(`Found ${calls.length} calls to extract contacts from`);
    
    // Get all profiles with aloware_user_id for mapping
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, aloware_user_id")
      .eq("team_id", teamId)
      .not("aloware_user_id", "is", null);

    const alowareToUserMap = new Map(
      (profiles || []).map((p: any) => [p.aloware_user_id, p.user_id])
    );

    // Extract unique contacts from calls
    const contactMap = new Map<string, {
      name: string;
      phone: string;
      company?: string;
      alowareUserId?: number;
    }>();

    for (const call of calls) {
      if (call.contact_phone_number && !contactMap.has(call.contact_phone_number)) {
        contactMap.set(call.contact_phone_number, {
          name: call.contact_name || "Unknown",
          phone: call.contact_phone_number,
          company: call.company_name,
          alowareUserId: call.user_id,
        });
      }
    }

    console.log(`Extracted ${contactMap.size} unique contacts from calls`);
    
    let synced = 0;
    let skipped = 0;

    for (const [phone, contact] of contactMap) {
      // Check if deal with this phone already exists
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id")
        .eq("contact_phone", phone)
        .eq("team_id", teamId)
        .single();

      if (existingDeal) {
        skipped++;
        continue;
      }

      // Determine which user to assign to
      const assignedUserId = contact.alowareUserId 
        ? alowareToUserMap.get(contact.alowareUserId.toString()) || userId
        : userId;

      const { error } = await supabase.from("deals").insert({
        user_id: assignedUserId,
        team_id: teamId,
        contact_name: contact.name,
        contact_phone: contact.phone,
        company_name: contact.company || "Unknown Company",
        stage: "lead",
        deal_value: 0,
        deal_type: "new_business",
        source: "aloware_import",
      });

      if (error) {
        console.error('contact_insert_failed');
        skipped++;
      } else {
        synced++;
      }
    }

    console.log(`Contacts sync complete: ${synced} synced, ${skipped} skipped`);
    return { synced, skipped, total: contactMap.size };
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authedUserId = userData.user.id;

    const apiToken = Deno.env.get("ALOWARE_API_TOKEN");
    if (!apiToken) {
      console.error("ALOWARE_API_TOKEN not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Aloware API token not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const _ent = await requireTeamEntitlement(supabase, authedUserId, "starter");
    if (!_ent.ok) return _ent.response;

    const body = await req.json().catch(() => ({}));
    const {
      syncType = "all",
      daysBack = 30,
    } = body;

    // Derive team + rep server-side. Never trust client-supplied teamId / userId.
    const { data: callerProfile } = await supabase
      .from('profiles').select('team_id').eq('user_id', authedUserId).maybeSingle();
    const teamId = callerProfile?.team_id ?? null;
    if (!teamId) {
      return new Response(JSON.stringify({ success: false, error: 'No team' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Only owner / admin / manager on that team may trigger a sync
    const { data: isMgmt } = await supabase.rpc('has_management_role', { _user_id: authedUserId });
    if (!isMgmt) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const userId = authedUserId;

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

    // Sanitized audit row — counts only, no PII/payload bodies.
    const counters: Record<string, number> = {};
    for (const [k, v] of Object.entries(results as Record<string, { synced?: number; skipped?: number; total?: number }>)) {
      if (v?.synced != null) counters[`${k}_synced`] = v.synced;
      if (v?.skipped != null) counters[`${k}_skipped`] = v.skipped;
      if (v?.total != null) counters[`${k}_total`] = v.total;
    }
    await supabase.from("aloware_sync_log").insert({
      event_type: `sync_${syncType}`.slice(0, 64),
      team_id: teamId,
      payload: counters,
      processed: true,
    });

    // Stamp company_settings so the setup wizard reflects a real Aloware sync.
    try {
      const nowIso = new Date().toISOString();
      const { data: existing } = await supabase
        .from("company_settings")
        .select("id, first_sync_at, crm_connected_at")
        .eq("team_id", teamId)
        .maybeSingle();
      if (existing?.id) {
        await supabase.from("company_settings").update({
          crm_provider: "aloware",
          crm_connected_at: existing.crm_connected_at ?? nowIso,
          first_sync_at: existing.first_sync_at ?? nowIso,
        }).eq("id", existing.id);
      } else {
        await supabase.from("company_settings").insert({
          team_id: teamId,
          crm_provider: "aloware",
          crm_connected_at: nowIso,
          first_sync_at: nowIso,
        });
      }
    } catch (stampErr) {
      console.warn("sync-aloware-data could not stamp company_settings", stampErr);
    }

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
