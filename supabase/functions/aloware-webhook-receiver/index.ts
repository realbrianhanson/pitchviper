import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map Aloware dispositions to our disposition values
const DISPOSITION_MAP: Record<string, string> = {
  'Appointment Set': 'appointment_set',
  'Callback': 'callback_scheduled',
  'Not Interested': 'not_interested',
  'Deal Closed': 'deal_closed',
  'Left Voicemail': 'voicemail',
  'No Answer': 'no_answer',
  'Busy': 'busy',
  'Wrong Number': 'wrong_number',
  'DNC': 'dnc',
  'Qualified Lead': 'qualified',
  'Follow Up': 'follow_up',
};

// Map to our call outcome enum
const OUTCOME_MAP: Record<string, 'connected' | 'voicemail' | 'no_answer' | 'wrong_number'> = {
  'connected': 'connected',
  'answered': 'connected',
  'voicemail': 'voicemail',
  'no_answer': 'no_answer',
  'no-answer': 'no_answer',
  'busy': 'no_answer',
  'wrong_number': 'wrong_number',
  'wrong-number': 'wrong_number',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const payload = await req.json();
    console.log('Received Aloware webhook:', JSON.stringify(payload));

    // Log the raw webhook payload
    await supabase.from('aloware_sync_log').insert({
      event_type: payload.event_type || payload.type || 'unknown',
      payload: payload,
      processed: false,
    });

    // Determine event type
    const eventType = payload.event_type || payload.type || '';

    if (eventType === 'call_completed' || eventType === 'call.completed' || payload.call_id) {
      return await handleCallCompleted(supabase, payload);
    }

    if (eventType === 'transcription_saved' || eventType === 'transcription.saved' || payload.transcription) {
      return await handleTranscriptionSaved(supabase, payload);
    }

    // Unknown event type - log but accept
    console.log('Unknown event type:', eventType);
    return new Response(
      JSON.stringify({ success: true, message: 'Event received but not processed' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook processing error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Log the error
    await supabase.from('aloware_sync_log').insert({
      event_type: 'webhook_error',
      payload: { error: errorMessage },
      processed: false,
      error_message: errorMessage,
    });

    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleCallCompleted(supabase: any, payload: any) {
  try {
    // Extract call data from payload
    const callId = payload.call_id || payload.id;
    const alowareUserId = payload.user_id || payload.agent_id;
    const contact = payload.contact || {};
    const durationSeconds = payload.duration_seconds || payload.duration || 0;
    const direction = payload.direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound';
    const dispositionRaw = payload.disposition || payload.status || '';
    const recordingUrl = payload.recording_url || payload.recording || null;
    const timestamp = payload.timestamp || payload.created_at || new Date().toISOString();

    // Find the SalesFloor user by their Aloware user ID
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, team_id, full_name')
      .eq('aloware_user_id', String(alowareUserId))
      .single();

    if (profileError || !profile) {
      console.error('No user found for Aloware user ID:', alowareUserId);
      
      // Log the unmatched call
      await supabase.from('aloware_sync_log').insert({
        event_type: 'call_unmatched',
        payload: { callId, alowareUserId, reason: 'No matching user' },
        processed: false,
        error_message: 'No SalesFloor user found for Aloware user ID',
      });

      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Map disposition
    const disposition = DISPOSITION_MAP[dispositionRaw] || dispositionRaw.toLowerCase().replace(/\s+/g, '_') || null;
    
    // Map outcome
    const outcomeRaw = payload.outcome || payload.call_status || 'connected';
    const outcome = OUTCOME_MAP[outcomeRaw.toLowerCase()] || 'connected';

    // Check if call already exists
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id')
      .eq('aloware_call_id', String(callId))
      .single();

    let callRecord;

    if (existingCall) {
      // Update existing call
      const { data, error } = await supabase
        .from('calls')
        .update({
          duration_seconds: durationSeconds,
          disposition,
          outcome,
          aloware_recording_url: recordingUrl,
          is_synced_from_aloware: true,
        })
        .eq('id', existingCall.id)
        .select()
        .single();

      if (error) throw error;
      callRecord = data;
    } else {
      // Create new call record
      const { data, error } = await supabase
        .from('calls')
        .insert({
          user_id: profile.user_id,
          team_id: profile.team_id,
          contact_name: contact.name || 'Unknown',
          company_name: contact.company || null,
          phone_number: contact.phone_number || contact.phone || null,
          direction,
          outcome,
          disposition,
          duration_seconds: durationSeconds,
          aloware_call_id: String(callId),
          aloware_recording_url: recordingUrl,
          is_synced_from_aloware: true,
          created_at: timestamp,
        })
        .select()
        .single();

      if (error) throw error;
      callRecord = data;
    }

    // Update daily stats
    const activityType = direction === 'outbound' ? 'call_made' : 'call_received';
    await supabase.rpc('log_activity', {
      p_user_id: profile.user_id,
      p_activity_type: activityType,
      p_metadata: {
        call_id: callRecord.id,
        duration_minutes: Math.ceil(durationSeconds / 60),
        contact_name: contact.name,
        disposition,
        synced_from_aloware: true,
      },
    });

    // Handle special dispositions
    if (disposition === 'appointment_set') {
      // Create notification for appointment
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        type: 'followup_due',
        title: 'Appointment Scheduled',
        body: `Appointment set with ${contact.name || 'contact'}. Add it to your calendar!`,
        action_url: '/pipeline',
      });
    }

    if (disposition === 'deal_closed') {
      // Prompt user to log the deal
      await supabase.from('notifications').insert({
        user_id: profile.user_id,
        type: 'deal_closed',
        title: 'Log Your Deal! 🎉',
        body: `Great work closing ${contact.name || 'the deal'}! Don't forget to log it in your pipeline.`,
        action_url: '/pipeline',
      });
    }

    // Mark webhook as processed
    await supabase
      .from('aloware_sync_log')
      .update({ processed: true })
      .eq('payload->call_id', callId);

    console.log('Call synced successfully:', callRecord.id);

    return new Response(
      JSON.stringify({ success: true, callId: callRecord.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error handling call completed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Call processing failed: ${errorMessage}`);
  }
}

async function handleTranscriptionSaved(supabase: any, payload: any) {
  try {
    const callId = payload.call_id || payload.id;
    const transcription = payload.transcription || payload.transcript || '';

    if (!callId || !transcription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing call_id or transcription' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the call by Aloware call ID
    const { data: call, error: callError } = await supabase
      .from('calls')
      .select('id, user_id')
      .eq('aloware_call_id', String(callId))
      .single();

    if (callError || !call) {
      console.error('Call not found for transcription:', callId);
      return new Response(
        JSON.stringify({ success: false, error: 'Call not found' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Update call with transcription
    await supabase
      .from('calls')
      .update({ aloware_transcription: transcription })
      .eq('id', call.id);

    // Trigger AI analysis
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      await fetch(`${supabaseUrl}/functions/v1/process-aloware-transcription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ callId: call.id, transcription }),
      });
    } catch (analysisError) {
      console.error('Failed to trigger transcription analysis:', analysisError);
      // Don't fail the webhook for this
    }

    console.log('Transcription saved for call:', call.id);

    return new Response(
      JSON.stringify({ success: true, callId: call.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error handling transcription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Transcription processing failed: ${errorMessage}`);
  }
}
