import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type NotificationType =
  | 'badge_earned'
  | 'level_up'
  | 'streak_milestone'
  | 'deal_closed'
  | 'sos_alert'
  | 'mentioned'
  | 'coaching_notes'
  | 'training_assigned'
  | 'roleplay_feedback'
  | 'followup_due'
  | 'challenge_reminder'
  | 'deal_cold'
  | 'competition_starting'
  | 'competition_ending'
  | 'leaderboard_overtaken'
  | 'leaderboard_leading';

interface CreateNotificationRequest {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth: service role (server-to-server) OR signed-in user creating notification for self
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === supabaseServiceKey;
    let authedUserId: string | null = null;
    if (!isServiceRole) {
      const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
      const { data: userData, error: userErr } = await authClient.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      authedUserId = userData.user.id;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, type, title, body, action_url }: CreateNotificationRequest = await req.json();

    if (!user_id || !type || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, type, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isServiceRole && user_id !== authedUserId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check user notification preferences
    const { data: prefs } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", user_id)
      .eq("notification_type", type)
      .maybeSingle();

    // Default to enabled if no preference exists
    const inAppEnabled = prefs?.in_app_enabled ?? true;
    const emailEnabled = prefs?.email_enabled ?? false;

    // Only create notification if in-app notifications are enabled
    if (!inAppEnabled) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          skipped: true, 
          reason: "In-app notifications disabled for this type" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the notification
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        title,
        body,
        action_url,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // TODO: If emailEnabled, queue email notification

    return new Response(
      JSON.stringify({
        success: true,
        notification,
        emailQueued: emailEnabled,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error creating notification:", error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
