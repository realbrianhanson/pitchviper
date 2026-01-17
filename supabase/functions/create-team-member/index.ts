import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the requesting user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !requestingUser) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is a manager
    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (userRole?.role !== "manager") {
      return new Response(
        JSON.stringify({ success: false, error: "Only managers can create team members" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get manager's team
    const { data: managerProfile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("user_id", requestingUser.id)
      .single();

    if (!managerProfile?.team_id) {
      return new Response(
        JSON.stringify({ success: false, error: "You must be part of a team" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, fullName, alowareUserId } = body;

      if (!email || !password || !fullName) {
        return new Response(
          JSON.stringify({ success: false, error: "Email, password, and full name are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create the user using admin API
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: { full_name: fullName }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        return new Response(
          JSON.stringify({ success: false, error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create profile for the new user
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: newUser.user.id,
        full_name: fullName,
        team_id: managerProfile.team_id,
        aloware_user_id: alowareUserId || null,
      });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Try to clean up the user if profile creation fails
        await supabase.auth.admin.deleteUser(newUser.user.id);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create user profile" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create user role (default to rep)
      await supabase.from("user_roles").insert({
        user_id: newUser.user.id,
        role: "rep",
      });

      console.log(`Created team member: ${email} (${fullName})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Successfully created account for ${fullName}`,
          user: {
            id: newUser.user.id,
            email: newUser.user.email,
            fullName,
          }
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list") {
      // Get all team members
      const { data: teamMembers, error } = await supabase
        .from("profiles")
        .select(`
          id,
          user_id,
          full_name,
          aloware_user_id,
          created_at,
          title
        `)
        .eq("team_id", managerProfile.team_id);

      if (error) {
        return new Response(
          JSON.stringify({ success: false, error: "Failed to fetch team members" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, members: teamMembers }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get-aloware-users") {
      // Get Aloware users for dropdown
      const alowareToken = Deno.env.get("ALOWARE_API_TOKEN");
      if (!alowareToken) {
        return new Response(
          JSON.stringify({ success: true, users: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const alowareUrl = new URL("https://app.aloware.com/api/v1/webhook/users");
      alowareUrl.searchParams.append("api_token", alowareToken);

      const response = await fetch(alowareUrl.toString(), {
        headers: { Accept: "application/json" }
      });

      const text = await response.text();
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        return new Response(
          JSON.stringify({ success: true, users: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        const data = JSON.parse(text);
        return new Response(
          JSON.stringify({ success: true, users: data.data || data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch {
        return new Response(
          JSON.stringify({ success: true, users: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ success: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-team-member:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
