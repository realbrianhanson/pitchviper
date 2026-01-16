import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { objection_text, user_response, category, difficulty } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('API key not configured');
    }

    if (!objection_text || !user_response) {
      throw new Error('Objection text and user response are required');
    }

    const systemPrompt = `You are a sales training AI that evaluates responses to prospect objections.
    
You must evaluate how well the sales rep handled the objection and provide:
1. A score from 0-100
2. Brief feedback (2-3 sentences)
3. A suggested better response if score is below 80

Consider these criteria:
- Acknowledged the prospect's concern
- Didn't get defensive
- Asked clarifying questions or redirected
- Provided value or addressed the root concern
- Maintained rapport and professional tone

The objection category is: ${category}
The difficulty level is: ${difficulty}`;

    const userPrompt = `Prospect objection: "${objection_text}"

Rep's response: "${user_response}"

Evaluate this response and return JSON with: score (0-100), feedback (string), suggestedResponse (string or null if score >= 80)`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'evaluate_response',
              description: 'Evaluate the sales rep response to an objection',
              parameters: {
                type: 'object',
                properties: {
                  score: {
                    type: 'number',
                    description: 'Score from 0-100',
                  },
                  feedback: {
                    type: 'string',
                    description: 'Brief feedback about the response',
                  },
                  suggestedResponse: {
                    type: 'string',
                    description: 'A better response if score is below 80, null otherwise',
                  },
                },
                required: ['score', 'feedback'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'evaluate_response' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No evaluation returned from AI');
    }

    const evaluation = JSON.parse(toolCall.function.arguments);
    
    return new Response(
      JSON.stringify(evaluation),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error scoring response:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
