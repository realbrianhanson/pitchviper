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

    const rl = await enforceRateLimit(_userData.user.id, 'generate-battlecard');
    if (!rl.allowed) return rl.response!;


    const { competitor_name, our_company_name } = await req.json();

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!PERPLEXITY_API_KEY) {
      throw new Error('Perplexity API key not configured');
    }

    if (!LOVABLE_API_KEY) {
      throw new Error('AI API key not configured');
    }

    if (!competitor_name) {
      throw new Error('Competitor name is required');
    }

    console.log('Generating battlecard for:', competitor_name);

    // Step 1: Use Perplexity to gather competitive intelligence
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a competitive intelligence analyst. Provide comprehensive, factual information with specific details.',
          },
          {
            role: 'user',
            content: `Research ${competitor_name} comprehensively:
1. What products and services do they offer? What is their pricing model?
2. What do customers praise about them? (from reviews, testimonials)
3. What do customers complain about? (from reviews, forums, complaints)
4. What are their recent news, changes, or challenges?
5. What is their market position and target customer?
Provide specific examples and be detailed.`,
          },
        ],
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('Perplexity API error:', perplexityResponse.status, errorText);
      throw new Error(`Perplexity research failed: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const researchContent = perplexityData.choices?.[0]?.message?.content || '';
    const citations = perplexityData.citations || [];

    console.log('Research gathered, processing into battlecard...');

    // Step 2: Use AI to structure the battlecard
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a sales enablement expert creating a competitive battlecard. Create actionable content that helps salespeople win against this competitor.`,
          },
          {
            role: 'user',
            content: `Based on this research about ${competitor_name}, create a sales battlecard:

RESEARCH:
${researchContent}

Create a battlecard with:
1. Competitor Overview (2-3 sentences)
2. Their Key Strengths (acknowledge these - don't dismiss)
3. Their Weaknesses (specific, citable issues)
4. Key Differentiators (how we can win)
5. Talk Track for "We're already using ${competitor_name}" objection
6. Trap Questions (questions to ask that expose their weaknesses)
7. Objection Responses (common objections when competing with them)`,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_battlecard',
              description: 'Generate a structured sales battlecard',
              parameters: {
                type: 'object',
                properties: {
                  competitor_name: { type: 'string' },
                  overview: { type: 'string' },
                  strengths: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        strength: { type: 'string' },
                        how_to_acknowledge: { type: 'string' },
                      },
                    },
                  },
                  weaknesses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        weakness: { type: 'string' },
                        evidence: { type: 'string' },
                      },
                    },
                  },
                  differentiators: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        area: { type: 'string' },
                        our_advantage: { type: 'string' },
                      },
                    },
                  },
                  switching_talk_track: { type: 'string' },
                  trap_questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        question: { type: 'string' },
                        why_it_works: { type: 'string' },
                      },
                    },
                  },
                  objection_responses: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        objection: { type: 'string' },
                        response: { type: 'string' },
                      },
                    },
                  },
                },
                required: ['competitor_name', 'overview', 'strengths', 'weaknesses', 'differentiators', 'switching_talk_track', 'trap_questions', 'objection_responses'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'generate_battlecard' } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI processing failed: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error('Failed to generate battlecard');
    }

    const battlecard = JSON.parse(toolCall.function.arguments);
    battlecard.citations = citations;
    battlecard.generated_at = new Date().toISOString();

    console.log('Battlecard generated successfully');

    return new Response(
      JSON.stringify({
        success: true,
        battlecard,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating battlecard:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
