import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { requireTeamEntitlement } from "../_shared/entitlement.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Voice IDs for different persona types
const PERSONA_VOICES: Record<string, string> = {
  // Skeptical/Authority voices - authoritative male
  'authority': 'JBFqnCBsd6RMkjVDRZzb', // George
  'trust': 'nPczCjzI2devNBz1zQrb', // Brian
  
  // Price-conscious - professional female
  'price': 'EXAVITQu4vr4xnSDxMaL', // Sarah
  
  // Timing/Stall - casual uncertain
  'timing': 'IKne3meq5aSn9XLyUdCD', // Charlie
  'stall': 'TX3LPaxmHKxFdv7VOQHJ', // Liam
  
  // Competition - confident
  'competition': 'onwK4e9ZLuTAKqWW03F9', // Daniel
  
  // Need - thoughtful
  'need': 'pFZP5JQG7iQjIQuC4Bku', // Lily
  
  // Default
  'default': 'JBFqnCBsd6RMkjVDRZzb', // George
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') { return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const _token = authHeader.replace('Bearer ', '');
    const _authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${_token}` } } }
    );
    const { data: _userData, error: _userErr } = await _authClient.auth.getUser();
    if (_userErr || !_userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rl = await enforceRateLimit(_userData.user.id, 'generate-objection-speech');
    if (!rl.allowed) return rl.response!;

    const { text, persona_type, category } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    if (!text) {
      throw new Error('Text is required');
    }

    // Select voice based on category or persona type
    const voiceId = PERSONA_VOICES[category] || PERSONA_VOICES[persona_type] || PERSONA_VOICES['default'];

    console.log(`Generating speech for category: ${category}, using voice: ${voiceId}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error("provider_error", { status: response.status });
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
      },
    });
  } catch (error) {
    console.error("internal_error");
    return new Response(
      JSON.stringify({ error: "internal_error" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
