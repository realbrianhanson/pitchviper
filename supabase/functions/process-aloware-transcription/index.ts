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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { callId, transcription } = await req.json();

    if (!callId || !transcription) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing callId or transcription' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing transcription for call:', callId);

    // Use Lovable AI to analyze the transcription
    const analysisPrompt = `Analyze this sales call transcription and provide a structured analysis.

TRANSCRIPTION:
${transcription}

Provide your analysis in the following JSON format:
{
  "overall_score": <number 1-100>,
  "talk_to_listen_ratio": "<estimated percentage of rep talking vs listening>",
  "objections_detected": [
    {
      "objection": "<the objection raised>",
      "category": "<price|timing|competition|authority|need|trust|stall>",
      "handled_well": <true|false>,
      "response_used": "<brief description of how it was handled>"
    }
  ],
  "questions_asked": {
    "discovery_questions": <count>,
    "closing_questions": <count>,
    "quality": "<weak|average|strong>"
  },
  "buying_signals": [
    "<list of positive buying signals detected>"
  ],
  "red_flags": [
    "<list of concerning moments or missed opportunities>"
  ],
  "coaching_moments": [
    {
      "moment": "<description of what happened>",
      "recommendation": "<coaching suggestion>"
    }
  ],
  "summary": "<2-3 sentence summary of the call quality and key takeaways>"
}

Be specific and actionable in your feedback.`;

    let analysis = null;

    if (lovableApiKey) {
      try {
        const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${lovableApiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-5-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert sales coach analyzing call transcriptions. Provide structured, actionable feedback in JSON format.',
              },
              {
                role: 'user',
                content: analysisPrompt,
              },
            ],
            temperature: 0.3,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const content = result.choices?.[0]?.message?.content || '';
          
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              analysis = JSON.parse(jsonMatch[0]);
            } catch (parseError) {
              console.error('Failed to parse AI response:', parseError);
            }
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError);
      }
    }

    // If AI analysis failed, create a basic analysis
    if (!analysis) {
      analysis = {
        overall_score: 50,
        talk_to_listen_ratio: "Unknown",
        objections_detected: [],
        questions_asked: {
          discovery_questions: 0,
          closing_questions: 0,
          quality: "unknown"
        },
        buying_signals: [],
        red_flags: [],
        coaching_moments: [],
        summary: "Transcription received but automated analysis unavailable."
      };
    }

    // Extract objections for the call record
    const objections = analysis.objections_detected?.map((o: any) => o.objection) || [];

    // Update the call record with analysis
    const { error: updateError } = await supabase
      .from('calls')
      .update({
        self_rating: analysis.overall_score,
        struggled_objections: objections,
        improvement_notes: JSON.stringify({
          analysis_timestamp: new Date().toISOString(),
          talk_to_listen_ratio: analysis.talk_to_listen_ratio,
          questions_asked: analysis.questions_asked,
          buying_signals: analysis.buying_signals,
          red_flags: analysis.red_flags,
          coaching_moments: analysis.coaching_moments,
          summary: analysis.summary,
        }),
      })
      .eq('id', callId);

    if (updateError) {
      console.error('Error updating call with analysis:', updateError);
      throw updateError;
    }

    // Log the analysis
    await supabase.from('aloware_sync_log').insert({
      event_type: 'transcription_analyzed',
      payload: {
        callId,
        score: analysis.overall_score,
        objectionsCount: objections.length,
        buyingSignalsCount: analysis.buying_signals?.length || 0,
      },
      processed: true,
    });

    console.log('Transcription analysis complete for call:', callId);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: {
          score: analysis.overall_score,
          summary: analysis.summary,
          objectionsCount: objections.length,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error processing transcription:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
