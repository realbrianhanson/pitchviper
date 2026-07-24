import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Auth
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rl = await enforceRateLimit(userData.user.id, 'generate-achievement-image');
    if (!rl.allowed) return rl.response!;


    const { badge_name, badge_icon, badge_rarity, user_name, achievement_date } = await req.json();

    const prompt = `Create a sleek achievement card image for a sales training app called "PitchViper". 
Dark background (#0a0a0f) with electric cyan (#00f0ff) accents.
Center the image on a glowing badge/trophy icon representing "${badge_name}".
The badge should have a ${badge_rarity} rarity glow effect (${
      badge_rarity === 'legendary' ? 'golden radiant glow' :
      badge_rarity === 'epic' ? 'purple mystical glow' :
      badge_rarity === 'rare' ? 'blue shimmer' :
      badge_rarity === 'uncommon' ? 'green subtle glow' : 'silver metallic shine'
    }).
Include subtle geometric patterns and light rays emanating from the badge.
Text overlay: "ACHIEVEMENT UNLOCKED" at top in bold, "${badge_name}" as main title.
"Earned by ${user_name}" and "${achievement_date}" at bottom.
Modern, premium, gaming-inspired aesthetic. 16:9 aspect ratio for social sharing.
Ultra high resolution.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [{
          role: 'user',
          content: prompt
        }],
        modalities: ['image', 'text']
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    return new Response(JSON.stringify({ 
      success: true,
      image_url: imageUrl,
      message: 'Achievement image generated successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("internal_error");
    // error scrubbed
    return new Response(JSON.stringify({ 
      success: false,
      error: "internal_error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});